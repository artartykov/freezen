import {
  Calendar,
  CalendarDays,
  CalendarRange,
  Clock,
  Globe,
  Tag,
} from 'lucide-react';
import { useI18n } from '@shared/i18n';
import { useData } from '@shared/storage';
import { settingsChoices } from '../model/choices';
import type { Choice } from '../model/choices';
import type { SettingsSheet } from '../model/sheet';
import { ChoiceRow, Row, SettingsGroup } from './SettingsParts';

type GeneralGroupsProps = {
  onChoose: (choice: Choice) => void;
  onOpen: (sheet: SettingsSheet) => void;
};

export function GeneralGroups({ onChoose, onOpen }: GeneralGroupsProps) {
  const { messages } = useI18n();
  const settings = useData((data) => data.settings);
  const choices = settingsChoices(messages);
  const m = messages.settings;
  const shared = { settings, onChoose, hue: 'bg-scheduled' };

  return (
    <>
      <SettingsGroup>
        <ChoiceRow {...shared} choice={choices.language} icon={<Globe />} />
      </SettingsGroup>
      <SettingsGroup title={m.calendarsDates}>
        <Row
          icon={<CalendarDays />}
          hue="bg-next"
          title={m.showCalendarEvents}
          value={settings.showCalendarEvents ? m.on : m.off}
          onClick={() => onOpen('calendar')}
        />
        <ChoiceRow
          {...shared}
          choice={choices.dateFormat}
          icon={<Calendar />}
        />
        <ChoiceRow {...shared} choice={choices.timeFormat} icon={<Clock />} />
        <ChoiceRow
          {...shared}
          choice={choices.weekStart}
          icon={<CalendarRange />}
        />
      </SettingsGroup>
      <SettingsGroup title={m.tags}>
        <Row
          icon={<Tag />}
          hue="bg-scheduled"
          title={messages.tags.manage}
          onClick={() => onOpen('tags')}
        />
      </SettingsGroup>
    </>
  );
}
