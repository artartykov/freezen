import type { Messages } from '@shared/i18n';
import { askConfirm } from '@shared/model';
import {
  changeData,
  deleteReference,
  restoreReference,
  trashReference,
} from '@shared/storage';

export function moveReferencesToTrash(ids: string[]) {
  changeData((data) =>
    ids.reduce((current, id) => trashReference(current, id), data),
  );
}

export function trashReferences(
  ids: string[],
  messages: Messages,
  onDone?: () => void,
) {
  askConfirm({
    title: messages.editor.trashTitle,
    text: messages.trash.listsText(ids.length),
    confirm: messages.editor.trash,
    danger: true,
    onConfirm: () => {
      moveReferencesToTrash(ids);
      onDone?.();
    },
  });
}

export function restoreReferenceFromTrash(id: string) {
  changeData((data) => restoreReference(data, id));
}

export function deleteReferenceForever(
  id: string,
  messages: Messages,
  onDone?: () => void,
) {
  askConfirm({
    title: messages.editor.deleteTitle,
    text: messages.editor.deleteReferenceText,
    confirm: messages.editor.delete,
    danger: true,
    onConfirm: () => {
      changeData((data) => deleteReference(data, id));
      onDone?.();
    },
  });
}
