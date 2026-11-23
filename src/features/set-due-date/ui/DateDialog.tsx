import { useRef, useState } from 'react';
import { formatWeekday, useI18n } from '@shared/i18n';
import { useData } from '@shared/storage';
import { Calendar } from '@shared/ui/Calendar';
import type { CalendarHandle } from '@shared/ui/Calendar';
import { Dialog, TextButton } from '@shared/ui/Dialog';

type DateDialogProps = {
  title: string;
  value: string | null;
  onSave: (iso: string | null) => void;
  onClose: () => void;
  clearable?: boolean;
};

export function DateDialog({
  title,
  value,
  onSave,
  onClose,
  clearable = true,
}: DateDialogProps) {
  const { locale, messages } = useI18n();
  const [selected, setSelected] = useState(value);
  const calendar = useRef<CalendarHandle>(null);
  const weekStart = useData((data) => data.settings.weekStart);

  return (
    <Dialog
      kicker
      title={title}
      onClose={onClose}
      onEscape={() => {
        if (!calendar.current?.dismissPicker()) onClose();
      }}
      actions={
        <>
          {clearable && value && (
            <TextButton danger onClick={() => onSave(null)}>
              {messages.calendar.clear}
            </TextButton>
          )}
          <TextButton onClick={onClose}>{messages.common.cancel}</TextButton>
          <TextButton disabled={!selected} onClick={() => onSave(selected)}>
            {messages.common.ok}
          </TextButton>
        </>
      }
    >
      <p
        className="mx-1 my-[18px] min-h-10 text-[32px] leading-10 font-medium"
        aria-live="polite"
      >
        {selected ? formatWeekday(selected, locale) : '——'}
      </p>
      <Calendar
        ref={calendar}
        value={selected}
        onChange={setSelected}
        locale={locale}
        yearLabel={messages.calendar.chooseYear}
        monthLabel={messages.calendar.chooseMonth}
        yearsLabel={messages.calendar.years}
        monthsLabel={messages.calendar.months}
        weekStart={weekStart}
      />
    </Dialog>
  );
}
