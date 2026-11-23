import { useI18n } from '@shared/i18n';
import { useData } from '@shared/storage';
import pomodoroIcon from './pomodoro.svg';

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
  function tomatoes(minutes: number) {
    const count = pomodoroMinutes.indexOf(pomodoroBucket(minutes)) + 1;
    return (
      <span
        role="img"
        aria-label={messages.editor.pomodoros(count)}
        className="inline-flex items-center gap-0.5 align-middle"
      >
        {Array.from({ length: count }, (_, index) => (
          <img key={index} src={pomodoroIcon} alt="" className="size-[1em]" />
        ))}
      </span>
    );
  }

  return {
    pomodoro,
    label: (minutes: number) =>
      pomodoro ? tomatoes(minutes) : messages.editor.minutes(minutes),
    shortLabel: (minutes: number) =>
      pomodoro ? tomatoes(minutes) : messages.editor.minutesShort(minutes),
  };
}
