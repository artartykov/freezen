import { ProgressRing } from '@entities/project';
import { useI18n } from '@shared/i18n';
import { projectProgress, useData } from '@shared/storage';
import type { Project } from '@shared/storage';
import { toggleProjectCompleted } from '../model/complete';

type CompleteProjectButtonProps = {
  project: Project;
  ringClassName?: string;
};

export function CompleteProjectButton({
  project,
  ringClassName,
}: CompleteProjectButtonProps) {
  const { messages } = useI18n();
  const progress = useData((data) => projectProgress(data, project));
  const done = !!project.completedAt;

  return (
    <button
      type="button"
      aria-label={
        done ? messages.project.uncomplete : messages.project.complete
      }
      aria-pressed={done}
      onClick={(event) => {
        event.stopPropagation();
        toggleProjectCompleted(project, messages);
      }}
      className="grid size-11 flex-none cursor-pointer place-items-center rounded-xl focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
    >
      <ProgressRing progress={progress} done={done} className={ringClassName} />
    </button>
  );
}
