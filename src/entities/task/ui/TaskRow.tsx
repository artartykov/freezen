import type { ComponentProps, ReactNode } from 'react';
import { AlignLeft } from 'lucide-react';
import type { Task } from '@shared/storage';
import { useI18n } from '@shared/i18n';
import { TaskMeta } from './TaskMeta';

type TaskRowProps = Omit<ComponentProps<'li'>, 'title'> & {
  task: Task;
  today: string;
  leading: ReactNode;
  trailing: ReactNode;
  onOpen: () => void;
  subtitle?: string;
  context?: string;
  tags?: string[];
  showNote?: boolean;
  highlighted?: boolean;
  effort?: boolean;
};

const noTags: string[] = [];

export function TaskRow({
  task,
  today,
  leading,
  trailing,
  onOpen,
  subtitle,
  context,
  tags = noTags,
  showNote = false,
  highlighted = false,
  effort = false,
  className = '',
  ...rest
}: TaskRowProps) {
  const { messages } = useI18n();
  const note = !task.completedAt && task.note;

  return (
    <li
      {...rest}
      className={`flex touch-pan-y items-start [-webkit-touch-callout:none] gap-0.5 py-0.5 pr-1 pl-1.5 select-none ${highlighted ? 'bg-glow' : 'bg-card'} ${className}`}
    >
      {leading}
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-11 min-w-0 flex-1 cursor-pointer flex-col justify-center gap-1 rounded-[10px] py-1 pr-1 pl-1.5 text-left focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-focus-ring"
      >
        <span
          data-row-title
          className={`text-[length:var(--row-title-size)] leading-[var(--row-title-line)] font-medium [overflow-wrap:anywhere] ${task.completedAt ? 'text-muted' : ''}`}
        >
          {task.title || messages.task.untitled}
          {note && !showNote && (
            <AlignLeft
              aria-label={messages.task.hasNote}
              className="ml-2 inline size-4 align-[-2px] text-muted opacity-70"
            />
          )}
          {context && (
            <span className="ml-2 text-sm font-normal text-focus-ring">
              {context}
            </span>
          )}
        </span>
        {note && showNote && (
          <span className="line-clamp-4 text-[length:var(--row-meta-size)] leading-[1.4] text-muted">
            {note}
          </span>
        )}
        {subtitle && (
          <span
            className={`mt-0.5 text-[17px] leading-[1.4] text-muted ${task.completedAt ? 'opacity-70' : ''}`}
          >
            {subtitle}
          </span>
        )}
        <TaskMeta task={task} today={today} tags={tags} effort={effort} />
      </button>
      {trailing}
    </li>
  );
}
