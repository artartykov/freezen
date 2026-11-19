import { describe, expect, it } from 'vitest';
import { feedableUpTo, lastWords } from './feed';

describe('feedableUpTo', () => {
  it('sends final words right away', () => {
    expect(feedableUpTo({ stable: 3, total: 3, fed: 0, settled: false })).toBe(
      3,
    );
  });

  it('holds back only the last partial word while speech goes on', () => {
    expect(feedableUpTo({ stable: 3, total: 6, fed: 0, settled: false })).toBe(
      5,
    );
  });

  it('sends a single new word without waiting for a batch', () => {
    expect(feedableUpTo({ stable: 0, total: 2, fed: 0, settled: false })).toBe(
      1,
    );
  });

  it('sends everything once speech has settled', () => {
    expect(feedableUpTo({ stable: 3, total: 6, fed: 5, settled: true })).toBe(
      6,
    );
  });

  it('never goes backwards', () => {
    expect(feedableUpTo({ stable: 2, total: 4, fed: 5, settled: true })).toBe(
      5,
    );
  });
});

describe('lastWords', () => {
  it('returns the last words of a text', () => {
    expect(lastWords('a b c d', 2)).toBe('c d');
    expect(lastWords('  ', 2)).toBe('');
  });
});
