import { describe, expect, it } from 'vitest';
import { feedableUpTo, lastWords, wordsOf } from './feed';

const words = wordsOf('one two three four five six seven eight nine ten');

describe('feedableUpTo', () => {
  it('holds back the last words while the recognizer may still change them', () => {
    expect(feedableUpTo(words, 0, true)).toBe(8);
  });

  it('waits for a batch of new words before sending', () => {
    expect(feedableUpTo(words, 5, true)).toBe(5);
    expect(feedableUpTo(words, 2, true)).toBe(8);
  });

  it('sends everything once the recognizer has stopped', () => {
    expect(feedableUpTo(words, 8, false)).toBe(10);
  });

  it('sends everything on demand', () => {
    expect(feedableUpTo(words, 9, true, true)).toBe(10);
  });

  it('never goes backwards', () => {
    expect(feedableUpTo(words, 10, false)).toBe(10);
    expect(feedableUpTo(words, 10, true, true)).toBe(10);
  });
});

describe('lastWords', () => {
  it('returns the last words of a text', () => {
    expect(lastWords('a b c d', 2)).toBe('c d');
    expect(lastWords('  ', 2)).toBe('');
  });
});
