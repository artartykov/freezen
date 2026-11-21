import { Keyboard, MonitorSmartphone, QrCode, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useI18n } from '@shared/i18n';
import { syncNow, useSyncStore } from '@shared/sync';
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
          trailing={<ManualSyncButton />}
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

function ManualSyncButton() {
  const { messages } = useI18n();
  const text = messages.sync;
  const [status, setStatus] = useState<'running' | 'success' | 'error'>();

  useEffect(() => {
    if (status !== 'success' && status !== 'error') return;
    const timer = window.setTimeout(() => setStatus(undefined), 1500);
    return () => window.clearTimeout(timer);
  }, [status]);

  async function run() {
    if (status === 'running') return;
    setStatus('running');
    const [success] = await Promise.all([
      syncNow().catch(() => false),
      new Promise<void>((resolve) => window.setTimeout(resolve, 350)),
    ]);
    setStatus(success ? 'success' : 'error');
  }

  const feedback = {
    running: text.syncRunning,
    success: text.syncComplete,
    error: text.syncFailed,
  };

  return (
    <>
      <button
        type="button"
        aria-label={text.syncNow}
        aria-busy={status === 'running'}
        aria-disabled={status === 'running'}
        title={text.syncNow}
        className={`mr-2 grid w-11 shrink-0 cursor-pointer place-items-center self-stretch rounded-xl focus-visible:outline-2 focus-visible:outline-focus-ring ${
          status === 'success'
            ? 'text-next'
            : status === 'error'
              ? 'text-danger'
              : 'text-muted motion-safe:transition-colors motion-safe:duration-350 motion-safe:ease-out'
        }`}
        onClick={() => void run()}
      >
        <RefreshCw
          size={18}
          className={
            status === 'running' ? 'motion-safe:animate-sync-spin' : undefined
          }
          aria-hidden="true"
        />
      </button>
      <span className="sr-only" role="status">
        {status ? feedback[status] : ''}
      </span>
    </>
  );
}
