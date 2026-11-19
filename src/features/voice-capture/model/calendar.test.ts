import { describe, expect, it } from 'vitest';
import { calendarText, todayLabel } from './calendar';

describe('voice calendar', () => {
  it('labels today with its weekday', () => {
    expect(todayLabel('2026-11-19')).toBe('Thursday 2026-11-19');
  });

  it('lists the next seven days with English and Russian weekday names', () => {
    const days = calendarText('2026-11-19').split(', ');
    expect(days).toHaveLength(7);
    expect(days[0]).toBe('Fri/пятница 2026-11-20');
    expect(days[1]).toBe('Sat/суббота 2026-11-21');
    expect(days[6]).toBe('Thu/четверг 2026-11-26');
  });
});
