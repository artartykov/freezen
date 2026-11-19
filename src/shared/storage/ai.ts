export type AiProvider = 'openrouter' | 'openai';
export type AiVoice = 'system' | 'openai-transcribe' | 'openai-realtime';
export type AiTest = 'voice' | 'postProcessing';
export type AiModel = { id: string; provider: AiProvider; name: string };

export type AiSettings = {
  enabled: boolean;
  providers: AiProvider[];
  voice: AiVoice | null;
  postProcessingModel: string | null;
  passed: Record<AiTest, boolean>;
};

type StoredAi = Partial<
  Omit<AiSettings, 'passed' | 'providers' | 'voice' | 'postProcessingModel'>
> & {
  provider?: string | null;
  providers?: string[];
  voice?: string | null;
  postProcessingModel?: string | null;
  passed?: Partial<Record<AiTest | 'provider', boolean>>;
};

export const aiProviders: AiProvider[] = ['openrouter', 'openai'];
export const aiVoices: AiVoice[] = [
  'system',
  'openai-transcribe',
  'openai-realtime',
];
export const aiPostProcessingModels: AiModel[] = [
  {
    id: 'openrouter:openai/gpt-6-luna:nitro',
    provider: 'openrouter',
    name: 'gpt-6-luna:nitro',
  },
  {
    id: 'openrouter:anthropic/claude-haiku-5.5:nitro',
    provider: 'openrouter',
    name: 'claude-haiku-5.5:nitro',
  },
  { id: 'openai:gpt-6-luna', provider: 'openai', name: 'gpt-6-luna' },
];
export const aiRealtimeModel = 'openai:gpt-realtime-mini';

const voiceProviders: Record<AiVoice, AiProvider | null> = {
  system: null,
  'openai-transcribe': 'openai',
  'openai-realtime': 'openai',
};

export const defaultAi: AiSettings = {
  enabled: false,
  providers: [],
  voice: null,
  postProcessingModel: null,
  passed: { voice: false, postProcessing: false },
};

function isProvider(value: unknown): value is AiProvider {
  return aiProviders.includes(value as AiProvider);
}

function isVoice(value: unknown): value is AiVoice {
  return aiVoices.includes(value as AiVoice);
}

export function findAiModel(id: string | null) {
  return aiPostProcessingModels.find((model) => model.id === id) ?? null;
}

function storedModel(id: string | null | undefined) {
  if (!id) return null;
  return findAiModel(id)?.id ?? findAiModel(`openrouter:${id}`)?.id ?? null;
}

export function normalizeAi(stored: StoredAi | undefined): AiSettings {
  const legacy =
    stored?.provider && stored.passed?.provider ? [stored.provider] : [];
  const postProcessingModel = storedModel(stored?.postProcessingModel);
  return {
    enabled: stored?.enabled ?? false,
    providers: (stored?.providers ?? legacy).filter(isProvider),
    voice: isVoice(stored?.voice) ? stored.voice : null,
    postProcessingModel,
    passed: {
      voice: stored?.passed?.voice ?? false,
      postProcessing:
        postProcessingModel !== null &&
        (stored?.passed?.postProcessing ?? false),
    },
  };
}

function reset(ai: AiSettings, tests: AiTest[]): AiSettings {
  const passed = { ...ai.passed };
  for (const test of tests) passed[test] = false;
  return { ...ai, passed, enabled: false };
}

export function voiceFormsTasks(voice: AiVoice | null) {
  return voice === 'openai-realtime';
}

export function isAiVoiceAvailable(ai: AiSettings, voice: AiVoice) {
  const provider = voiceProviders[voice];
  return provider === null || ai.providers.includes(provider);
}

export function isAiModelAvailable(ai: AiSettings, model: AiModel) {
  return ai.providers.includes(model.provider);
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
  if (!keyReplaced) return next;
  const tests: AiTest[] = [];
  if (findAiModel(ai.postProcessingModel)?.provider === provider)
    tests.push('postProcessing');
  if (ai.voice && voiceProviders[ai.voice] === provider) tests.push('voice');
  return reset(next, tests);
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
  return (
    !voiceFormsTasks(ai.voice) &&
    aiPostProcessingModels.some((model) => isAiModelAvailable(ai, model))
  );
}

export function canEnableAi(ai: AiSettings) {
  if (!ai.voice || !ai.passed.voice || !isAiVoiceAvailable(ai, ai.voice))
    return false;
  if (voiceFormsTasks(ai.voice)) return true;
  const model = findAiModel(ai.postProcessingModel);
  return (
    model !== null && ai.passed.postProcessing && isAiModelAvailable(ai, model)
  );
}

export function setAiEnabled(ai: AiSettings, enabled: boolean): AiSettings {
  return { ...ai, enabled: enabled && canEnableAi(ai) };
}

export function aiDialogModel(ai: AiSettings) {
  return voiceFormsTasks(ai.voice)
    ? aiRealtimeModel
    : (ai.postProcessingModel ?? '');
}
