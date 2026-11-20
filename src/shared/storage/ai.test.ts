import { describe, expect, it } from 'vitest';
import {
  canEnableAi,
  defaultAi,
  isAiVoiceAvailable,
  normalizeAi,
  setAiEnabled,
  verifyAiProvider,
  verifyAiVoice,
} from './ai';

const ready = verifyAiVoice(
  verifyAiProvider(defaultAi, 'openai', false),
  'openai-realtime',
);

describe('AI settings', () => {
  it('cannot be enabled before the key and the recognizer pass', () => {
    expect(canEnableAi(defaultAi)).toBe(false);
    expect(setAiEnabled(defaultAi, true).enabled).toBe(false);
    expect(canEnableAi(verifyAiVoice(defaultAi, 'openai-realtime'))).toBe(
      false,
    );
  });

  it('can be enabled when the key and the recognizer pass', () => {
    expect(canEnableAi(ready)).toBe(true);
    expect(setAiEnabled(ready, true).enabled).toBe(true);
  });

  it('offers the recognizer once the OpenAI key is verified', () => {
    expect(isAiVoiceAvailable(defaultAi)).toBe(false);
    expect(isAiVoiceAvailable(ready)).toBe(true);
  });

  it('keeps the checks when the same key is checked again', () => {
    const again = verifyAiProvider(ready, 'openai', false);
    expect(again.providers).toEqual(['openai']);
    expect(again.passed.voice).toBe(true);
  });

  it('resets the recognizer check and turns AI off when the key is replaced', () => {
    const next = verifyAiProvider(setAiEnabled(ready, true), 'openai', true);
    expect(next.passed.voice).toBe(false);
    expect(next.enabled).toBe(false);
  });
});

describe('normalizeAi', () => {
  it('fills in missing fields', () => {
    expect(normalizeAi(undefined)).toEqual(defaultAi);
  });

  it('keeps valid stored settings', () => {
    const stored = {
      enabled: true,
      providers: ['openai'],
      voice: 'openai-realtime',
      passed: { voice: true },
    };
    expect(normalizeAi(stored)).toEqual(setAiEnabled(ready, true));
  });

  it('drops providers and recognizers that are no longer offered', () => {
    const ai = normalizeAi({
      enabled: true,
      providers: ['openrouter', 'openai'],
      voice: 'system',
      passed: { voice: true },
    });
    expect(ai).toEqual({
      enabled: false,
      providers: ['openai'],
      voice: null,
      passed: { voice: false },
    });
  });
});
