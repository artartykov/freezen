import { daysBetween } from '@shared/lib';

export function dueOffset(due: string, today: string) {
  return daysBetween(today, due);
}
