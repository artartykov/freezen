import { useI18n } from '@shared/i18n';
import { useData } from '@shared/storage';

export const pomodoroMinutes = [30, 60, 90, 120, 180];

export function pomodoroBucket(minutes: number) {
  return (
    pomodoroMinutes.find((limit) => minutes <= limit) ??
    pomodoroMinutes[pomodoroMinutes.length - 1]
  );
}

export function useEffortFormat() {
  const { messages } = useI18n();
  const pomodoro = useData((data) => data.settings.effortFormat === 'pomodoro');
  const tomatoes = (minutes: number) =>
    messages.editor.pomodoros(
      pomodoroMinutes.indexOf(pomodoroBucket(minutes)) + 1,
    );

  return {
    pomodoro,
    label: (minutes: number) =>
      pomodoro ? tomatoes(minutes) : messages.editor.minutes(minutes),
    shortLabel: (minutes: number) =>
      pomodoro ? tomatoes(minutes) : messages.editor.minutesShort(minutes),
  };
}
