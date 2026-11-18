import type { Messages } from '@shared/i18n';
import { askConfirm } from '@shared/model';
import {
  changeData,
  getData,
  openTaskCount,
  setProjectCompleted,
} from '@shared/storage';
import type { Project } from '@shared/storage';

export function toggleProjectCompleted(project: Project, messages: Messages) {
  if (project.completedAt) {
    changeData((data) => setProjectCompleted(data, project.id, false));
    return;
  }
  const complete = () =>
    changeData((data) => setProjectCompleted(data, project.id, true));
  if (openTaskCount(getData(), project.id) === 0) {
    complete();
    return;
  }
  askConfirm({
    title: messages.project.completeTitle,
    text: messages.project.completeText,
    confirm: messages.common.ok,
    onConfirm: complete,
  });
}
