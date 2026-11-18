import { useState } from 'react';
import { useI18n } from '@shared/i18n';
import { formatTime, reminderPresets, reminderTime } from '../lib/reminder';
import { ChoiceSheet } from './Properties';

type RemindSheetProps = {
  value: string | null;
  onChange: (remindAt: string | null) => void;
  onClose: () => void;
};

export function RemindSheet({ value, onChange, onClose }: RemindSheetProps) {
  const { locale, messages } = useI18n();
  const [now] = useState(() => new Date());
  const presets = reminderPresets.map((preset) => {
    const time = reminderTime(preset, now);
    return {
      value: time.toISOString(),
      label:
        preset === 'inThreeHours'
          ? messages.remind[preset]
          : `${messages.remind[preset]} (${formatTime(time, locale)})`,
    };
  });

  return (
    <ChoiceSheet
      title={messages.remind.title}
      value={value}
      options={[{ value: null, label: messages.common.none }, ...presets]}
      onChange={onChange}
      onClose={onClose}
    />
  );
}
