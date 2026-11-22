import { Flag } from 'lucide-react';
import { TagPill } from '@entities/tag';
import { dueOffset } from '@entities/task';
import { CompleteProjectButton } from '@features/complete-project';
import { StarProjectButton } from '@features/star-project';
import { formatWeekday, useI18n } from '@shared/i18n';
import { todayIso } from '@shared/lib';
import { useOverlay } from '@shared/model';
import { tagNames, useData } from '@shared/storage';
import type { Project, Task } from '@shared/storage';
import { HeaderCard } from './HeaderCard';
import { ProjectProgress } from './ProjectProgress';

export function ProjectHeader({
  project,
  tasks,
}: {
  project: Project;
  tasks: readonly Task[];
}) {
  const { locale, messages } = useI18n();
  const overlay = useOverlay();
  const tags = tagNames(useData(), project.tagIds);
  const offset = project.due ? dueOffset(project.due, todayIso()) : 0;

  return (
    <HeaderCard
      mark={<CompleteProjectButton project={project} ringClassName="size-6" />}
      title={project.name || messages.project.untitled}
      note={project.note}
      editLabel={messages.project.edit}
      onEdit={() => overlay.openEditor({ kind: 'project', id: project.id })}
      end={<StarProjectButton project={project} />}
      footer={<ProjectProgress tasks={tasks} />}
      meta={
        (tags.length > 0 || project.due) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
            {tags.map((tag) => (
              <TagPill key={tag} name={tag} />
            ))}
            {project.due && (
              <span
                className={`flex basis-full items-center gap-1.5 ${offset < 0 ? 'text-danger' : ''}`}
              >
                <Flag className="size-[18px]" aria-hidden="true" />
                <b className="font-bold text-ink">{messages.project.due}</b>
                {formatWeekday(project.due, locale)} —{' '}
                {messages.task.dueIn(offset)}
              </span>
            )}
          </div>
        )
      }
    />
  );
}
