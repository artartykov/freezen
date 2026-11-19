import { Channel, invoke, isTauri } from '@tauri-apps/api/core';

export type AiTaskState = 'next' | 'waiting' | 'someday' | 'inbox';

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

export type DialogInput =
  | { kind: 'words'; text: string }
  | { kind: 'pause' }
  | { kind: 'resume' }
  | { kind: 'user_removed'; id: number };

export type SpeechState = {
  final: string;
  partial: string;
  level: number;
  active: boolean;
  error: string | null;
};

const simulatedKey = 'valid-key';
const simulatedLatency = 600;
const simulatedSpeech =
  'Call Ivan tomorrow and buy milk and send the report on Wednesday';
const simulatedWordsPerSecond = 3;

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

export async function testAiVoice() {
  if (isTauri()) return invoke<void>('test_ai_voice');
  await respond(null);
}

export async function testAiPostProcessing(model: string) {
  if (isTauri()) return invoke<void>('test_ai_post_processing', { model });
  await respond(null);
}

const simulatedConnector = /\s+(?:and|и|потом|then)\s+/i;

const simulatedDialog = { pending: '', nextId: 1 };

function simulatedAdd(title: string): TaskEvent {
  const id = simulatedDialog.nextId;
  simulatedDialog.nextId += 1;
  return { op: 'add', id, title, state: 'next', due: null };
}

function simulatedTurn(input: DialogInput): TaskEvent[] {
  if (input.kind === 'words') {
    const parts = `${simulatedDialog.pending} ${input.text}`
      .trim()
      .split(simulatedConnector);
    simulatedDialog.pending = parts.pop() ?? '';
    return parts.map(simulatedAdd);
  }
  if (input.kind === 'pause') {
    const title = simulatedDialog.pending.trim();
    simulatedDialog.pending = '';
    return title ? [simulatedAdd(title)] : [];
  }
  return [];
}

export async function dialogStart(
  model: string,
  today: string,
  calendar: string,
) {
  if (isTauri())
    return invoke<void>('dialog_start', { model, today, calendar });
  simulatedDialog.pending = '';
  simulatedDialog.nextId = 1;
}

export async function dialogTurn(
  input: DialogInput,
  onEvent: (event: TaskEvent) => void,
) {
  if (isTauri()) {
    const channel = new Channel<TaskEvent>();
    channel.onmessage = onEvent;
    await invoke<void>('dialog_turn', { input, onEvent: channel });
    return;
  }
  const events = await respond(simulatedTurn(input));
  events.forEach(onEvent);
}

export async function warmAi() {
  if (isTauri()) await invoke<void>('warm_ai');
}

let simulatedStart = 0;
let simulatedStopped = false;

export async function startSpeech(language: string) {
  if (isTauri()) return invoke<void>('start_speech', { language });
  simulatedStart = Date.now();
  simulatedStopped = false;
}

export async function pollSpeech(): Promise<SpeechState> {
  if (isTauri()) return invoke<SpeechState>('poll_speech');
  const words = simulatedSpeech.split(' ');
  const spoken = Math.min(
    words.length,
    Math.floor(
      ((Date.now() - simulatedStart) / 1000) * simulatedWordsPerSecond,
    ),
  );
  return {
    final: '',
    partial: words.slice(0, spoken).join(' '),
    level: simulatedStopped ? 0 : Math.abs(Math.sin(Date.now() / 150)),
    active: !simulatedStopped && spoken < words.length,
    error: null,
  };
}

export async function cancelSpeech() {
  if (isTauri()) return invoke<void>('cancel_speech');
  simulatedStopped = true;
}

export async function stopSpeech() {
  if (isTauri()) return invoke<void>('stop_speech');
  simulatedStopped = true;
}
