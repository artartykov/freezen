import { TaskCheck } from '@entities/task';
import { useI18n } from '@shared/i18n';
import type { Task } from '@shared/storage';
import { toggleTaskCompleted } from '../model/complete';

export function CompleteTaskButton({ task }: { task: Task }) {
  const { messages } = useI18n();
  const done = !!task.completedAt;

  return (
    <button
      type="button"
      aria-label={done ? messages.task.markNotDone : messages.task.markDone}
      aria-pressed={done}
      onClick={() => toggleTaskCompleted(task, messages)}
      className="grid size-11 flex-none cursor-pointer place-items-center rounded-xl focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
    >
      <TaskCheck done={done} />
    </button>
  );
}
