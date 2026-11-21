import { useI18n } from '@shared/i18n';
import { Logo } from '@shared/ui/Logo';
import { Sheet, SheetBody, SheetHeader } from '@shared/ui/Sheet';
import { version } from '../../../../package.json';

export function AboutSheet({ onClose }: { onClose: () => void }) {
  const { messages } = useI18n();
  const m = messages.settings;

  return (
    <Sheet label={m.about} onClose={onClose}>
      <SheetHeader
        title={m.about}
        onBack={onClose}
        backLabel={messages.common.back}
      />
      <SheetBody>
        <div className="flex flex-col items-center pt-3 pb-5">
          <span className="grid size-21 place-items-center rounded-[22px] bg-surface">
            <Logo className="size-13 fill-accent" />
          </span>
          <p className="mt-4 text-[22px] font-medium">{m.version(version)}</p>
        </div>
        <p className="mx-2 mb-4 text-[17px]">{m.aboutText}</p>
        <p className="mx-2 mb-2 text-sm text-muted">{m.trademark}</p>
      </SheetBody>
    </Sheet>
  );
}
