import type { Messages } from '@shared/i18n';
import { askConfirm, useUiState } from '@shared/model';
import { changeData, deleteTasks, moveTasks } from '@shared/storage';

export function trashTasks(
  ids: string[],
  messages: Messages,
  onDone?: () => void,
) {
  askConfirm({
    title: messages.editor.trashTitle,
    confirm: messages.editor.trash,
    danger: true,
    onConfirm: () => {
      changeData((data) => moveTasks(data, ids, { kind: 'trash' }));
      onDone?.();
    },
  });
}

export function deleteTasksForever(
  ids: string[],
  messages: Messages,
  onDone?: () => void,
) {
  askConfirm({
    title: messages.editor.deleteTitle,
    text: messages.trash.deleteText(ids.length),
    confirm: messages.editor.delete,
    danger: true,
    onConfirm: () => {
      changeData((data) => deleteTasks(data, ids));
      onDone?.();
    },
  });
}

export function confirmEmptyTrash(messages: Messages, keys: string[]) {
  askConfirm({
    title: messages.trash.emptyTitle,
    text: messages.trash.emptyText,
    confirm: messages.common.ok,
    danger: true,
    onConfirm: () => useUiState.getState().clearTrash(keys),
  });
}
