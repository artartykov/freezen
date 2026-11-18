import { BellRing, CircleArrowOutUpRight, Repeat, Share2 } from 'lucide-react';
import { shareText } from '@features/import-export';
import type { Messages } from '@shared/i18n';
import { askConfirm } from '@shared/model';
import { changeData, convertTaskToProject, getData } from '@shared/storage';
import type { Task } from '@shared/storage';
import type { MenuEntry } from '@shared/ui/Menu';
import type { ReminderSheet } from './TaskReminders';

export function taskMenu(
  task: Task,
  messages: Messages,
  openProject: (projectId: string) => void,
  openSheet: (sheet: ReminderSheet) => void,
  isNew: boolean,
): MenuEntry[] {
  const reminders: MenuEntry[] = [
    {
      label: messages.remind.menu,
      icon: <BellRing />,
      onSelect: () => openSheet('remind'),
    },
    {
      label: messages.repeat.menu,
      icon: <Repeat />,
      onSelect: () => openSheet('repeat'),
    },
  ];
  if (isNew) return reminders;
  return [
    ...reminders,
    'separator',
    {
      label: messages.editor.convertToProject,
      icon: <CircleArrowOutUpRight />,
      onSelect: () =>
        askConfirm({
          title: messages.editor.convertTaskTitle,
          text: messages.editor.convertTaskText,
          confirm: messages.editor.convertToProject,
          onConfirm: () => {
            const result = convertTaskToProject(getData(), task.id);
            changeData(() => result.data);
            if (result.projectId) openProject(result.projectId);
          },
        }),
    },
    'separator',
    {
      label: messages.editor.share,
      icon: <Share2 />,
      onSelect: () =>
        shareText(task.note ? `${task.title}\n${task.note}` : task.title),
    },
  ];
}
