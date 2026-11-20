import { createTask } from '@shared/storage';
import type { Task, TaskState } from '@shared/storage';
import type { AiTaskState, TaskEvent } from '@shared/platform';

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export type DraftIds = Record<number, string>;

export type Drafts = { tasks: Task[]; ids: DraftIds };

export function toTaskState(state: AiTaskState): TaskState {
  return state === 'waiting' || state === 'someday' ? state : 'inbox';
}

function toDue(due: string | null | undefined) {
  return due && isoDate.test(due) ? due : null;
}

export function applyTaskEvents(drafts: Drafts, events: TaskEvent[]): Drafts {
  let { tasks, ids } = drafts;
  for (const event of events) {
    if (event.op === 'add') {
      const task = createTask({
        title: event.title.trim(),
        state: toTaskState(event.state),
        due: toDue(event.due),
      });
      tasks = [...tasks, task];
      ids = { ...ids, [event.id]: task.id };
    } else if (event.op === 'update') {
      const taskId = ids[event.id];
      tasks = tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              ...(event.title === undefined
                ? {}
                : { title: event.title.trim() }),
              ...(event.state === undefined
                ? {}
                : { state: toTaskState(event.state) }),
              ...(event.due === undefined ? {} : { due: toDue(event.due) }),
            }
          : task,
      );
    } else {
      const taskId = ids[event.id];
      tasks = tasks.filter((task) => task.id !== taskId);
    }
  }
  return { tasks, ids };
}

export function dialogIdOf(ids: DraftIds, taskId: string) {
  const entry = Object.entries(ids).find(([, id]) => id === taskId);
  return entry ? Number(entry[0]) : null;
}

export function fallbackTasks(text: string): Task[] {
  const title = text.trim();
  return title ? [createTask({ title })] : [];
}
