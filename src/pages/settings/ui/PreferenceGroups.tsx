import {
  Bookmark,
  CheckCircle2,
  ClipboardList,
  Clock,
  Filter,
  FolderSync,
  Hash,
  NotebookText,
  PlusCircle,
  Tag,
  Timer,
} from 'lucide-react';
import { useI18n } from '@shared/i18n';
import { useData } from '@shared/storage';
import { settingsChoices } from '../model/choices';
import type { Choice } from '../model/choices';
import { ChoiceRow, SettingsGroup } from './SettingsParts';

export function PreferenceGroups({
  onChoose,
}: {
  onChoose: (choice: Choice) => void;
}) {
  const { messages } = useI18n();
  const settings = useData((data) => data.settings);
  const choices = settingsChoices(messages);
  const m = messages.settings;
  const todo = { settings, onChoose, hue: 'bg-waiting' };
  const workflow = { settings, onChoose, hue: 'bg-scheduled' };
  const sidebar = { settings, onChoose, hue: 'bg-star' };

  return (
    <>
      <SettingsGroup title={m.todos}>
        <ChoiceRow {...todo} choice={choices.newTasks} icon={<PlusCircle />} />
        <ChoiceRow
          {...todo}
          choice={choices.onCompletion}
          icon={<CheckCircle2 />}
        />
        <ChoiceRow
          {...todo}
          choice={choices.logCompleted}
          icon={<ClipboardList />}
        />
        <ChoiceRow
          {...todo}
          choice={choices.longNotes}
          icon={<NotebookText />}
        />
        <ChoiceRow {...todo} choice={choices.effortFormat} icon={<Timer />} />
      </SettingsGroup>
      <SettingsGroup title={m.workflow}>
        <ChoiceRow
          {...workflow}
          choice={choices.areaAssign}
          icon={<FolderSync />}
          value={settings.areaAssign ? m.automatic : m.manual}
        />
        <ChoiceRow
          {...workflow}
          choice={choices.areaIncludeUnassigned}
          icon={<Filter />}
          value={settings.areaIncludeUnassigned ? m.include : m.exclude}
        />
      </SettingsGroup>
      <SettingsGroup title={m.sidebar}>
        <ChoiceRow {...sidebar} choice={choices.counts} icon={<Hash />} />
        <ChoiceRow {...sidebar} choice={choices.showLater} icon={<Tag />} />
        <ChoiceRow {...sidebar} choice={choices.showWaiting} icon={<Clock />} />
        <ChoiceRow
          {...sidebar}
          choice={choices.showReference}
          icon={<Bookmark />}
        />
      </SettingsGroup>
    </>
  );
}
