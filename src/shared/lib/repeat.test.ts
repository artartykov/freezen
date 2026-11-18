import { describe, expect, it } from 'vitest';
import { advanceIsoDate, advanceTimestamp, nextIsoDate } from './repeat';

describe('advanceIsoDate', () => {
  it('adds one period', () => {
    expect(advanceIsoDate('2026-11-18', 'day')).toBe('2026-11-19');
    expect(advanceIsoDate('2026-12-29', 'week')).toBe('2027-01-05');
    expect(advanceIsoDate('2026-11-18', 'month')).toBe('2026-12-18');
    expect(advanceIsoDate('2026-11-18', 'year')).toBe('2027-11-18');
  });

  it('clamps to the end of the month', () => {
    expect(advanceIsoDate('2027-01-31', 'month')).toBe('2027-02-28');
    expect(advanceIsoDate('2028-01-31', 'month')).toBe('2028-02-29');
    expect(advanceIsoDate('2028-02-29', 'year')).toBe('2029-02-28');
  });
});

describe('nextIsoDate', () => {
  it('advances from today when the date has passed', () => {
    expect(nextIsoDate('2026-11-01', 'week', '2026-11-18')).toBe('2026-11-25');
    expect(nextIsoDate('2026-11-20', 'week', '2026-11-18')).toBe('2026-11-27');
  });
});

describe('advanceTimestamp', () => {
  it('keeps the local time of day', () => {
    const next = new Date(
      advanceTimestamp(new Date(2027, 0, 31, 9, 30).toISOString(), 'month'),
    );
    expect([next.getMonth(), next.getDate(), next.getHours()]).toEqual([
      1, 28, 9,
    ]);
  });
});
