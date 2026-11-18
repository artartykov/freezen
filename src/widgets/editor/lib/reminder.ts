export type ReminderPreset =
  'inThreeHours' | 'thisEvening' | 'tomorrowMorning' | 'nextWeek';

export const reminderPresets: ReminderPreset[] = [
  'inThreeHours',
  'thisEvening',
  'tomorrowMorning',
  'nextWeek',
];

function dayAt(now: Date, days: number, hour: number) {
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + days,
    hour,
  );
}

export function reminderTime(preset: ReminderPreset, now: Date) {
  if (preset === 'inThreeHours') return new Date(now.getTime() + 3 * 3_600_000);
  if (preset === 'thisEvening') return dayAt(now, 0, 18);
  if (preset === 'tomorrowMorning') return dayAt(now, 1, 9);
  return dayAt(now, (8 - now.getDay()) % 7 || 7, 9);
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(locale: string, style: 'time' | 'stamp') {
  const key = `${locale}:${style}`;
  const cached = formatters.get(key);
  if (cached) return cached;
  const options: Intl.DateTimeFormatOptions =
    style === 'time'
      ? { hour: 'numeric', minute: '2-digit' }
      : {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        };
  const created = new Intl.DateTimeFormat(locale, options);
  formatters.set(key, created);
  return created;
}

export function formatTime(date: Date, locale: string) {
  return formatter(locale, 'time').format(date);
}

export function formatReminder(iso: string, locale: string) {
  return formatter(locale, 'stamp').format(new Date(iso));
}
