import { create } from 'zustand';
import {
  dialogStart,
  dialogTurn,
  pollSpeech,
  startSpeech,
  stopSpeech,
  warmAi,
} from '@shared/platform';
import type { DialogInput } from '@shared/platform';
import { todayIso } from '@shared/lib';
import { addTask, changeData, getData } from '@shared/storage';
import type { Task } from '@shared/storage';
import { calendarText, todayLabel } from './calendar';
import { feedableUpTo, lastWords, wordsOf } from './feed';
import { applyTaskEvents, dialogIdOf, fallbackTasks } from './tasks';
import type { DraftIds } from './tasks';

type Phase = 'closed' | 'listening' | 'finishing' | 'paused';

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
  following: Promise<void>;
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
const saveWaitMillis = 8000;
const retryMillis = 3000;
const silenceMillis = 600;

export const useCapture = create<CaptureState>(() => closed);

let runtime: Runtime | null = null;

function update(fields: Partial<CaptureState>) {
  useCapture.setState(fields);
}

function alive(rt: Runtime) {
  return rt === runtime;
}

function send(rt: Runtime, input: DialogInput) {
  rt.busy += 1;
  const result = rt.tail.then(async () => {
    try {
      const events = await dialogTurn(input);
      if (alive(rt)) {
        const drafts = applyTaskEvents(
          { tasks: useCapture.getState().tasks, ids: rt.ids },
          events,
        );
        rt.ids = drafts.ids;
        update({ tasks: drafts.tasks, failed: false, error: null });
      }
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

async function feed(
  rt: Runtime,
  stableText: string,
  text: string,
  settled: boolean,
  force = false,
) {
  const words = wordsOf(text);
  const upTo = feedableUpTo({
    stable: wordsOf(stableText).length,
    total: words.length,
    fed: rt.fed,
    settled: settled || force,
  });
  if (upTo === rt.fed) return;
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
  let heard = base;
  let changedAt = Date.now();
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
    const stableText = [base, speech.final].filter(Boolean).join(' ');
    const text = [stableText, speech.partial].filter(Boolean).join(' ');
    if (text !== heard) {
      heard = text;
      changedAt = Date.now();
    }
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
      void feed(rt, stableText, text, true, true);
      void send(rt, { kind: 'pause' });
      rt.pauseSent = true;
      return;
    }
    void feed(rt, stableText, text, Date.now() - changedAt >= silenceMillis);
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
  rt.following = follow(rt, listen, base);
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
    following: Promise.resolve(),
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
  void stopSpeech().catch(() => undefined);
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

function settle(rt: Runtime) {
  return Promise.race([
    rt.following,
    new Promise<void>((resolve) => setTimeout(resolve, saveWaitMillis)),
  ]);
}

export async function saveCapture() {
  const rt = runtime;
  if (!rt) return;
  update({ phase: 'finishing' });
  await stopListening();
  await settle(rt);
  await send(rt, {
    kind: 'end',
    last_words: lastWords(useCapture.getState().text),
  });
  await send(rt, { kind: 'check' });
  const { tasks: drafted, failed, text } = useCapture.getState();
  const tasks = drafted.length === 0 && failed ? fallbackTasks(text) : drafted;
  changeData((data) => tasks.reduce(addTask, data));
  closeCapture();
}
