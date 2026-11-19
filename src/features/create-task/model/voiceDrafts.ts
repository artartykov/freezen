import { createTask } from '@shared/storage';
import type { Task } from '@shared/storage';
import type { ParsedTask } from '@shared/platform';

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export function draftTasks(parsed: ParsedTask[]): Task[] {
  return parsed
    .filter((task) => task.title.trim() !== '')
    .map((task) =>
      createTask({
        title: task.title.trim(),
        due: task.due && isoDate.test(task.due) ? task.due : null,
        minutes: task.minutes,
        energy: task.energy,
      }),
    );
}

export function fallbackTasks(text: string): Task[] {
  const title = text.trim();
  return title ? [createTask({ title })] : [];
}
