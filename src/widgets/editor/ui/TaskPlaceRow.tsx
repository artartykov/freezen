import { useState } from 'react';
import { WaitingContactSheet } from '@features/manage-tags';
import { DateDialog } from '@features/set-due-date';
import { formatDate, useI18n } from '@shared/i18n';
import { addDays, todayIso } from '@shared/lib';
import { isInFocus, useData, waitingContactName } from '@shared/storage';
import type { Task } from '@shared/storage';
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
  const contactName = useData((data) => waitingContactName(task, data.tags));
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
        className={`flex min-h-14 cursor-pointer items-center gap-4 pl-4 text-left text-lg ${place === 'waiting' ? 'shrink-0' : 'flex-1'}`}
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
          className="min-h-11 min-w-0 cursor-pointer truncate pl-1.5 text-left text-lg text-focus-ring"
        >
          {contactName || messages.task.someone}
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
        <WaitingContactSheet
          value={task.waitingContactId}
          hasLegacyName={Boolean(task.waitingFor)}
          onClose={() => setOpen(null)}
          onSelect={(waitingContactId) => {
            onChange({ waitingContactId, waitingFor: '' });
            setOpen(null);
          }}
        />
      )}
    </div>
  );
}
