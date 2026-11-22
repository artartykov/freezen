import { RotateCcw } from 'lucide-react';
import { useI18n } from '@shared/i18n';
import { useUiState } from '@shared/model';
import {
  changeData,
  moveTasks,
  restoreProject,
  restoreReference,
  trashContents,
} from '@shared/storage';
import { DestinationSheet } from '@shared/ui/DestinationSheet';

type RestoreTrashSheetProps = {
  ids: string[];
  onClose: () => void;
  onRestored?: () => void;
};

export function RestoreTrashSheet({
  ids,
  onClose,
  onRestored,
}: RestoreTrashSheetProps) {
  const { messages } = useI18n();

  function restore() {
    const selected = new Set(ids);
    const { clearedTrash } = useUiState.getState();
    changeData((data) => {
      const { tasks, projects, references } = trashContents(data, clearedTrash);
      let restored = moveTasks(
        data,
        tasks.filter(({ id }) => selected.has(id)).map(({ id }) => id),
        { kind: 'inbox' },
      );
      for (const { id } of projects) {
        if (selected.has(id)) restored = restoreProject(restored, id);
      }
      for (const { id } of references) {
        if (selected.has(id)) restored = restoreReference(restored, id);
      }
      return restored;
    });
    onClose();
    onRestored?.();
  }

  return (
    <DestinationSheet
      title={messages.move.title}
      backLabel={messages.common.back}
      current={null}
      sections={[
        {
          key: 'restore',
          destinations: [
            {
              key: 'restore',
              label: messages.editor.restore,
              icon: <RotateCcw aria-hidden="true" />,
            },
          ],
        },
      ]}
      onSelect={restore}
      onClose={onClose}
    />
  );
}
