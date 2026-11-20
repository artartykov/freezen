import { ManageTagsSheet } from '@features/manage-tags';
import { useI18n } from '@shared/i18n';
import { useData } from '@shared/storage';
import { nudgeOptions, reviewOptions } from '../model/alerts';
import { saveSettings } from '../model/apply';
import type { SettingsSheet } from '../model/sheet';
import { AboutSheet } from './AboutSheet';
import { AiProviderSheet, AiVoiceSheet } from './AiSheets';
import { AlertSheet } from './AlertSheet';
import { CalendarSheet } from './CalendarSheet';

function NudgeSheet({ onClose }: { onClose: () => void }) {
  const { messages } = useI18n();
  const nudge = useData((data) => data.settings.dailyNudge);

  return (
    <AlertSheet
      title={messages.settings.dailyNudge}
      options={nudgeOptions(messages)}
      saved={{ choice: nudge.mode, hour: nudge.hour, minute: nudge.minute }}
      onClose={onClose}
      onSave={({ choice, hour, minute }) => {
        saveSettings({ dailyNudge: { mode: choice, hour, minute } });
        onClose();
      }}
    />
  );
}

function ReviewSheet({ onClose }: { onClose: () => void }) {
  const { messages } = useI18n();
  const review = useData((data) => data.settings.weeklyReview);

  return (
    <AlertSheet
      title={messages.settings.weeklyReview}
      options={reviewOptions(messages)}
      saved={{ choice: review.day, hour: review.hour, minute: review.minute }}
      onClose={onClose}
      onSave={({ choice, hour, minute }) => {
        saveSettings({ weeklyReview: { day: choice, hour, minute } });
        onClose();
      }}
    />
  );
}

const SHEETS = {
  about: AboutSheet,
  tags: ManageTagsSheet,
  calendar: CalendarSheet,
  nudge: NudgeSheet,
  review: ReviewSheet,
  aiProvider: AiProviderSheet,
  aiVoice: AiVoiceSheet,
} satisfies Record<SettingsSheet, (props: { onClose: () => void }) => unknown>;

export function SettingsSheets({
  sheet,
  onClose,
}: {
  sheet: SettingsSheet;
  onClose: () => void;
}) {
  const Content = SHEETS[sheet];
  return <Content onClose={onClose} />;
}
