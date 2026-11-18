import type { Messages } from '@shared/i18n';
import { askConfirm } from '@shared/model';
import { changeData, logAllCompleted, logTasks } from '@shared/storage';

export function confirmLogCompleted(messages: Messages) {
  askConfirm({
    title: messages.logbook.logTitle,
    text: messages.logbook.logText,
    confirm: messages.logbook.logConfirm,
    danger: true,
    onConfirm: () => changeData(logAllCompleted),
  });
}

export function logSelected(ids: string[]) {
  changeData((data) => logTasks(data, ids));
}

export function hasLoggable(
  tasks: { completedAt: string | null; logged: boolean; trashed: boolean }[],
) {
  return tasks.some(
    (task) => task.completedAt && !task.logged && !task.trashed,
  );
}
