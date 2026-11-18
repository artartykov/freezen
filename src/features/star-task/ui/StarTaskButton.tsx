import { Star } from 'lucide-react';
import { useI18n } from '@shared/i18n';
import { askConfirm } from '@shared/model';
import {
  changeData,
  isDueLocked,
  isInFocus,
  setTasksStarred,
} from '@shared/storage';
import type { Task } from '@shared/storage';

type StarTaskButtonProps = {
  task: Task;
  today: string;
};

export function StarTaskButton({ task, today }: StarTaskButtonProps) {
  const { messages } = useI18n();
  const focused = isInFocus(task, today);
  const locked = isDueLocked(task, today);

  function toggle() {
    if (locked) {
      askConfirm({
        title: messages.task.cannotUnfocusTitle,
        text: messages.task.cannotUnfocusText,
        confirm: messages.common.ok,
        cancel: '',
        onConfirm: () => undefined,
      });
      return;
    }
    changeData((data) => setTasksStarred(data, [task.id], !focused));
  }

  return (
    <button
      type="button"
      aria-label={
        focused ? messages.task.removeFromFocus : messages.task.addToFocus
      }
      aria-pressed={focused}
      onClick={toggle}
      className="group grid size-11 flex-none cursor-pointer place-items-center rounded-xl text-muted aria-pressed:text-star focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
    >
      <Star
        className="size-[22px] group-aria-pressed:fill-current"
        strokeWidth={1.8}
        aria-hidden="true"
      />
    </button>
  );
}
