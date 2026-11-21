import { useNavigate, useRouter } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '@shared/i18n';
import { useData } from '@shared/storage';
import { applySetting } from '../model/apply';
import type { Choice } from '../model/choices';
import type { SettingsSheet } from '../model/sheet';
import { ChoiceSheet } from './ChoiceSheet';
import { GeneralGroups } from './GeneralGroups';
import { MaintenanceGroups } from './MaintenanceGroups';
import { NotificationGroup } from './NotificationGroup';
import { PreferenceGroups } from './PreferenceGroups';
import { SettingsSheets } from './SettingsSheets';
import { SyncGroup } from './SyncGroup';

export function SettingsPage() {
  const { messages } = useI18n();
  const router = useRouter();
  const navigate = useNavigate();
  const settings = useData((data) => data.settings);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [sheet, setSheet] = useState<SettingsSheet | null>(null);

  function back() {
    if (router.history.canGoBack()) router.history.back();
    else void navigate({ to: '/focus' });
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[440px] pt-[calc(12px+env(safe-area-inset-top))] pb-8">
      <div className="-mx-2 flex min-h-[60px] items-center gap-2">
        <button
          type="button"
          aria-label={messages.common.back}
          onClick={back}
          className="grid size-11 cursor-pointer place-items-center rounded-xl"
        >
          <ArrowLeft className="size-6" aria-hidden="true" />
        </button>
        <h1 className="flex-1 text-[30px] leading-[30px] font-medium">
          {messages.places.settings.title}
        </h1>
      </div>
      <GeneralGroups onChoose={setChoice} onOpen={setSheet} />
      <PreferenceGroups onChoose={setChoice} />
      <NotificationGroup onOpen={setSheet} />
      <SyncGroup />
      <MaintenanceGroups onAbout={() => setSheet('about')} />
      {choice && (
        <ChoiceSheet
          choice={choice}
          settings={settings}
          onClose={() => setChoice(null)}
          onChange={(value) => {
            setChoice(null);
            applySetting(choice.key, value, messages);
          }}
        />
      )}
      {sheet && <SettingsSheets sheet={sheet} onClose={() => setSheet(null)} />}
    </main>
  );
}
