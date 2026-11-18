import type { Messages } from '@shared/i18n';
import { askConfirm } from '@shared/model';
import { changeData, restoreTask, setTasksCompleted } from '@shared/storage';
import type { Task } from '@shared/storage';

export function toggleTaskCompleted(task: Task, messages: Messages) {
  if (task.logged && !task.trashed) {
    askConfirm({
      title: messages.logbook.restoreTitle,
      text: messages.logbook.restoreText,
      confirm: messages.logbook.restore,
      onConfirm: () => changeData((data) => restoreTask(data, task.id)),
    });
    return;
  }
  changeData((data) => setTasksCompleted(data, [task.id], !task.completedAt));
}

export function setCompleted(ids: string[], completed: boolean) {
  changeData((data) => setTasksCompleted(data, ids, completed));
}
