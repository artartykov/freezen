import { Keyboard, MonitorSmartphone, QrCode } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '@shared/i18n';
import { useSyncStore } from '@shared/sync';
import { Row, SettingsGroup } from './SettingsParts';
import { SyncCodeEntry } from './SyncCodeEntry';
import { SyncDevices } from './SyncDevices';
import { SyncInvitation } from './SyncInvitation';

type SyncView = 'devices' | 'show-code' | 'enter-code';

export function SyncGroup() {
  const { messages } = useI18n();
  const text = messages.sync;
  const deviceCount = useSyncStore((state) => state.devices.length);
  const onlineCount = useSyncStore(
    (state) => state.devices.filter((device) => device.online).length,
  );
  const [view, setView] = useState<SyncView | null>(null);

  function close() {
    setView(null);
  }

  return (
    <>
      <SettingsGroup title={text.title}>
        <Row
          icon={<MonitorSmartphone />}
          hue="bg-someday"
          title={text.devices}
          value={text.deviceCount(onlineCount, deviceCount)}
          onClick={() => setView('devices')}
        />
        <Row
          icon={<QrCode />}
          hue="bg-waiting"
          title={text.showCode}
          onClick={() => setView('show-code')}
        />
        <Row
          icon={<Keyboard />}
          hue="bg-waiting"
          title={text.enterCode}
          onClick={() => setView('enter-code')}
        />
      </SettingsGroup>
      {view === 'devices' && <SyncDevices onClose={close} />}
      {view === 'show-code' && <SyncInvitation onClose={close} />}
      {view === 'enter-code' && <SyncCodeEntry onClose={close} />}
    </>
  );
}
