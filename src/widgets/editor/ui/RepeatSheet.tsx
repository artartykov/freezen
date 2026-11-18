import { useI18n } from '@shared/i18n';
import type { Repeat } from '@shared/storage';
import { ChoiceSheet } from './Properties';

const repeatOptions: Repeat[] = ['day', 'week', 'month', 'year'];

type RepeatSheetProps = {
  value: Repeat | null;
  onChange: (repeat: Repeat | null) => void;
  onClose: () => void;
};

export function RepeatSheet({ value, onChange, onClose }: RepeatSheetProps) {
  const { messages } = useI18n();

  return (
    <ChoiceSheet
      title={messages.repeat.title}
      value={value}
      options={[
        { value: null, label: messages.common.none },
        ...repeatOptions.map((repeat) => ({
          value: repeat,
          label: messages.repeat[repeat],
        })),
      ]}
      onChange={onChange}
      onClose={onClose}
    />
  );
}
