import { useState } from 'react';
import { DateDialog } from '@features/set-due-date';
import { formatDate, useI18n } from '@shared/i18n';
import { addDays, todayIso } from '@shared/lib';
import { isInFocus } from '@shared/storage';
import type { Task } from '@shared/storage';
import { Dialog, TextButton } from '@shared/ui/Dialog';
import { PlaceIcon } from '@shared/ui/PlaceIcon';
import type { Place } from '@shared/ui/PlaceIcon';

type TaskPlaceRowProps = {
  task: Task;
  onMove: () => void;
  onChange: (fields: Partial<Task>) => void;
};

function placeOf(task: Task, today: string): Place {
  if (task.trashed) return 'trash';
  if (task.logged) return 'logbook';
  if (isInFocus(task, today)) return 'focus';
  return task.state;
}

export function TaskPlaceRow({ task, onMove, onChange }: TaskPlaceRowProps) {
  const { locale, messages } = useI18n();
  const [open, setOpen] = useState<'date' | 'contact' | null>(null);
  const today = todayIso();
  const place = placeOf(task, today);
  const start = task.start ?? addDays(today, 1);
  const labels: Partial<Record<Place, string>> = {
    scheduled: messages.task.scheduledFor('').trim(),
    waiting: messages.editor.waitingFor,
  };

  return (
    <div className="flex min-h-14 items-center border-t border-line pr-2">
      <button
        type="button"
        onClick={onMove}
        className="flex min-h-14 flex-1 cursor-pointer items-center gap-4 pl-4 text-left text-lg"
      >
        <PlaceIcon place={place} />
        {labels[place] ?? messages.places[place].title}
      </button>
      {place === 'scheduled' && (
        <button
          type="button"
          onClick={() => setOpen('date')}
          className="min-h-11 cursor-pointer pl-1.5 text-lg text-scheduled"
        >
          {formatDate(start, locale)}
        </button>
      )}
      {place === 'waiting' && (
        <button
          type="button"
          onClick={() => setOpen('contact')}
          className="min-h-11 cursor-pointer pl-1.5 text-lg text-scheduled"
        >
          {task.waitingFor || messages.task.someone}
        </button>
      )}
      {open === 'date' && (
        <DateDialog
          title={messages.editor.startDate}
          value={start}
          clearable={false}
          onClose={() => setOpen(null)}
          onSave={(value) => {
            onChange({ start: value });
            setOpen(null);
          }}
        />
      )}
      {open === 'contact' && (
        <ContactDialog
          value={task.waitingFor}
          onClose={() => setOpen(null)}
          onSave={(waitingFor) => {
            onChange({ waitingFor });
            setOpen(null);
          }}
        />
      )}
    </div>
  );
}

export function ContactDialog({
  value,
  onSave,
  onClose,
}: {
  value: string;
  onSave: (value: string) => void;
  onClose: () => void;
}) {
  const { messages } = useI18n();
  const [text, setText] = useState(value);

  return (
    <Dialog
      title={messages.editor.waitingFor}
      onClose={onClose}
      actions={
        <>
          <TextButton onClick={onClose}>{messages.common.cancel}</TextButton>
          <TextButton
            disabled={text.trim() === value}
            onClick={() => onSave(text.trim())}
          >
            {messages.common.save}
          </TextButton>
        </>
      }
    >
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={messages.editor.contactPlaceholder}
        aria-label={messages.editor.contact}
        data-autofocus
        className="mb-4 min-h-11 w-full rounded-[10px] border-[1.5px] border-line bg-surface px-3 text-[17px]"
      />
    </Dialog>
  );
}
