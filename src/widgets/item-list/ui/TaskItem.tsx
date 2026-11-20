import { TaskCheck, TaskRow } from '@entities/task';
import { CompleteTaskButton } from '@features/complete-task';
import { WaitingContactSheet } from '@features/manage-tags';
import { MoveSheet } from '@features/move-tasks';
import { SelectionMark } from '@features/select-tasks';
import type { ReorderItemProps } from '@features/reorder';
import { StarTaskButton } from '@features/star-task';
import { useOverlay, useUiState } from '@shared/model';
import { tagNames, useData } from '@shared/storage';
import type { Task } from '@shared/storage';
import { useSelectableRow } from '../model/selectableRow';

type TaskItemProps = {
  task: Task;
  today: string;
  subtitle?: string;
  context?: string;
  sort?: ReorderItemProps;
  lifted?: boolean;
};

export function TaskItem({
  task,
  today,
  subtitle,
  context,
  sort,
  lifted = false,
}: TaskItemProps) {
  const overlay = useOverlay();
  const data = useData();
  const { showNotes, showTags, showEffort } = useUiState();
  const row = useSelectableRow(task.id, sort, lifted);

  return (
    <>
      <TaskRow
        {...row.rowProps}
        task={task}
        today={today}
        subtitle={subtitle}
        context={context}
        showNote={showNotes}
        effort={showEffort}
        tags={showTags ? tagNames(data, task.tagIds) : []}
        highlighted={row.selected}
        onOpen={() =>
          row.open(() => overlay.openEditor({ kind: 'task', id: task.id }))
        }
        leading={
          row.selecting ? (
            <span
              className="grid size-11 flex-none cursor-pointer place-items-center"
              aria-hidden="true"
            >
              <TaskCheck done={!!task.completedAt} />
            </span>
          ) : (
            <CompleteTaskButton task={task} />
          )
        }
        trailing={
          row.selecting ? (
            <SelectionMark selected={row.selected} />
          ) : (
            <StarTaskButton task={task} today={today} />
          )
        }
      />
      {row.moving && (
        <MoveSheet
          waitingContactPicker={WaitingContactSheet}
          taskIds={[task.id]}
          onClose={row.closeMove}
        />
      )}
    </>
  );
}
