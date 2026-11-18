import { useState } from 'react';
import { useI18n } from '@shared/i18n';
import { useData } from '@shared/storage';
import { SaveButton } from '@shared/ui/SaveButton';
import { Sheet, SheetBody, SheetHeader } from '@shared/ui/Sheet';
import { TimeWheels } from '@shared/ui/TimeWheels';
import type { AlertOption } from '../model/alerts';
import { dayPeriods } from '../model/time';
import { CheckOptions } from './CheckOptions';

export type AlertDraft<T extends string> = {
  choice: T;
  hour: number;
  minute: number;
};

type AlertSheetProps<T extends string> = {
  title: string;
  options: AlertOption<T>[];
  saved: AlertDraft<T>;
  onSave: (draft: AlertDraft<T>) => void;
  onClose: () => void;
};

export function AlertSheet<T extends string>({
  title,
  options,
  saved,
  onSave,
  onClose,
}: AlertSheetProps<T>) {
  const { messages, locale } = useI18n();
  const hours24 = useData((data) => data.settings.timeFormat === '24h');
  const [draft, setDraft] = useState(saved);
  const m = messages.settings;
  const changed =
    draft.choice !== saved.choice ||
    draft.hour !== saved.hour ||
    draft.minute !== saved.minute;

  return (
    <Sheet label={title} onClose={onClose}>
      <SheetHeader
        title={title}
        onBack={onClose}
        backLabel={messages.common.back}
        end={
          <SaveButton disabled={!changed} onClick={() => onSave(draft)}>
            {messages.common.save}
          </SaveButton>
        }
      />
      <SheetBody>
        <CheckOptions
          label={title}
          options={options}
          value={draft.choice}
          onChange={(choice) => setDraft((current) => ({ ...current, choice }))}
        />
        <TimeWheels
          hour={draft.hour}
          minute={draft.minute}
          hours24={hours24}
          labels={{
            time: m.time,
            hour: m.hour,
            minute: m.minute,
            period: m.period,
            periods: dayPeriods(locale),
          }}
          onChange={(hour, minute) =>
            setDraft((current) => ({ ...current, hour, minute }))
          }
        />
      </SheetBody>
    </Sheet>
  );
}
