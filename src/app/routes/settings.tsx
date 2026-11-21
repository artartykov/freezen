import { createFileRoute } from '@tanstack/react-router';
import { parseSyncView, SettingsPage } from '@pages/settings';

export const Route = createFileRoute('/settings')({
  validateSearch: (search) => {
    const sync = parseSyncView(search.sync);
    return sync ? { sync } : {};
  },
  component: SettingsPage,
});
