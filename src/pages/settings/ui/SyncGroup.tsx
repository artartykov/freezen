import { useNavigate, useRouter, useSearch } from '@tanstack/react-router';
import { Keyboard, MonitorSmartphone, QrCode } from 'lucide-react';
import { useI18n } from '@shared/i18n';
import { useSyncStore } from '@shared/sync';
import type { SyncView } from '../model/syncView';
import { Row, SettingsGroup } from './SettingsParts';
import { SyncCodeEntry } from './SyncCodeEntry';
import { SyncDevices } from './SyncDevices';
import { SyncInvitation } from './SyncInvitation';

export function SyncGroup() {
  const { messages } = useI18n();
  const text = messages.sync;
  const deviceCount = useSyncStore((state) => state.devices.length);
  const view = useSearch({
    from: '/settings',
    select: (search) => search.sync,
  });
  const navigate = useNavigate({ from: '/settings' });
  const router = useRouter();

  function open(sync: SyncView) {
    void navigate({ search: (previous) => ({ ...previous, sync }) });
  }

  function close() {
    if (router.history.canGoBack()) {
      router.history.back();
      return;
    }
    void navigate({
      search: (previous) => ({ ...previous, sync: undefined }),
      replace: true,
    });
  }

  return (
    <>
      <SettingsGroup title={text.title}>
        <Row
          icon={<MonitorSmartphone />}
          hue="bg-someday"
          title={text.devices}
          value={text.deviceCount(deviceCount)}
          onClick={() => open('devices')}
        />
        <Row
          icon={<QrCode />}
          hue="bg-waiting"
          title={text.showCode}
          onClick={() => open('show-code')}
        />
        <Row
          icon={<Keyboard />}
          hue="bg-waiting"
          title={text.enterCode}
          onClick={() => open('enter-code')}
        />
      </SettingsGroup>
      {view === 'devices' && <SyncDevices onClose={close} />}
      {view === 'show-code' && <SyncInvitation onClose={close} />}
      {view === 'enter-code' && <SyncCodeEntry onClose={close} />}
    </>
  );
}
