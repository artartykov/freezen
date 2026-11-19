export type AiProvider = 'openrouter';
export type AiVoice = 'system';
export type AiTest = 'voice' | 'postProcessing';

export type AiSettings = {
  enabled: boolean;
  providers: AiProvider[];
  voice: AiVoice | null;
  postProcessingModel: string | null;
  passed: Record<AiTest, boolean>;
};

type StoredAi = Partial<Omit<AiSettings, 'passed'>> & {
  provider?: AiProvider | null;
  passed?: Partial<Record<AiTest | 'provider', boolean>>;
};

export const aiProviders: AiProvider[] = ['openrouter'];
export const aiVoices: AiVoice[] = ['system'];
export const aiPostProcessingModels = [
  'openai/gpt-6-luna:nitro',
  'anthropic/claude-haiku-5.5:nitro',
];

export const defaultAi: AiSettings = {
  enabled: false,
  providers: [],
  voice: null,
  postProcessingModel: null,
  passed: { voice: false, postProcessing: false },
};

export function normalizeAi(stored: StoredAi | undefined): AiSettings {
  const legacy =
    stored?.provider && stored.passed?.provider ? [stored.provider] : [];
  return {
    enabled: stored?.enabled ?? false,
    providers: stored?.providers ?? legacy,
    voice: stored?.voice ?? null,
    postProcessingModel: stored?.postProcessingModel ?? null,
    passed: {
      voice: stored?.passed?.voice ?? false,
      postProcessing: stored?.passed?.postProcessing ?? false,
    },
  };
}

function reset(ai: AiSettings, tests: AiTest[]): AiSettings {
  const passed = { ...ai.passed };
  for (const test of tests) passed[test] = false;
  return { ...ai, passed, enabled: false };
}

export function verifyAiProvider(
  ai: AiSettings,
  provider: AiProvider,
  keyReplaced: boolean,
): AiSettings {
  const providers = ai.providers.includes(provider)
    ? ai.providers
    : [...ai.providers, provider];
  const next = { ...ai, providers };
  return keyReplaced ? reset(next, ['postProcessing']) : next;
}

export function selectAiVoice(ai: AiSettings, voice: AiVoice) {
  return { ...reset(ai, ['voice']), voice };
}

export function verifyAiVoice(ai: AiSettings, voice: AiVoice) {
  return passAiTest(selectAiVoice(ai, voice), 'voice');
}

export function verifyAiPostProcessing(ai: AiSettings, model: string) {
  return passAiTest(selectAiPostProcessingModel(ai, model), 'postProcessing');
}

export function selectAiPostProcessingModel(ai: AiSettings, model: string) {
  return { ...reset(ai, ['postProcessing']), postProcessingModel: model };
}

export function passAiTest(ai: AiSettings, test: AiTest): AiSettings {
  return { ...ai, passed: { ...ai.passed, [test]: true } };
}

export function isPostProcessingAvailable(ai: AiSettings) {
  return ai.providers.length > 0;
}

export function canEnableAi(ai: AiSettings) {
  return (
    isPostProcessingAvailable(ai) && ai.passed.voice && ai.passed.postProcessing
  );
}

export function setAiEnabled(ai: AiSettings, enabled: boolean): AiSettings {
  return { ...ai, enabled: enabled && canEnableAi(ai) };
}
