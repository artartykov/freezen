import { useState } from 'react';
import type { ComponentType } from 'react';
import { useI18n } from '@shared/i18n';
import { useUiState } from '@shared/model';
import { changeData, moveTasks, useData, assignArea } from '@shared/storage';
import type { Destination, Task } from '@shared/storage';
import { DestinationSheet } from '@shared/ui/DestinationSheet';
import { SaveButton } from '@shared/ui/SaveButton';
import {
  destinationKey,
  toDestination,
  useTaskDestinations,
} from '../model/destinations';

type WaitingContactPicker = ComponentType<{
  value?: string | null;
  hasLegacyName: boolean;
  onSelect: (id: string | null) => void;
  onClose: () => void;
}>;

type TaskPlaceSheetProps = {
  tasks: Task[];
  onSelect: (destination: Destination) => void;
  onClose: () => void;
  allowTrash?: boolean;
  waitingContactPicker?: WaitingContactPicker;
};

type MoveSheetProps = {
  taskIds: string[];
  onClose: () => void;
  onMoved?: () => void;
  allowTrash?: boolean;
  waitingContactPicker?: WaitingContactPicker;
};

export function MoveSheet({
  taskIds,
  onClose,
  onMoved,
  allowTrash = true,
  waitingContactPicker,
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
      waitingContactPicker={waitingContactPicker}
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
  waitingContactPicker: ContactPicker,
}: TaskPlaceSheetProps) {
  const keys = new Set(tasks.map(destinationKey));
  const current = keys.size === 1 ? [...keys][0] : null;
  const sections = useTaskDestinations(allowTrash);
  const { messages } = useI18n();
  const tags = useData((data) => data.tags);
  const [waiting, setWaiting] = useState<{ id?: string | null } | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const task = tasks.length === 1 ? tasks[0] : undefined;

  function select(key: string) {
    if (key === 'waiting' && ContactPicker) {
      setWaiting((pending) => pending ?? {});
      setContactOpen(true);
    } else {
      onSelect(toDestination(key));
    }
  }

  function saveWaiting() {
    const id = waiting?.id;
    const waitingContactId =
      id && !tags.some((tag) => tag.id === id && tag.type === 'contact')
        ? null
        : id;
    onSelect({ kind: 'state', state: 'waiting', waitingContactId });
  }

  return (
    <DestinationSheet
      title={messages.move.title}
      backLabel={messages.common.back}
      sections={sections}
      current={waiting ? 'waiting' : current}
      selectCurrent={ContactPicker ? 'waiting' : undefined}
      headerEnd={
        waiting && (
          <SaveButton onClick={saveWaiting}>{messages.common.save}</SaveButton>
        )
      }
      onSelect={select}
      onClose={onClose}
    >
      {contactOpen && ContactPicker && (
        <ContactPicker
          value={
            waiting?.id === undefined ? task?.waitingContactId : waiting.id
          }
          hasLegacyName={waiting?.id === undefined && Boolean(task?.waitingFor)}
          onSelect={(id) => {
            setWaiting({ id });
            setContactOpen(false);
          }}
          onClose={() => setContactOpen(false)}
        />
      )}
    </DestinationSheet>
  );
}
