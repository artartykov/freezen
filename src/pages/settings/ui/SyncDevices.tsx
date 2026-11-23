import { useState } from 'react';
import { tagColors } from '@entities/tag';
import { ColorSwatches } from '@features/manage-tags';
import { useI18n } from '@shared/i18n';
import { askConfirm } from '@shared/model';
import {
  defaultDeviceIcon,
  deviceIcons,
  disconnectDevice,
  useDeviceAppearance,
  useSyncStore,
} from '@shared/sync';
import type { DeviceAppearance, DeviceIcon } from '@shared/sync';
import { Sheet, SheetBody, SheetHeader } from '@shared/ui/Sheet';

const iconChoices = Object.keys(deviceIcons) as DeviceIcon[];
const focusClass = 'focus-visible:outline-2 focus-visible:outline-focus-ring';

export function SyncDevices({ onClose }: { onClose: () => void }) {
  const { messages } = useI18n();
  const text = messages.sync;
  const devices = useSyncStore((state) => state.devices);
  const appearance = useDeviceAppearance((state) => state.byId);
  const update = useDeviceAppearance((state) => state.update);
  const [editing, setEditing] = useState<string>();
  const selected = devices.find((device) => device.id === editing);

  if (selected) {
    const custom = appearance[selected.id];
    const name = custom?.name?.trim() || selected.name;
    const closeEditor = () => setEditing(undefined);
    return (
      <Sheet label={text.configure} onClose={closeEditor}>
        <SheetHeader
          title={text.configure}
          onBack={closeEditor}
          backLabel={messages.common.back}
        />
        <SheetBody>
          <DeviceAppearanceEditor
            name={custom?.name ?? selected.name}
            icon={custom?.icon ?? defaultDeviceIcon(selected.platform)}
            color={custom?.color ?? 'none'}
            onChange={(changes) => update(selected.id, changes)}
          />
          <button
            type="button"
            className={`mt-5 min-h-11 cursor-pointer rounded-xl px-2 text-sm font-medium text-danger ${focusClass}`}
            onClick={() =>
              askConfirm({
                title: text.disconnectTitle(name),
                text: text.disconnectText,
                confirm: text.disconnect,
                danger: true,
                onConfirm: () => {
                  disconnectDevice(selected.id);
                  closeEditor();
                },
              })
            }
          >
            {text.disconnect}
          </button>
        </SheetBody>
      </Sheet>
    );
  }

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
              const custom = appearance[device.id];
              const name = custom?.name?.trim() || device.name;
              return (
                <li
                  key={device.id}
                  className="flex min-h-16 items-center gap-3 rounded-xl px-2 py-2"
                >
                  <AppearanceIcon
                    icon={custom?.icon ?? defaultDeviceIcon(device.platform)}
                    color={custom?.color}
                  />
                  <div className="min-w-0 flex-1 wrap-anywhere">
                    <p className="text-[17px]">{name}</p>
                    <p className="text-sm text-muted">
                      {text.devicePlatform[device.platform]} ·{' '}
                      {device.online ? text.online : text.offline}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={text.configureDevice(name)}
                    className={`min-h-11 shrink-0 cursor-pointer rounded-xl px-2 text-sm font-medium text-focus-ring ${focusClass}`}
                    onClick={() => setEditing(device.id)}
                  >
                    {text.configure}
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

function AppearanceIcon({
  icon,
  color,
}: {
  icon: DeviceIcon;
  color?: DeviceAppearance['color'];
}) {
  const Icon = deviceIcons[icon];
  return (
    <span
      className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-surface text-muted"
      style={
        color && color !== 'none' ? { color: tagColors[color] } : undefined
      }
    >
      <Icon
        className={`size-5 ${icon === 'tablet' ? 'rotate-90' : ''}`}
        aria-hidden="true"
      />
    </span>
  );
}

function DeviceAppearanceEditor({
  name,
  icon,
  color,
  onChange,
}: Required<DeviceAppearance> & {
  onChange: (changes: DeviceAppearance) => void;
}) {
  const { messages } = useI18n();

  return (
    <div className="grid gap-4">
      <AppearanceIcon icon={icon} color={color} />
      <label className="grid gap-1 text-sm text-muted">
        {messages.sync.deviceName}
        <input
          className={`min-h-11 rounded-xl border border-line bg-card px-3 text-base text-ink ${focusClass}`}
          maxLength={80}
          value={name}
          onChange={(event) => onChange({ name: event.target.value })}
        />
      </label>
      <fieldset className="flex flex-wrap gap-2">
        <legend className="mb-1 text-sm text-muted">
          {messages.sync.deviceIcon}
        </legend>
        {iconChoices.map((choice) => {
          const Icon = deviceIcons[choice];
          return (
            <button
              key={choice}
              type="button"
              aria-pressed={choice === icon}
              onClick={() => onChange({ icon: choice })}
              className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line px-3 text-sm aria-pressed:border-focus-ring aria-pressed:bg-glow ${focusClass}`}
            >
              <Icon
                className={`size-5 ${choice === 'tablet' ? 'rotate-90' : ''}`}
                aria-hidden="true"
              />
              {messages.sync.deviceIcons[choice]}
            </button>
          );
        })}
      </fieldset>
      <fieldset>
        <legend className="mb-1 text-sm text-muted">
          {messages.tags.color}
        </legend>
        <ColorSwatches
          value={color}
          onChange={(value) => onChange({ color: value })}
        />
      </fieldset>
    </div>
  );
}
