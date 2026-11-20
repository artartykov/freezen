import { invoke, isTauri } from '@tauri-apps/api/core';

export type AiTaskState = 'inbox' | 'waiting' | 'someday';

export type TaskEvent =
  | {
      op: 'add';
      id: number;
      title: string;
      state: AiTaskState;
      due: string | null;
    }
  | {
      op: 'update';
      id: number;
      title?: string;
      state?: AiTaskState;
      due?: string | null;
    }
  | { op: 'remove'; id: number };

export type SpeechState = {
  final: string;
  level: number;
  active: boolean;
  error: string | null;
  events?: TaskEvent[];
  trace?: string[];
};

const simulatedKey = 'valid-key';
const simulatedLatency = 600;
const simulatedSpeech =
  'Call Ivan tomorrow and buy milk and send the report on Wednesday';
const simulatedConnector = ' and ';
const simulatedWordsPerSecond = 3;

const simulated = {
  startedAt: 0,
  spokenBefore: 0,
  listening: false,
  emitted: 0,
};

function respond<T>(value: T) {
  return new Promise<T>((resolve) =>
    setTimeout(() => resolve(value), simulatedLatency),
  );
}

export async function testAiProvider(key: string | undefined) {
  const typed = key?.trim() || undefined;
  if (!isTauri()) {
    await respond(null);
    if (typed !== undefined && typed !== simulatedKey) {
      throw new Error('Invalid key');
    }
    return;
  }
  await invoke('test_ai_provider', { key: typed });
  if (typed !== undefined) await invoke('save_ai_key', { key: typed });
}

export async function testAiVoice(language: string) {
  if (isTauri()) return invoke<void>('test_ai_voice', { language });
  await respond(null);
}

export async function dialogStart(today: string, calendar: string) {
  if (isTauri()) return invoke<void>('dialog_start', { today, calendar });
  Object.assign(simulated, {
    startedAt: 0,
    spokenBefore: 0,
    listening: false,
    emitted: 0,
  });
}

export async function liveUserRemoved(id: number) {
  if (isTauri()) await invoke<void>('live_user_removed', { id });
}

export async function startSpeech(language: string) {
  if (isTauri()) return invoke<void>('start_speech', { language });
  simulated.startedAt = Date.now();
  simulated.listening = true;
}

function simulatedSpoken() {
  const words = simulatedSpeech.split(' ');
  const running = simulated.listening
    ? ((Date.now() - simulated.startedAt) / 1000) * simulatedWordsPerSecond
    : 0;
  return Math.min(words.length, Math.floor(simulated.spokenBefore + running));
}

export async function pollSpeech(): Promise<SpeechState> {
  if (isTauri()) return invoke<SpeechState>('poll_speech');
  const words = simulatedSpeech.split(' ');
  const spoken = simulatedSpoken();
  const text = words.slice(0, spoken).join(' ');
  const parts = text.split(simulatedConnector);
  const complete =
    spoken === words.length || !simulated.listening
      ? parts.filter(Boolean).length
      : parts.length - 1;
  const events: TaskEvent[] = parts
    .slice(simulated.emitted, complete)
    .map((title, index) => ({
      op: 'add',
      id: simulated.emitted + index + 1,
      title,
      state: 'inbox',
      due: null,
    }));
  simulated.emitted = Math.max(simulated.emitted, complete);
  return {
    final: text,
    level: simulated.listening ? Math.abs(Math.sin(Date.now() / 150)) : 0,
    active: simulated.listening,
    error: null,
    events,
  };
}

export async function stopSpeech() {
  if (isTauri()) return invoke<void>('stop_speech');
  simulated.spokenBefore = simulatedSpoken();
  simulated.listening = false;
}

export async function cancelSpeech() {
  if (isTauri()) return invoke<void>('cancel_speech');
  simulated.listening = false;
}
