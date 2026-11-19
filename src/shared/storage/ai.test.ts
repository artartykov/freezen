import { describe, expect, it } from 'vitest';
import {
  aiDialogModel,
  aiRealtimeModel,
  canEnableAi,
  defaultAi,
  isAiVoiceAvailable,
  isPostProcessingAvailable,
  normalizeAi,
  passAiTest,
  selectAiPostProcessingModel,
  selectAiVoice,
  setAiEnabled,
  verifyAiPostProcessing,
  verifyAiProvider,
  verifyAiVoice,
} from './ai';

const luna = 'openrouter:openai/gpt-6-luna:nitro';
const openaiLuna = 'openai:gpt-6-luna';

const ready = verifyAiPostProcessing(
  verifyAiVoice(verifyAiProvider(defaultAi, 'openrouter', false), 'system'),
  luna,
);

const realtime = verifyAiVoice(
  verifyAiProvider(defaultAi, 'openai', false),
  'openai-realtime',
);

describe('AI settings', () => {
  it('cannot be enabled before the voice and post processing tests pass', () => {
    expect(canEnableAi(defaultAi)).toBe(false);
    expect(setAiEnabled(defaultAi, true).enabled).toBe(false);
    expect(canEnableAi(passAiTest(defaultAi, 'voice'))).toBe(false);
  });

  it('can be enabled when the recognizer and the model pass', () => {
    expect(canEnableAi(ready)).toBe(true);
    expect(setAiEnabled(ready, true).enabled).toBe(true);
  });

  it('makes post processing available once a provider is verified', () => {
    expect(isPostProcessingAvailable(defaultAi)).toBe(false);
    expect(
      isPostProcessingAvailable(
        verifyAiProvider(defaultAi, 'openrouter', false),
      ),
    ).toBe(true);
  });

  it('needs the OpenAI provider for the OpenAI recognizers', () => {
    expect(isAiVoiceAvailable(defaultAi, 'system')).toBe(true);
    expect(isAiVoiceAvailable(defaultAi, 'openai-transcribe')).toBe(false);
    expect(isAiVoiceAvailable(realtime, 'openai-transcribe')).toBe(true);
  });

  it('needs the provider of the chosen model', () => {
    const openaiModel = verifyAiPostProcessing(ready, openaiLuna);
    expect(canEnableAi(openaiModel)).toBe(false);
    expect(canEnableAi(verifyAiProvider(openaiModel, 'openai', false))).toBe(
      true,
    );
  });

  it('lets the realtime model form tasks without post processing', () => {
    expect(isPostProcessingAvailable(realtime)).toBe(false);
    expect(canEnableAi(realtime)).toBe(true);
    expect(aiDialogModel(realtime)).toBe(aiRealtimeModel);
    expect(aiDialogModel(ready)).toBe(luna);
  });

  it('keeps a provider once and does not touch the tests on its first check', () => {
    const once = verifyAiProvider(ready, 'openrouter', false);
    expect(once.providers).toEqual(['openrouter']);
    expect(once.passed).toEqual({ voice: true, postProcessing: true });
  });

  it('resets the tests that use a provider when its key is replaced', () => {
    const next = verifyAiProvider(
      setAiEnabled(ready, true),
      'openrouter',
      true,
    );
    expect(next.passed).toEqual({ voice: true, postProcessing: false });
    expect(next.enabled).toBe(false);
    const openai = verifyAiProvider(
      setAiEnabled(realtime, true),
      'openai',
      true,
    );
    expect(openai.passed.voice).toBe(false);
    expect(verifyAiProvider(ready, 'openai', true).passed).toEqual(
      ready.passed,
    );
  });

  it('resets only its own test when a choice changes', () => {
    expect(selectAiVoice(ready, 'system').passed).toEqual({
      voice: false,
      postProcessing: true,
    });
    const model = selectAiPostProcessingModel(ready, openaiLuna);
    expect(model.passed).toEqual({ voice: true, postProcessing: false });
    expect(model.postProcessingModel).toBe(openaiLuna);
  });
});

describe('normalizeAi', () => {
  it('fills in missing fields of stored settings', () => {
    expect(normalizeAi({ voice: 'system' })).toEqual({
      ...defaultAi,
      voice: 'system',
    });
  });

  it('moves a legacy verified provider into the list', () => {
    const ai = normalizeAi({
      provider: 'openrouter',
      passed: { provider: true, voice: true, postProcessing: false },
    });
    expect(ai.providers).toEqual(['openrouter']);
    expect(ai.passed).toEqual({ voice: true, postProcessing: false });
    expect('provider' in ai).toBe(false);
  });

  it('ignores a legacy provider that never passed its test', () => {
    expect(
      normalizeAi({ provider: 'openrouter', passed: { provider: false } })
        .providers,
    ).toEqual([]);
  });

  it('adds the provider to a model saved without one', () => {
    const ai = normalizeAi({
      postProcessingModel: 'openai/gpt-6-luna:nitro',
      passed: { postProcessing: true },
    });
    expect(ai.postProcessingModel).toBe(luna);
    expect(ai.passed.postProcessing).toBe(true);
  });

  it('drops a model that is no longer offered', () => {
    const ai = normalizeAi({
      postProcessingModel: '~openai/gpt-luna-latest',
      passed: { postProcessing: true },
    });
    expect(ai.postProcessingModel).toBeNull();
    expect(ai.passed.postProcessing).toBe(false);
  });
});
