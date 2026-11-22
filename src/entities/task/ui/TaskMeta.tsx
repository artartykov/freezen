import type { ReactNode } from 'react';
import { Repeat as RepeatIcon } from 'lucide-react';
import { useI18n } from '@shared/i18n';
import type { Repeat, Task } from '@shared/storage';
import { useEffortFormat } from '../lib/effort';

export function TaskMeta({
  task,
  tags,
  effort,
}: {
  task: Task;
  tags?: ReactNode[];
  effort: boolean;
}) {
  const showEffort = effort && (!!task.minutes || !!task.energy);
  const visibleTags = task.completedAt ? undefined : tags;
  if (!task.repeat && !visibleTags?.length && !showEffort) return null;

  return (
    <span className="flex flex-wrap items-baseline gap-1.5 text-[length:var(--row-meta-size)] text-muted">
      {visibleTags}
      {showEffort && <EffortLabels task={task} />}
      {task.repeat && <RepeatBadge repeat={task.repeat} />}
    </span>
  );
}

function RepeatBadge({ repeat }: { repeat: Repeat }) {
  const { messages } = useI18n();

  return (
    <span
      role="img"
      aria-label={messages.repeat[repeat]}
      className="inline-flex items-center self-center rounded-full bg-line px-1.5 py-1 text-muted"
    >
      <RepeatIcon className="size-3.5" aria-hidden="true" />
    </span>
  );
}

function EffortLabels({ task }: { task: Task }) {
  const { messages } = useI18n();
  const effort = useEffortFormat();
  return (
    <>
      {task.minutes && (
        <span className="whitespace-nowrap">
          {effort.shortLabel(task.minutes)}
        </span>
      )}
      {task.energy && (
        <span className="whitespace-nowrap lowercase">
          {messages.editor.energyShort[task.energy]}
        </span>
      )}
    </>
  );
}
