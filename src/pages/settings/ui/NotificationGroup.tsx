import { Bell, ClipboardCheck } from 'lucide-react';
import { useI18n } from '@shared/i18n';
import { useData } from '@shared/storage';
import { nudgeLabel, reviewLabel } from '../model/alerts';
import type { SettingsSheet } from '../model/sheet';
import { Row, SettingsGroup } from './SettingsParts';

export function NotificationGroup({
  onOpen,
}: {
  onOpen: (sheet: SettingsSheet) => void;
}) {
  const { messages, locale } = useI18n();
  const settings = useData((data) => data.settings);
  const m = messages.settings;

  return (
    <SettingsGroup title={m.notifications}>
      <Row
        icon={<Bell />}
        hue="bg-waiting"
        title={m.dailyNudge}
        value={nudgeLabel(settings, messages, locale)}
        disabled
        onClick={() => onOpen('nudge')}
      />
      <Row
        icon={<ClipboardCheck />}
        hue="bg-someday"
        title={m.weeklyReview}
        value={reviewLabel(settings, messages, locale)}
        disabled
        onClick={() => onOpen('review')}
      />
    </SettingsGroup>
  );
}
