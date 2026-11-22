import { useI18n } from '@shared/i18n';
import type { Task, TaskState } from '@shared/storage';

const stateColors = {
  inbox: 'bg-muted/40',
  next: 'bg-next/45',
  waiting: 'bg-waiting/45',
  scheduled: 'bg-scheduled/45',
  later: 'bg-later/45',
  someday: 'bg-someday/45',
} satisfies Record<TaskState, string>;

const numberFormats = {
  en: new Intl.NumberFormat('en'),
  ru: new Intl.NumberFormat('ru'),
};

export function ProjectProgress({ tasks }: { tasks: readonly Task[] }) {
  const { locale, messages } = useI18n();
  const counts: Partial<Record<TaskState, number>> = {};
  let done = 0;
  for (const task of tasks) {
    if (task.completedAt) {
      done += 1;
    } else {
      counts[task.state] = (counts[task.state] ?? 0) + 1;
    }
  }

  const segments = (Object.keys(stateColors) as TaskState[])
    .map((state) => ({
      state,
      count: counts[state] ?? 0,
      color: stateColors[state],
    }))
    .filter(({ count }) => count > 0);
  const numbers = numberFormats[locale];

  return (
    <div className="text-sm text-muted">
      <div
        aria-hidden="true"
        className="mb-1.5 flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-line"
      >
        {done > 0 && <div className="bg-accent" style={{ flex: done }} />}
        {segments.map(({ state, count, color }) => (
          <div key={state} className={color} style={{ flex: count }} />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
        <strong className="font-semibold text-ink">
          {messages.project.progress(
            numbers.format(done),
            numbers.format(tasks.length),
          )}
        </strong>
        {segments.map(({ state, count, color }) => (
          <span key={state} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={`h-1.5 w-3.5 rounded-full ${color}`}
            />
            {numbers.format(count)} {messages.project.progressStates[state]}
          </span>
        ))}
      </div>
    </div>
  );
}
