import type { Messages } from '@shared/i18n';
import { askConfirm, useUiState } from '@shared/model';
import {
  changeData,
  getData,
  moveTasks,
  trashedTaskKeys,
} from '@shared/storage';

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

export function clearTasksFromTrash(
  ids: string[],
  messages: Messages,
  onDone?: () => void,
) {
  const keys = trashedTaskKeys(getData(), ids);
  confirmClearTrash(
    keys,
    messages,
    messages.trash.deleteText(keys.length),
    onDone,
  );
}

export function clearTrashEntries(
  keys: string[],
  messages: Messages,
  onDone: () => void,
) {
  confirmClearTrash(keys, messages, messages.trash.deleteEntriesText, onDone);
}

function confirmClearTrash(
  keys: string[],
  messages: Messages,
  text: string,
  onDone?: () => void,
) {
  askConfirm({
    title: messages.trash.deleteTitle,
    text,
    confirm: messages.editor.delete,
    danger: true,
    onConfirm: () => {
      useUiState.getState().clearTrash(keys);
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
