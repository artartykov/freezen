import { useI18n } from '@shared/i18n';
import { useData } from '@shared/storage';
import { Sheet, SheetBody, SheetHeader } from '@shared/ui/Sheet';
import { Switch } from '@shared/ui/Switch';
import { saveSettings } from '../model/apply';

export function CalendarSheet({ onClose }: { onClose: () => void }) {
  const { messages } = useI18n();
  const checked = useData((data) => data.settings.showCalendarEvents);
  const m = messages.settings;

  return (
    <Sheet label={m.calendarEvents} onClose={onClose}>
      <SheetHeader
        title={m.calendarEvents}
        onBack={onClose}
        backLabel={messages.common.back}
      />
      <SheetBody>
        <Switch
          label={m.showCalendarEvents}
          checked={checked}
          onChange={(showCalendarEvents) =>
            saveSettings({ showCalendarEvents })
          }
        />
        <p className="mx-2 mt-2 mb-3 text-[15px] text-muted">{m.calendarTip}</p>
      </SheetBody>
    </Sheet>
  );
}
