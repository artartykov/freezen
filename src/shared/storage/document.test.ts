import { describe, expect, it } from 'vitest';
import {
  defaultData,
  parseData,
  serializeData,
  UnsupportedDataError,
} from './document';

describe('parseData', () => {
  it('returns default data when nothing is stored', () => {
    expect(parseData(null)).toEqual(defaultData);
  });

  it('reads data it serialized', () => {
    expect(parseData(serializeData(defaultData))).toEqual(defaultData);
  });

  it.each([
    ['invalid JSON', '{'],
    ['a non-object', '42'],
    ['null', 'null'],
    ['a missing version', '{}'],
    ['a newer version', '{"version":2}'],
  ])('rejects %s', (_, raw) => {
    expect(() => parseData(raw)).toThrow(UnsupportedDataError);
  });
});

describe('serializeData', () => {
  it('stores the current version', () => {
    expect(JSON.parse(serializeData(defaultData))).toMatchObject({
      version: 1,
    });
  });
});
