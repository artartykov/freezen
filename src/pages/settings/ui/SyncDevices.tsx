import { Monitor, Smartphone } from 'lucide-react';
import { useI18n } from '@shared/i18n';
import { askConfirm } from '@shared/model';
import { disconnectDevice, useSyncStore } from '@shared/sync';
import { Sheet, SheetBody, SheetHeader } from '@shared/ui/Sheet';

export function SyncDevices({ onClose }: { onClose: () => void }) {
  const { messages } = useI18n();
  const text = messages.sync;
  const devices = useSyncStore((state) => state.devices);

  return (
    <Sheet label={text.devices} onClose={onClose}>
      <SheetHeader
        title={text.devices}
        onBack={onClose}
        backLabel={messages.common.back}
      />
      <SheetBody>
        {devices.length === 0 ? (
          <p className="mt-6 text-center text-muted">{text.noDevices}</p>
        ) : (
          <ul className="m-0 list-none p-0">
            {devices.map((device) => {
              const Icon = device.platform === 'android' ? Smartphone : Monitor;
              const name = device.name || text.devicePlatform[device.platform];
              return (
                <li
                  key={device.id}
                  className="flex min-h-16 items-center gap-3 rounded-xl px-2 py-2"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-someday text-white">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1 wrap-anywhere">
                    <p className="text-[17px]">{name}</p>
                    <p className="text-sm text-muted">
                      {text.devicePlatform[device.platform]} ·{' '}
                      {device.online ? text.online : text.offline}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={text.disconnectDevice(name)}
                    className="min-h-11 shrink-0 cursor-pointer rounded-xl px-2 text-sm font-medium text-danger focus-visible:outline-2 focus-visible:outline-focus-ring"
                    onClick={() =>
                      askConfirm({
                        title: text.disconnectTitle(name),
                        text: text.disconnectText,
                        confirm: text.disconnect,
                        danger: true,
                        onConfirm: () => disconnectDevice(device.id),
                      })
                    }
                  >
                    {text.disconnect}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </SheetBody>
    </Sheet>
  );
}
