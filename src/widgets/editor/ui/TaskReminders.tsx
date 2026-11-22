import { Bell, BellRing, Repeat as RepeatIcon } from 'lucide-react';
import { useI18n } from '@shared/i18n';
import type { Repeat, Task } from '@shared/storage';
import { formatReminder } from '../lib/reminder';
import { PropertyRow } from './PropertyRow';
import { RemindSheet } from './RemindSheet';
import { RepeatSheet } from './RepeatSheet';

export type ReminderSheet = 'remind' | 'repeat';

type TaskRemindersProps = {
  task: Task;
  sheet: ReminderSheet | null;
  onSheet: (sheet: ReminderSheet | null) => void;
  onChange: (fields: Partial<Task>) => void;
};

export function TaskReminders({
  task,
  sheet,
  onSheet,
  onChange,
}: TaskRemindersProps) {
  const { locale, messages } = useI18n();

  function remind(remindAt: string | null) {
    onChange({ remindAt });
    onSheet(null);
  }

  function repeat(value: Repeat | null) {
    onChange({ repeat: value });
    onSheet(null);
  }

  return (
    <>
      <PropertyRow
        icon={
          task.remindAt ? (
            <BellRing aria-hidden="true" />
          ) : (
            <Bell aria-hidden="true" />
          )
        }
        empty={!task.remindAt}
        onOpen={() => onSheet('remind')}
      >
        {task.remindAt ? (
          messages.remind.scheduled(formatReminder(task.remindAt, locale))
        ) : (
          <span className="text-muted">{messages.remind.title}</span>
        )}
      </PropertyRow>
      <PropertyRow
        icon={<RepeatIcon aria-hidden="true" />}
        empty={!task.repeat}
        onOpen={() => onSheet('repeat')}
      >
        {task.repeat ? (
          messages.repeat[task.repeat]
        ) : (
          <span className="text-muted">{messages.repeat.title}</span>
        )}
      </PropertyRow>
      {sheet === 'remind' && (
        <RemindSheet
          value={task.remindAt}
          onChange={remind}
          onClose={() => onSheet(null)}
        />
      )}
      {sheet === 'repeat' && (
        <RepeatSheet
          value={task.repeat}
          onChange={repeat}
          onClose={() => onSheet(null)}
        />
      )}
    </>
  );
}
