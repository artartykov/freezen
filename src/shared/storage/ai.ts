export type AiProvider = 'openrouter';
export type AiVoice = 'system';
export type AiTest = 'provider' | 'voice' | 'postProcessing';

export type AiSettings = {
  enabled: boolean;
  provider: AiProvider | null;
  voice: AiVoice | null;
  postProcessingModel: string | null;
  passed: Record<AiTest, boolean>;
};

export const aiProviders: AiProvider[] = ['openrouter'];
export const aiVoices: AiVoice[] = ['system'];
export const aiPostProcessingModels = ['~openai/gpt-luna-latest'];

export const defaultAi: AiSettings = {
  enabled: false,
  provider: null,
  voice: null,
  postProcessingModel: null,
  passed: { provider: false, voice: false, postProcessing: false },
};

export function normalizeAi(stored: Partial<AiSettings> | undefined) {
  return {
    ...defaultAi,
    ...stored,
    passed: { ...defaultAi.passed, ...stored?.passed },
  };
}

function reset(ai: AiSettings, tests: AiTest[]): AiSettings {
  const passed = { ...ai.passed };
  for (const test of tests) passed[test] = false;
  return { ...ai, passed, enabled: false };
}

export function selectAiProvider(ai: AiSettings, provider: AiProvider) {
  return { ...reset(ai, ['provider', 'postProcessing']), provider };
}

export function changeAiKey(ai: AiSettings) {
  return reset(ai, ['provider', 'postProcessing']);
}

export function selectAiVoice(ai: AiSettings, voice: AiVoice) {
  return { ...reset(ai, ['voice']), voice };
}

export function selectAiPostProcessingModel(ai: AiSettings, model: string) {
  return { ...reset(ai, ['postProcessing']), postProcessingModel: model };
}

export function passAiTest(ai: AiSettings, test: AiTest): AiSettings {
  return { ...ai, passed: { ...ai.passed, [test]: true } };
}

export function canEnableAi(ai: AiSettings) {
  return Object.values(ai.passed).every(Boolean);
}

export function setAiEnabled(ai: AiSettings, enabled: boolean): AiSettings {
  return { ...ai, enabled: enabled && canEnableAi(ai) };
}

export function isPostProcessingAvailable(ai: AiSettings) {
  return ai.passed.provider;
}
