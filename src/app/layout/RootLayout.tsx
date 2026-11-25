import { Outlet } from '@tanstack/react-router';
import { Sidebar } from '@widgets/drawer';
import { useI18n } from '@shared/i18n';
import { AppUpdateHost } from '@shared/ui/AppUpdateHost';
import { ConfirmHost } from '@shared/ui/ConfirmHost';

export function RootLayout() {
  const { messages } = useI18n();

  return (
    <>
      <div className="app-layout">
        <Sidebar />
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
      <AppUpdateHost />
      <ConfirmHost cancelLabel={messages.common.cancel} />
    </>
  );
}
