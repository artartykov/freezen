import { useI18n } from '@shared/i18n';
import { useUiState } from '@shared/model';
import { changeData, moveTasks, useData, assignArea } from '@shared/storage';
import type { Destination, Task } from '@shared/storage';
import { DestinationSheet } from '@shared/ui/DestinationSheet';
import {
  destinationKey,
  toDestination,
  useTaskDestinations,
} from '../model/destinations';

type TaskPlaceSheetProps = {
  tasks: Task[];
  onSelect: (destination: Destination) => void;
  onClose: () => void;
  allowTrash?: boolean;
};

type MoveSheetProps = {
  taskIds: string[];
  onClose: () => void;
  onMoved?: () => void;
  allowTrash?: boolean;
};

export function MoveSheet({
  taskIds,
  onClose,
  onMoved,
  allowTrash = true,
}: MoveSheetProps) {
  const data = useData();
  const area = useUiState((state) => state.area);
  const idSet = new Set(taskIds);

  function move(destination: Destination) {
    changeData((state) => {
      const fromInbox = state.tasks
        .filter((task) => idSet.has(task.id) && task.state === 'inbox')
        .map((task) => task.id);
      return assignArea(
        moveTasks(state, taskIds, destination),
        fromInbox,
        area,
      );
    });
    onClose();
    onMoved?.();
  }

  return (
    <TaskPlaceSheet
      tasks={data.tasks.filter((task) => idSet.has(task.id))}
      allowTrash={allowTrash}
      onSelect={move}
      onClose={onClose}
    />
  );
}

export function TaskPlaceSheet({
  tasks,
  onSelect,
  onClose,
  allowTrash = true,
}: TaskPlaceSheetProps) {
  const keys = new Set(tasks.map(destinationKey));
  const current = keys.size === 1 ? [...keys][0] : null;
  const sections = useTaskDestinations(allowTrash);
  const { messages } = useI18n();

  return (
    <DestinationSheet
      title={messages.move.title}
      backLabel={messages.common.back}
      sections={sections}
      current={current}
      onSelect={(key) => onSelect(toDestination(key))}
      onClose={onClose}
    />
  );
}
