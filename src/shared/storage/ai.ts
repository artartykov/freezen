export type AiProvider = 'openai';
export type AiVoice = 'openai-realtime';

export type AiSettings = {
  enabled: boolean;
  providers: AiProvider[];
  voice: AiVoice | null;
  passed: { voice: boolean };
};

type StoredAi = {
  enabled?: boolean;
  providers?: string[];
  voice?: string | null;
  passed?: { voice?: boolean };
};

export const aiProviders: AiProvider[] = ['openai'];
export const aiVoices: AiVoice[] = ['openai-realtime'];

export const defaultAi: AiSettings = {
  enabled: false,
  providers: [],
  voice: null,
  passed: { voice: false },
};

function isProvider(value: unknown): value is AiProvider {
  return aiProviders.includes(value as AiProvider);
}

function isVoice(value: unknown): value is AiVoice {
  return aiVoices.includes(value as AiVoice);
}

export function normalizeAi(stored: StoredAi | undefined): AiSettings {
  const voice = isVoice(stored?.voice) ? stored.voice : null;
  const providers = (stored?.providers ?? []).filter(isProvider);
  const passed = voice !== null && (stored?.passed?.voice ?? false);
  return {
    enabled: (stored?.enabled ?? false) && passed && providers.length > 0,
    providers,
    voice,
    passed: { voice: passed },
  };
}

export function isAiVoiceAvailable(ai: AiSettings) {
  return ai.providers.includes('openai');
}

export function verifyAiProvider(
  ai: AiSettings,
  provider: AiProvider,
  keyReplaced: boolean,
): AiSettings {
  const providers = ai.providers.includes(provider)
    ? ai.providers
    : [...ai.providers, provider];
  if (!keyReplaced) return { ...ai, providers };
  return { ...ai, providers, passed: { voice: false }, enabled: false };
}

export function verifyAiVoice(ai: AiSettings, voice: AiVoice): AiSettings {
  return { ...ai, voice, passed: { voice: true } };
}

export function canEnableAi(ai: AiSettings) {
  return ai.voice !== null && ai.passed.voice && isAiVoiceAvailable(ai);
}

export function setAiEnabled(ai: AiSettings, enabled: boolean): AiSettings {
  return { ...ai, enabled: enabled && canEnableAi(ai) };
}
