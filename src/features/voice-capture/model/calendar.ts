import { addDays } from '@shared/lib';

const daysAhead = 7;

function weekday(iso: string, locale: string, style: 'short' | 'long') {
  return new Intl.DateTimeFormat(locale, {
    weekday: style,
    timeZone: 'UTC',
  }).format(new Date(`${iso}T12:00:00Z`));
}

export function todayLabel(today: string) {
  return `${weekday(today, 'en', 'long')} ${today}`;
}

export function calendarText(today: string) {
  return Array.from({ length: daysAhead }, (_, index) => {
    const iso = addDays(today, index + 1);
    return `${weekday(iso, 'en', 'short')}/${weekday(iso, 'ru', 'long')} ${iso}`;
  }).join(', ');
}
