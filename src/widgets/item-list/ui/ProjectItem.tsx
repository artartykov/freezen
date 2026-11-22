import { TagPill } from '@entities/tag';
import { useNavigate } from '@tanstack/react-router';
import { ProgressRing, ProjectRow } from '@entities/project';
import { CompleteProjectButton } from '@features/complete-project';
import { MoveProjectsSheet } from '@features/move-projects';
import type { ReorderItemProps } from '@features/reorder';
import { SelectionMark } from '@features/select-tasks';
import { StarProjectButton } from '@features/star-project';
import { RestoreTrashSheet } from '@features/trash-tasks';
import { useOverlay, useUiState } from '@shared/model';
import { projectProgress, tagsByIds, useData } from '@shared/storage';
import type { Project } from '@shared/storage';
import { useSelectableRow } from '../model/selectableRow';

type ProjectItemProps = {
  project: Project;
  count: number;
  subtitle?: string;
  fromSearch: boolean;
  selectable: boolean;
  sort?: ReorderItemProps;
  lifted: boolean;
};

export function ProjectItem({
  project,
  count,
  subtitle,
  fromSearch,
  selectable,
  sort,
  lifted,
}: ProjectItemProps) {
  const navigate = useNavigate();
  const overlay = useOverlay();
  const data = useData();
  const { showNotes, showTags } = useUiState();
  const row = useSelectableRow(project.id, sort, lifted, selectable);

  return (
    <>
      <ProjectRow
        {...row.rowProps}
        project={project}
        count={count}
        subtitle={subtitle}
        showNote={showNotes}
        tags={
          showTags
            ? tagsByIds(data, project.tagIds).map((tag) => (
                <TagPill key={tag.id} tag={tag} />
              ))
            : undefined
        }
        highlighted={row.selected}
        leading={
          row.selecting || project.trashed ? (
            <span
              className={`grid size-11 flex-none place-items-center ${row.selecting ? 'cursor-pointer' : ''}`}
            >
              <ProgressRing
                progress={projectProgress(data, project)}
                done={!!project.completedAt}
              />
            </span>
          ) : (
            <CompleteProjectButton project={project} />
          )
        }
        trailing={
          row.selecting ? (
            <SelectionMark selected={row.selected} />
          ) : (
            !project.trashed && <StarProjectButton project={project} />
          )
        }
        onOpen={() =>
          row.open(() => {
            if (project.trashed) {
              overlay.openEditor({ kind: 'project', id: project.id });
              return;
            }
            void navigate({
              to: '/project/$projectId',
              params: { projectId: project.id },
              state: { fromSearch },
            });
          })
        }
      />
      {row.moving && project.trashed && (
        <RestoreTrashSheet ids={[project.id]} onClose={row.closeMove} />
      )}
      {row.moving && !project.trashed && (
        <MoveProjectsSheet projectIds={[project.id]} onClose={row.closeMove} />
      )}
    </>
  );
}
