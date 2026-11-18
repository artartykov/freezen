const formatters = new Map<string, Intl.DateTimeFormat>();

function timeFormatter(locale: string, hours24: boolean) {
  const key = `${locale}:${hours24 ? '24' : '12'}`;
  const cached = formatters.get(key);
  if (cached) return cached;
  const created = new Intl.DateTimeFormat(
    locale,
    hours24
      ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }
      : { hour: 'numeric', minute: '2-digit', hourCycle: 'h12' },
  );
  formatters.set(key, created);
  return created;
}

function at(hour: number, minute: number) {
  return new Date(2000, 0, 1, hour, minute);
}

export function formatTime(
  hour: number,
  minute: number,
  locale: string,
  hours24: boolean,
) {
  return timeFormatter(locale, hours24).format(at(hour, minute));
}

function dayPeriod(locale: string, hour: number) {
  return (
    timeFormatter(locale, false)
      .formatToParts(at(hour, 0))
      .find((part) => part.type === 'dayPeriod')?.value ?? ''
  );
}

export function dayPeriods(locale: string): readonly [string, string] {
  return [dayPeriod(locale, 0), dayPeriod(locale, 12)];
}
