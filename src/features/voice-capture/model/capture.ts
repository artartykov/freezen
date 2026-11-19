import { create } from 'zustand';
import {
  dialogStart,
  dialogTurn,
  pollSpeech,
  startSpeech,
  cancelSpeech,
  stopSpeech,
  warmAi,
} from '@shared/platform';
import type { DialogInput, TaskEvent } from '@shared/platform';
import { todayIso } from '@shared/lib';
import { addTask, changeData, getData } from '@shared/storage';
import type { Task } from '@shared/storage';
import { calendarText, todayLabel } from './calendar';
import { wordsOf } from './feed';
import { applyTaskEvents, dialogIdOf, fallbackTasks } from './tasks';
import type { DraftIds } from './tasks';

type Phase = 'closed' | 'listening' | 'paused';

type CaptureState = {
  phase: Phase;
  text: string;
  levels: number[];
  tasks: Task[];
  failed: boolean;
  error: string | null;
};

type Runtime = {
  language: string;
  listen: number;
  fed: number;
  ids: DraftIds;
  busy: number;
  tail: Promise<void>;
  failedAt: number;
  pauseSent: boolean;
};

const closed: CaptureState = {
  phase: 'closed',
  text: '',
  levels: [],
  tasks: [],
  failed: false,
  error: null,
};

const pollMillis = 100;
const historyLength = 64;
const retryMillis = 3000;

export const useCapture = create<CaptureState>(() => closed);

let runtime: Runtime | null = null;

function update(fields: Partial<CaptureState>) {
  useCapture.setState(fields);
}

function alive(rt: Runtime) {
  return rt === runtime;
}

function apply(rt: Runtime, event: TaskEvent) {
  if (!alive(rt)) return;
  const drafts = applyTaskEvents(
    { tasks: useCapture.getState().tasks, ids: rt.ids },
    [event],
  );
  rt.ids = drafts.ids;
  update({ tasks: drafts.tasks });
}

function send(rt: Runtime, input: DialogInput) {
  rt.busy += 1;
  const result = rt.tail.then(async () => {
    try {
      await dialogTurn(input, (event) => apply(rt, event));
      if (alive(rt)) update({ failed: false, error: null });
      return true;
    } catch (error) {
      rt.failedAt = Date.now();
      if (alive(rt)) update({ failed: true, error: String(error) });
      return false;
    }
  });
  rt.tail = result.then(() => {
    rt.busy -= 1;
  });
  return result;
}

async function feed(rt: Runtime, text: string, force = false) {
  const words = wordsOf(text);
  const upTo = words.length;
  if (upTo <= rt.fed) return;
  if (!force && (rt.busy > 0 || Date.now() - rt.failedAt < retryMillis)) return;
  const previous = rt.fed;
  rt.fed = upTo;
  const ok = await send(rt, {
    kind: 'words',
    text: words.slice(previous, upTo).join(' '),
  });
  if (!ok) rt.fed = previous;
}

async function follow(rt: Runtime, listen: number, base: string) {
  const current = () => alive(rt) && rt.listen === listen;
  while (current()) {
    await new Promise((resolve) => setTimeout(resolve, pollMillis));
    if (!current()) return;
    let speech;
    try {
      speech = await pollSpeech();
    } catch (error) {
      if (current()) update({ phase: 'paused', error: String(error) });
      return;
    }
    if (!current()) return;
    const text = [base, speech.final, speech.partial].filter(Boolean).join(' ');
    update({
      text,
      levels: [...useCapture.getState().levels, speech.level].slice(
        -historyLength,
      ),
      ...(speech.error ? { error: speech.error } : {}),
    });
    if (!speech.active) {
      if (useCapture.getState().phase === 'listening') {
        update({ phase: 'paused' });
      }
      void feed(rt, text, true);
      void send(rt, { kind: 'pause' });
      rt.pauseSent = true;
      return;
    }
    void feed(rt, text);
  }
}

async function begin(rt: Runtime, base: string) {
  rt.listen += 1;
  const listen = rt.listen;
  update({ phase: 'listening', error: null });
  try {
    await startSpeech(rt.language);
  } catch (error) {
    if (alive(rt)) update({ phase: 'paused', error: String(error) });
    return;
  }
  void follow(rt, listen, base);
}

export async function openCapture(locale: string) {
  const rt: Runtime = {
    language: locale === 'ru' ? 'ru-RU' : 'en-US',
    listen: 0,
    fed: 0,
    ids: {},
    busy: 0,
    tail: Promise.resolve(),
    failedAt: 0,
    pauseSent: false,
  };
  runtime = rt;
  update({ ...closed, phase: 'listening' });
  void warmAi().catch(() => undefined);
  const today = todayIso();
  try {
    await dialogStart(
      getData().settings.ai.postProcessingModel ?? '',
      todayLabel(today),
      calendarText(today),
    );
  } catch (error) {
    if (alive(rt)) update({ phase: 'paused', error: String(error) });
    return;
  }
  await begin(rt, '');
}

export async function resumeCapture() {
  const rt = runtime;
  if (!rt) return;
  if (rt.pauseSent) {
    rt.pauseSent = false;
    void send(rt, { kind: 'resume' });
  }
  await begin(rt, useCapture.getState().text);
}

async function stopListening() {
  try {
    await stopSpeech();
  } catch (error) {
    update({ error: String(error) });
  }
}

export async function pauseCapture() {
  if (useCapture.getState().phase === 'listening') update({ phase: 'paused' });
  await stopListening();
}

export function closeCapture() {
  runtime = null;
  void cancelSpeech().catch(() => undefined);
  useCapture.setState(closed);
}

export function removeDraft(id: string) {
  const rt = runtime;
  const dialogId = rt ? dialogIdOf(rt.ids, id) : null;
  update({
    tasks: useCapture.getState().tasks.filter((task) => task.id !== id),
  });
  if (rt && dialogId !== null)
    void send(rt, { kind: 'user_removed', id: dialogId });
}

export function saveCapture() {
  const { tasks: drafted, failed, text } = useCapture.getState();
  const tasks = drafted.length === 0 && failed ? fallbackTasks(text) : drafted;
  changeData((data) => tasks.reduce(addTask, data));
  closeCapture();
}
