import {
  Calendar,
  CalendarDays,
  CalendarRange,
  Clock,
  Globe,
  Paperclip,
  Tag,
} from 'lucide-react';
import { useI18n } from '@shared/i18n';
import { useData } from '@shared/storage';
import { settingsChoices } from '../model/choices';
import type { Choice } from '../model/choices';
import type { SettingsSheet } from '../model/sheet';
import { ChoiceRow, Row, SettingsGroup } from './SettingsParts';

export function ManageGroup({
  onOpen,
}: {
  onOpen: (sheet: SettingsSheet) => void;
}) {
  const { messages } = useI18n();
  const showCalendarEvents = useData(
    (data) => data.settings.showCalendarEvents,
  );
  const m = messages.settings;

  return (
    <SettingsGroup title={m.manage}>
      <Row
        icon={<Tag />}
        hue="bg-scheduled"
        title={messages.tags.manage}
        onClick={() => onOpen('tags')}
      />
      <Row
        icon={<Paperclip />}
        hue="bg-someday"
        title={m.attachments}
        disabled
      />
      <Row
        icon={<CalendarDays />}
        hue="bg-next"
        title={m.showCalendarEvents}
        value={showCalendarEvents ? m.on : m.off}
        disabled
        onClick={() => onOpen('calendar')}
      />
    </SettingsGroup>
  );
}

export function LanguageGroup({
  onChoose,
}: {
  onChoose: (choice: Choice) => void;
}) {
  const { messages } = useI18n();
  const settings = useData((data) => data.settings);
  const choices = settingsChoices(messages);
  const shared = { settings, onChoose, hue: 'bg-scheduled' };

  return (
    <SettingsGroup title={messages.settings.languageRegion}>
      <ChoiceRow {...shared} choice={choices.language} icon={<Globe />} />
      <ChoiceRow {...shared} choice={choices.dateFormat} icon={<Calendar />} />
      <ChoiceRow {...shared} choice={choices.timeFormat} icon={<Clock />} />
      <ChoiceRow
        {...shared}
        choice={choices.weekStart}
        icon={<CalendarRange />}
      />
    </SettingsGroup>
  );
}
