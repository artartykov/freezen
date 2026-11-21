import {
  inactiveProjects,
  logbookTasks,
  stateTasks,
  trashContents,
} from '@shared/storage';
import type { AppData } from '@shared/storage';

type Visible = (entity: {
  tagIds: string[];
  projectId?: string | null;
}) => boolean;

export function placeCount(
  data: AppData,
  place: string,
  today: string,
  visible: Visible,
  clearedTrash: readonly string[],
) {
  if (place === 'logbook')
    return logbookTasks(data, today).filter(visible).length;
  if (place === 'trash')
    return trashContents(data, clearedTrash).entries.length;
  if (place === 'inbox')
    return stateTasks(data, 'inbox', today).filter((task) => !task.completedAt)
      .length;
  if (
    place === 'next' ||
    place === 'later' ||
    place === 'scheduled' ||
    place === 'someday' ||
    place === 'waiting'
  ) {
    const tasks = stateTasks(data, place, today).filter(
      (task) => !task.completedAt && visible(task),
    ).length;
    const projects =
      place === 'next'
        ? 0
        : inactiveProjects(data, place, today).filter(visible).length;
    return tasks + projects;
  }
  return 0;
}
