import type { ComponentProps, ReactNode } from 'react';
import type { Project } from '@shared/storage';
import { useI18n } from '@shared/i18n';

type ProjectRowProps = Omit<ComponentProps<'li'>, 'title'> & {
  project: Project;
  count: number;
  leading: ReactNode;
  trailing?: ReactNode;
  onOpen: () => void;
  subtitle?: string;
  tags?: string[];
  showNote?: boolean;
  highlighted?: boolean;
};

const noTags: string[] = [];

export function ProjectRow({
  project,
  count,
  leading,
  trailing,
  onOpen,
  subtitle,
  tags = noTags,
  showNote,
  highlighted = false,
  ...rest
}: ProjectRowProps) {
  const { messages } = useI18n();

  return (
    <li
      {...rest}
      className={`flex touch-pan-y items-start gap-0.5 py-0.5 pr-1 pl-1.5 select-none [-webkit-touch-callout:none] ${highlighted ? 'bg-glow' : 'bg-card'}`}
    >
      {leading}
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-11 min-w-0 flex-1 cursor-pointer flex-col justify-center gap-1 rounded-[10px] py-1 pr-1 pl-1.5 text-left focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-focus-ring"
      >
        <span
          data-row-title
          className={`text-[length:var(--row-title-size)] leading-[var(--row-title-line)] font-medium [overflow-wrap:anywhere] ${project.completedAt ? 'text-muted' : ''}`}
        >
          {project.name || messages.project.untitled}{' '}
          <span className="font-normal text-muted">({count})</span>
        </span>
        {showNote && project.note && (
          <span className="line-clamp-4 text-[length:var(--row-meta-size)] leading-[1.4] text-muted">
            {project.note}
          </span>
        )}
        {subtitle && (
          <span
            className={`leading-[1.4] text-muted ${project.completedAt ? 'mt-0.5 text-[17px]' : 'text-sm'}`}
          >
            {subtitle}
          </span>
        )}
        {tags.length > 0 && (
          <span className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-line px-2.5 py-0.5 text-sm font-medium text-muted"
              >
                {tag}
              </span>
            ))}
          </span>
        )}
      </button>
      {trailing}
    </li>
  );
}
