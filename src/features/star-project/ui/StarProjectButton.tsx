import { Star } from 'lucide-react';
import { useI18n } from '@shared/i18n';
import { changeData, updateProject } from '@shared/storage';
import type { Project } from '@shared/storage';

export function StarProjectButton({
  project,
  className = '',
}: {
  project: Project;
  className?: string;
}) {
  const { messages } = useI18n();

  return (
    <button
      type="button"
      aria-label={
        project.starred ? messages.project.removeStar : messages.project.addStar
      }
      aria-pressed={project.starred}
      onClick={(event) => {
        event.stopPropagation();
        changeData((data) =>
          updateProject(data, project.id, { starred: !project.starred }),
        );
      }}
      className={`group grid size-11 flex-none cursor-pointer place-items-center rounded-xl text-muted aria-pressed:text-star focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${className}`}
    >
      <Star
        className="size-[22px] group-aria-pressed:fill-current"
        strokeWidth={1.8}
        aria-hidden="true"
      />
    </button>
  );
}
