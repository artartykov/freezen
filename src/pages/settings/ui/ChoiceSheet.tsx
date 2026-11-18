import { useI18n } from '@shared/i18n';
import type { Settings } from '@shared/storage';
import { OptionList } from '@shared/ui/OptionList';
import { Sheet, SheetBody, SheetHeader } from '@shared/ui/Sheet';
import type { Choice } from '../model/choices';

type ChoiceSheetProps = {
  choice: Choice;
  settings: Settings;
  onChange: (value: string | boolean) => void;
  onClose: () => void;
};

export function ChoiceSheet({
  choice,
  settings,
  onChange,
  onClose,
}: ChoiceSheetProps) {
  const { messages } = useI18n();

  return (
    <Sheet label={choice.title} onClose={onClose}>
      <SheetHeader
        title={choice.title}
        onBack={onClose}
        backLabel={messages.common.back}
      />
      <SheetBody>
        {choice.tip && (
          <p className="mx-2 mt-2 mb-3 text-[15px] text-muted">{choice.tip}</p>
        )}
        <OptionList
          label={choice.title}
          value={settings[choice.key]}
          options={choice.options}
          onChange={onChange}
        />
      </SheetBody>
    </Sheet>
  );
}
