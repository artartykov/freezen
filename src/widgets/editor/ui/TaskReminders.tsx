import { BellRing, Repeat as RepeatIcon } from 'lucide-react';
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
      {task.remindAt && (
        <PropertyRow
          icon={<BellRing aria-hidden="true" />}
          clearLabel={messages.editor.clear(messages.remind.reminder)}
          onOpen={() => onSheet('remind')}
          onClear={() => onChange({ remindAt: null })}
        >
          {formatReminder(task.remindAt, locale)}
        </PropertyRow>
      )}
      {task.repeat && (
        <PropertyRow
          icon={<RepeatIcon aria-hidden="true" />}
          clearLabel={messages.editor.clear(messages.repeat.title)}
          onOpen={() => onSheet('repeat')}
          onClear={() => onChange({ repeat: null })}
        >
          {messages.repeat[task.repeat]}
        </PropertyRow>
      )}
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
