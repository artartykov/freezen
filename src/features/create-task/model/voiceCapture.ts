import { create } from 'zustand';
import {
  parseAiTasks,
  pollSpeech,
  startSpeech,
  stopSpeech,
} from '@shared/platform';
import { todayIso } from '@shared/lib';
import { addTask, changeData, getData } from '@shared/storage';
import type { Task } from '@shared/storage';
import { draftTasks, fallbackTasks } from './voiceDrafts';

type Phase = 'closed' | 'listening' | 'finishing' | 'review';

type CaptureState = {
  phase: Phase;
  text: string;
  level: number;
  tasks: Task[];
  failed: boolean;
  error: string | null;
};

const closed: CaptureState = {
  phase: 'closed',
  text: '',
  level: 0,
  tasks: [],
  failed: false,
  error: null,
};

const pollMillis = 200;
const parseDelayMillis = 700;

export const useCapture = create<CaptureState>(() => closed);

let session = 0;
let parsedText = '';
let parseTimer: ReturnType<typeof setTimeout> | undefined;
let latest = 0;
let inFlight: Promise<void> = Promise.resolve();

function update(fields: Partial<CaptureState>) {
  useCapture.setState(fields);
}

function parse(id: number) {
  const text = useCapture.getState().text;
  if (id !== session || text === '' || text === parsedText) return inFlight;
  parsedText = text;
  latest += 1;
  const request = latest;
  const model = getData().settings.ai.postProcessingModel ?? '';
  const current = () => id === session && request === latest;
  inFlight = parseAiTasks(model, text, todayIso()).then(
    (parsed) => {
      if (current()) update({ tasks: draftTasks(parsed), failed: false });
    },
    () => {
      if (current()) update({ tasks: fallbackTasks(text), failed: true });
    },
  );
  return inFlight;
}

function scheduleParse(id: number) {
  if (parseTimer !== undefined) return;
  parseTimer = setTimeout(() => {
    parseTimer = undefined;
    void parse(id);
  }, parseDelayMillis);
}

function cancelParse() {
  clearTimeout(parseTimer);
  parseTimer = undefined;
}

async function follow(id: number) {
  while (id === session) {
    await new Promise((resolve) => setTimeout(resolve, pollMillis));
    if (id !== session) return;
    let speech;
    try {
      speech = await pollSpeech();
    } catch (error) {
      update({ phase: 'review', error: String(error) });
      return;
    }
    const changed = speech.text !== useCapture.getState().text;
    update({ text: speech.text, level: speech.level, error: speech.error });
    if (changed) scheduleParse(id);
    if (!speech.active) {
      cancelParse();
      update({ phase: 'finishing', level: 0 });
      await parse(id);
      if (id === session) update({ phase: 'review' });
      return;
    }
  }
}

export async function openCapture(locale: string) {
  session += 1;
  const id = session;
  cancelParse();
  parsedText = '';
  update({ ...closed, phase: 'listening' });
  try {
    await startSpeech(locale === 'ru' ? 'ru-RU' : 'en-US');
  } catch (error) {
    update({ phase: 'review', error: String(error) });
    return;
  }
  void follow(id);
}

export async function stopCapture() {
  try {
    await stopSpeech();
  } catch (error) {
    update({ error: String(error) });
  }
}

export function closeCapture() {
  session += 1;
  cancelParse();
  void stopCapture();
  useCapture.setState(closed);
}

export function removeDraft(id: string) {
  update({
    tasks: useCapture.getState().tasks.filter((task) => task.id !== id),
  });
}

export function saveCapture() {
  const { tasks } = useCapture.getState();
  changeData((data) => tasks.reduce(addTask, data));
  closeCapture();
}
