import { describe, expect, it } from 'vitest';
import {
  canEnableAi,
  changeAiKey,
  defaultAi,
  isPostProcessingAvailable,
  normalizeAi,
  passAiTest,
  selectAiPostProcessingModel,
  selectAiProvider,
  selectAiVoice,
  setAiEnabled,
} from './ai';

const allPassed = (['provider', 'voice', 'postProcessing'] as const).reduce(
  passAiTest,
  defaultAi,
);

describe('AI settings', () => {
  it('cannot be enabled before all three tests pass', () => {
    expect(canEnableAi(defaultAi)).toBe(false);
    expect(setAiEnabled(defaultAi, true).enabled).toBe(false);
  });

  it('can be enabled when all three tests pass', () => {
    expect(canEnableAi(allPassed)).toBe(true);
    expect(setAiEnabled(allPassed, true).enabled).toBe(true);
  });

  it('makes post processing available after the provider test', () => {
    expect(isPostProcessingAvailable(defaultAi)).toBe(false);
    expect(isPostProcessingAvailable(passAiTest(defaultAi, 'provider'))).toBe(
      true,
    );
  });

  it('resets provider and post processing tests when the key changes', () => {
    const next = changeAiKey(setAiEnabled(allPassed, true));
    expect(next.passed).toEqual({
      provider: false,
      voice: true,
      postProcessing: false,
    });
    expect(next.enabled).toBe(false);
  });

  it('resets provider and post processing tests when the provider changes', () => {
    const next = selectAiProvider(allPassed, 'openrouter');
    expect(next.passed.provider).toBe(false);
    expect(next.passed.postProcessing).toBe(false);
    expect(next.passed.voice).toBe(true);
  });

  it('resets only its own test when a model changes', () => {
    const voice = selectAiVoice(allPassed, 'system');
    expect(voice.passed).toEqual({
      provider: true,
      voice: false,
      postProcessing: true,
    });
    const model = selectAiPostProcessingModel(allPassed, 'model');
    expect(model.passed).toEqual({
      provider: true,
      voice: true,
      postProcessing: false,
    });
    expect(model.postProcessingModel).toBe('model');
  });

  it('fills in missing fields of stored settings', () => {
    expect(normalizeAi({ provider: 'openrouter' })).toEqual({
      ...defaultAi,
      provider: 'openrouter',
    });
  });
});
