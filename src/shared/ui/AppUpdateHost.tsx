import { useEffect } from 'react';
import { useI18n } from '@shared/i18n';
import {
  showAppUpdate,
  startAppUpdateCheck,
  useAppUpdates,
  useConfirm,
  useUiState,
} from '@shared/model';

export function AppUpdateHost() {
  const { messages } = useI18n();
  const version = useAppUpdates((state) => state.availableVersion);
  const activity = useAppUpdates((state) => state.activity);
  const request = useConfirm((state) => state.request);
  const lastPrompt = useUiState((state) => state.lastUpdatePrompt);

  useEffect(() => {
    void startAppUpdateCheck(messages);
  }, [messages]);

  useEffect(() => {
    if (version && version !== lastPrompt && !request && !activity) {
      showAppUpdate(version, messages);
    }
  }, [version, lastPrompt, request, activity, messages]);

  return activity === 'installing' ? (
    <p
      role="status"
      className="fixed inset-x-4 bottom-[calc(16px+env(safe-area-inset-bottom))] z-40 mx-auto w-fit rounded-2xl bg-card px-4 py-3 text-center shadow-lg"
    >
      {messages.appUpdates.preparing}
    </p>
  ) : null;
}
