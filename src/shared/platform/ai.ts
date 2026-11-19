import { invoke, isTauri } from '@tauri-apps/api/core';

export type ParsedTask = {
  title: string;
  due: string | null;
  minutes: number | null;
  energy: 'low' | 'medium' | 'high' | null;
};

export type SpeechState = {
  text: string;
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

export async function testAiProvider(key: string) {
  if (!isTauri()) {
    await respond(null);
    if (key !== simulatedKey) throw new Error('Invalid key');
    return;
  }
  await invoke('save_ai_key', { key });
  await invoke('test_ai_provider');
}

export async function testAiVoice() {
  if (isTauri()) return invoke<void>('test_ai_voice');
  await respond(null);
}

export async function testAiPostProcessing(model: string) {
  if (isTauri()) return invoke<void>('test_ai_post_processing', { model });
  await respond(null);
}

function splitTasks(text: string): ParsedTask[] {
  return text
    .split(/\s+(?:and|и)\s+/i)
    .map((title) => title.trim())
    .filter(Boolean)
    .map((title) => ({ title, due: null, minutes: null, energy: null }));
}

export function parseAiTasks(model: string, text: string, today: string) {
  return isTauri()
    ? invoke<ParsedTask[]>('parse_ai_tasks', { model, text, today })
    : respond(splitTasks(text));
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
    text: words.slice(0, spoken).join(' '),
    level: simulatedStopped ? 0 : Math.abs(Math.sin(Date.now() / 150)),
    active: !simulatedStopped && spoken < words.length,
    error: null,
  };
}

export async function stopSpeech() {
  if (isTauri()) return invoke<void>('stop_speech');
  simulatedStopped = true;
}
