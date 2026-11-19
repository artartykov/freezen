import { describe, expect, it } from 'vitest';
import {
  canEnableAi,
  defaultAi,
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

const ready = passAiTest(
  passAiTest(verifyAiProvider(defaultAi, 'openrouter', false), 'voice'),
  'postProcessing',
);

describe('AI settings', () => {
  it('cannot be enabled before the provider and both tests pass', () => {
    expect(canEnableAi(defaultAi)).toBe(false);
    expect(setAiEnabled(defaultAi, true).enabled).toBe(false);
    expect(canEnableAi(passAiTest(defaultAi, 'voice'))).toBe(false);
  });

  it('can be enabled when a provider is verified and both tests pass', () => {
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

  it('keeps a provider once and does not touch the tests on its first check', () => {
    const once = verifyAiProvider(ready, 'openrouter', false);
    expect(once.providers).toEqual(['openrouter']);
    expect(once.passed).toEqual({ voice: true, postProcessing: true });
  });

  it('resets post processing and turns AI off when the key is replaced', () => {
    const next = verifyAiProvider(
      setAiEnabled(ready, true),
      'openrouter',
      true,
    );
    expect(next.passed).toEqual({ voice: true, postProcessing: false });
    expect(next.enabled).toBe(false);
    expect(next.providers).toEqual(['openrouter']);
  });

  it('resets only its own test when a model changes', () => {
    expect(selectAiVoice(ready, 'system').passed).toEqual({
      voice: false,
      postProcessing: true,
    });
    const model = selectAiPostProcessingModel(ready, 'model');
    expect(model.passed).toEqual({ voice: true, postProcessing: false });
    expect(model.postProcessingModel).toBe('model');
  });
});

describe('verifyAiVoice', () => {
  it('selects the recognizer and marks it verified', () => {
    const next = verifyAiVoice(defaultAi, 'system');
    expect(next.voice).toBe('system');
    expect(next.passed.voice).toBe(true);
  });

  it('turns AI off while the recognizer is checked again', () => {
    expect(
      verifyAiVoice(setAiEnabled(ready, true), 'system').passed.voice,
    ).toBe(true);
  });
});

describe('verifyAiPostProcessing', () => {
  it('selects the model and marks it verified', () => {
    const next = verifyAiPostProcessing(defaultAi, 'model-x');
    expect(next.postProcessingModel).toBe('model-x');
    expect(next.passed.postProcessing).toBe(true);
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
    const stored = {
      provider: 'openrouter' as const,
      passed: { provider: true, voice: true, postProcessing: false },
    };
    const ai = normalizeAi(stored);
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
});
