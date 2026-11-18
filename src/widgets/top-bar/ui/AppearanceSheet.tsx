import { useI18n } from '@shared/i18n';
import { useUiState } from '@shared/model';
import type { Theme } from '@shared/model';
import { Sheet, SheetBody, SheetHeader } from '@shared/ui/Sheet';
import { Switch } from '@shared/ui/Switch';

const themes: Theme[] = ['light', 'dark', 'system'];

export function AppearanceSheet({ onClose }: { onClose: () => void }) {
  const { messages } = useI18n();
  const { theme, setTheme, largeText, setLargeText } = useUiState();

  return (
    <Sheet label={messages.appearance.title} onClose={onClose}>
      <SheetHeader
        title={messages.appearance.title}
        onBack={onClose}
        backLabel={messages.common.back}
      />
      <SheetBody>
        <div
          role="radiogroup"
          aria-label={messages.appearance.theme}
          className="mt-2 mb-5 flex overflow-hidden rounded-xl border-[1.5px] border-line"
        >
          {themes.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={theme === option}
              onClick={() => setTheme(option)}
              className="min-h-13 flex-1 cursor-pointer border-l-[1.5px] border-line font-medium first:border-l-0 aria-checked:bg-glow aria-checked:text-focus-ring focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-focus-ring"
            >
              {messages.appearance[option]}
            </button>
          ))}
        </div>
        <Switch
          label={messages.appearance.largerFont}
          checked={largeText}
          onChange={setLargeText}
        />
      </SheetBody>
    </Sheet>
  );
}
