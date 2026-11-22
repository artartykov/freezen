import { useState } from 'react';
import { WaitingContactSheet } from '@features/manage-tags';
import { DateDialog } from '@features/set-due-date';
import { formatDate, useI18n } from '@shared/i18n';
import { addDays, todayIso } from '@shared/lib';
import { useData, waitingContactName } from '@shared/storage';
import type { Task } from '@shared/storage';
import { PlaceIcon } from '@shared/ui/PlaceIcon';

type TaskPlaceRowProps = {
  task: Task;
  onChange: (fields: Partial<Task>) => void;
};

export function TaskPlaceRow({ task, onChange }: TaskPlaceRowProps) {
  const { locale, messages } = useI18n();
  const [open, setOpen] = useState<'date' | 'contact' | null>(null);
  const contactName = useData((data) => waitingContactName(task, data.tags));
  const today = todayIso();
  const place = task.state;
  const start = task.start ?? addDays(today, 1);
  if (
    task.trashed ||
    task.logged ||
    (place !== 'scheduled' && place !== 'waiting')
  )
    return null;

  return (
    <div className="flex min-h-14 items-center pr-2">
      <button
        type="button"
        onClick={() => setOpen(place === 'scheduled' ? 'date' : 'contact')}
        className="flex min-h-14 min-w-0 flex-1 cursor-pointer items-center gap-4 pl-4 text-left text-lg"
      >
        <PlaceIcon place={place} />
        {place === 'scheduled' ? (
          <span className="text-scheduled">
            {messages.task.scheduledFor(formatDate(start, locale))}
          </span>
        ) : (
          <span>
            {messages.editor.waitingFor}{' '}
            <span className="text-focus-ring">
              {contactName || messages.task.someone}
            </span>
          </span>
        )}
      </button>
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
