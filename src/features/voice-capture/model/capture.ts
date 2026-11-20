import { create } from 'zustand';
import {
  cancelSpeech,
  dialogStart,
  liveUserRemoved,
  pollSpeech,
  startSpeech,
  stopSpeech,
} from '@shared/platform';
import type { TaskEvent } from '@shared/platform';
import { todayIso } from '@shared/lib';
import { addTask, changeData } from '@shared/storage';
import type { Task } from '@shared/storage';
import { calendarText, todayLabel } from './calendar';
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
  trace: string[];
};

type Runtime = {
  language: string;
  ids: DraftIds;
  starting: boolean;
  following: boolean;
};

const closed: CaptureState = {
  phase: 'closed',
  text: '',
  levels: [],
  tasks: [],
  failed: false,
  error: null,
  trace: [],
};

const pollMillis = 100;
const historyLength = 64;

export const useCapture = create<CaptureState>(() => closed);

let runtime: Runtime | null = null;

function update(fields: Partial<CaptureState>) {
  useCapture.setState(fields);
}

function alive(rt: Runtime) {
  return rt === runtime;
}

function apply(rt: Runtime, events: TaskEvent[]) {
  if (events.length === 0) return;
  const drafts = applyTaskEvents(
    { tasks: useCapture.getState().tasks, ids: rt.ids },
    events,
  );
  rt.ids = drafts.ids;
  update({ tasks: drafts.tasks });
}

async function follow(rt: Runtime) {
  while (alive(rt)) {
    await new Promise((resolve) => setTimeout(resolve, pollMillis));
    if (!alive(rt) || rt.starting) continue;
    let speech;
    try {
      speech = await pollSpeech();
    } catch (error) {
      if (alive(rt)) update({ phase: 'paused', error: String(error) });
      rt.following = false;
      return;
    }
    if (!alive(rt)) return;
    apply(rt, speech.events ?? []);
    const state = useCapture.getState();
    const stopped =
      !speech.active && state.phase === 'listening' && !rt.starting;
    update({
      text: speech.final,
      levels: [...state.levels, speech.level].slice(-historyLength),
      trace: speech.trace ?? [],
      ...(speech.error ? { error: speech.error, failed: true } : {}),
      ...(stopped ? { phase: 'paused' as const } : {}),
    });
  }
}

async function begin(rt: Runtime) {
  rt.starting = true;
  update({ phase: 'listening', error: null });
  try {
    await startSpeech(rt.language);
  } catch (error) {
    if (alive(rt)) update({ phase: 'paused', error: String(error) });
    return;
  } finally {
    rt.starting = false;
  }
  if (!rt.following) {
    rt.following = true;
    void follow(rt);
  }
}

export async function openCapture(locale: string) {
  const rt: Runtime = {
    language: locale === 'ru' ? 'ru-RU' : 'en-US',
    ids: {},
    starting: false,
    following: false,
  };
  runtime = rt;
  update({ ...closed, phase: 'listening' });
  const today = todayIso();
  try {
    await dialogStart(todayLabel(today), calendarText(today));
  } catch (error) {
    if (alive(rt)) update({ phase: 'paused', error: String(error) });
    return;
  }
  await begin(rt);
}

export async function resumeCapture() {
  const rt = runtime;
  if (rt) await begin(rt);
}

export async function pauseCapture() {
  if (useCapture.getState().phase === 'listening') update({ phase: 'paused' });
  try {
    await stopSpeech();
  } catch (error) {
    update({ error: String(error) });
  }
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
  if (dialogId === null) return;
  void liveUserRemoved(dialogId).catch((error: unknown) =>
    update({ error: String(error) }),
  );
}

export function saveCapture() {
  const { tasks: drafted, failed, text } = useCapture.getState();
  const tasks = drafted.length === 0 && failed ? fallbackTasks(text) : drafted;
  changeData((data) => tasks.reduce(addTask, data));
  closeCapture();
}
