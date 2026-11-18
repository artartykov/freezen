import { Outlet } from '@tanstack/react-router';
import { useI18n } from '@shared/i18n';
import { ConfirmHost } from '@shared/ui/ConfirmHost';

export function RootLayout() {
  const { messages } = useI18n();

  return (
    <>
      <Outlet />
      <ConfirmHost cancelLabel={messages.common.cancel} />
    </>
  );
}
