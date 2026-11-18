import { BarChart3, Flag, Repeat as RepeatIcon, Timer } from 'lucide-react';
import { useI18n } from '@shared/i18n';
import type { Repeat, Task } from '@shared/storage';
import { dueOffset } from '../lib/due';
import { useEffortFormat } from '../lib/effort';

export function TaskMeta({
  task,
  today,
  tags,
  effort,
}: {
  task: Task;
  today: string;
  tags: string[];
  effort: boolean;
}) {
  const showEffort = effort && (!!task.minutes || !!task.energy);
  if (!task.due && !task.repeat && !tags.length && !showEffort) return null;

  return (
    <span className="flex flex-wrap items-center gap-1.5 text-[length:var(--row-meta-size)] text-muted">
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-full bg-line px-2.5 py-0.5 text-sm font-medium"
        >
          {tag}
        </span>
      ))}
      {showEffort && <EffortBadges task={task} />}
      {task.due && (
        <DueBadge due={task.due} today={today} done={!!task.completedAt} />
      )}
      {task.repeat && <RepeatBadge repeat={task.repeat} />}
    </span>
  );
}

function DueBadge({
  due,
  today,
  done,
}: {
  due: string;
  today: string;
  done: boolean;
}) {
  const { messages } = useI18n();
  const offset = dueOffset(due, today);
  const late = offset < 0 && !done;
  let label = messages.task.dueToday;
  if (offset > 0) label = messages.task.daysLeft(offset);
  if (offset < 0) label = messages.task.daysLate(-offset);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full py-0.5 pr-2.5 pl-1.5 text-sm font-medium ${
        late ? 'bg-danger-soft text-danger' : 'bg-line text-muted'
      }`}
    >
      <Flag className="size-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}

function RepeatBadge({ repeat }: { repeat: Repeat }) {
  const { messages } = useI18n();

  return (
    <span
      role="img"
      aria-label={messages.repeat[repeat]}
      className="inline-flex items-center rounded-full bg-line px-1.5 py-1 text-muted"
    >
      <RepeatIcon className="size-3.5" aria-hidden="true" />
    </span>
  );
}

function EffortBadges({ task }: { task: Task }) {
  const { messages } = useI18n();
  const effort = useEffortFormat();
  const pill =
    'inline-flex items-center gap-1 rounded-full bg-line px-2.5 py-0.5 text-sm font-medium';

  return (
    <>
      {task.minutes && (
        <span className={pill}>
          <Timer className="size-3.5" aria-hidden="true" />
          {effort.shortLabel(task.minutes)}
        </span>
      )}
      {task.energy && (
        <span className={pill}>
          <BarChart3 className="size-3.5" aria-hidden="true" />
          {messages.editor.energyShort[task.energy]}
        </span>
      )}
    </>
  );
}
