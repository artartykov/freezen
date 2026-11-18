import type { Messages } from '@shared/i18n';
import type { Settings, Weekday } from '@shared/storage';
import { formatTime } from './time';

export type NudgeMode = Settings['dailyNudge']['mode'];
export type ReviewDay = Settings['weeklyReview']['day'];

export type AlertOption<T extends string> = { value: T; label: string };

const NUDGE_MODES = ['off', 'weekdays', 'everyday'] as const;
const WEEKDAYS: readonly Weekday[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

export function nudgeOptions(messages: Messages): AlertOption<NudgeMode>[] {
  return NUDGE_MODES.map((value) => ({
    value,
    label: messages.settings.nudgeModes[value],
  }));
}

export function reviewOptions(messages: Messages): AlertOption<ReviewDay>[] {
  const m = messages.settings;
  return [
    { value: 'off', label: m.off },
    ...WEEKDAYS.map((value) => ({ value, label: m.weekdays[value] })),
  ];
}

function settingTime(
  setting: { hour: number; minute: number },
  settings: Settings,
  locale: string,
) {
  return formatTime(
    setting.hour,
    setting.minute,
    locale,
    settings.timeFormat === '24h',
  );
}

export function nudgeLabel(
  settings: Settings,
  messages: Messages,
  locale: string,
) {
  const m = messages.settings;
  const nudge = settings.dailyNudge;
  if (nudge.mode === 'off') return m.off;
  return m.nudgeValue(
    m.nudgeModes[nudge.mode],
    settingTime(nudge, settings, locale),
  );
}

export function reviewLabel(
  settings: Settings,
  messages: Messages,
  locale: string,
) {
  const m = messages.settings;
  const review = settings.weeklyReview;
  if (review.day === 'off') return m.off;
  return m.reviewValue(
    m.weekdays[review.day],
    settingTime(review, settings, locale),
  );
}
