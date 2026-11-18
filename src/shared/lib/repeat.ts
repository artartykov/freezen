import { parseIsoDate, toIsoDate } from './date';

export type RepeatPeriod = 'day' | 'week' | 'month' | 'year';

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function advanceDate(date: Date, repeat: RepeatPeriod) {
  const next = new Date(date);
  if (repeat === 'day' || repeat === 'week') {
    next.setDate(next.getDate() + (repeat === 'day' ? 1 : 7));
    return next;
  }
  const day = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + (repeat === 'month' ? 1 : 12));
  next.setDate(Math.min(day, daysInMonth(next.getFullYear(), next.getMonth())));
  return next;
}

export function advanceIsoDate(iso: string, repeat: RepeatPeriod) {
  return toIsoDate(advanceDate(parseIsoDate(iso), repeat));
}

export function advanceTimestamp(iso: string, repeat: RepeatPeriod) {
  return advanceDate(new Date(iso), repeat).toISOString();
}

export function nextIsoDate(iso: string, repeat: RepeatPeriod, today: string) {
  return advanceIsoDate(iso < today ? today : iso, repeat);
}

export function nextTimestamp(iso: string, repeat: RepeatPeriod, now: Date) {
  const date = new Date(iso);
  if (date < now)
    date.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
  return advanceTimestamp(date.toISOString(), repeat);
}
