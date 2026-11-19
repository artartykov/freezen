import { Outlet } from '@tanstack/react-router';
import { VoiceCaptureHost } from '@features/create-task';
import { useI18n } from '@shared/i18n';
import { AppUpdateHost } from '@shared/ui/AppUpdateHost';
import { ConfirmHost } from '@shared/ui/ConfirmHost';

export function RootLayout() {
  const { messages } = useI18n();

  return (
    <>
      <Outlet />
      <VoiceCaptureHost />
      <AppUpdateHost />
      <ConfirmHost cancelLabel={messages.common.cancel} />
    </>
  );
}
