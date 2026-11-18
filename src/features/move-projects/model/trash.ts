import type { Messages } from '@shared/i18n';
import { askConfirm } from '@shared/model';
import {
  changeData,
  deleteProject,
  restoreProject,
  trashProject,
} from '@shared/storage';

export function moveProjectsToTrash(ids: string[]) {
  changeData((data) =>
    ids.reduce((current, id) => trashProject(current, id), data),
  );
}

export function trashProjects(
  ids: string[],
  messages: Messages,
  onDone?: () => void,
) {
  askConfirm({
    title: messages.editor.trashTitle,
    text: messages.trash.projectsText(ids.length),
    confirm: messages.editor.trash,
    danger: true,
    onConfirm: () => {
      moveProjectsToTrash(ids);
      onDone?.();
    },
  });
}

export function restoreProjectFromTrash(id: string) {
  changeData((data) => restoreProject(data, id));
}

export function deleteProjectForever(
  id: string,
  messages: Messages,
  onDone?: () => void,
) {
  askConfirm({
    title: messages.editor.deleteTitle,
    text: messages.editor.deleteProjectText,
    confirm: messages.editor.delete,
    danger: true,
    onConfirm: () => {
      changeData((data) => deleteProject(data, id));
      onDone?.();
    },
  });
}
