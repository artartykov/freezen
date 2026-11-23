import { Check, Ellipsis, MonitorSmartphone, RefreshCw } from 'lucide-react';
import { useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { tagColors } from '@entities/tag';
import { useI18n } from '@shared/i18n';
import {
  defaultDeviceIcon,
  deviceIcons,
  useDeviceAppearance,
  useSyncStore,
} from '@shared/sync';
import type {
  DeviceAppearance,
  DeviceIcon,
  DeviceSyncStatus,
} from '@shared/sync';

const badges = {
  synced: { icon: Check, style: 'text-emerald-700 dark:text-emerald-400' },
  syncing: { icon: RefreshCw, style: 'motion-safe:animate-sync-spin' },
  waiting: { icon: Ellipsis, style: '' },
};

export function DeviceSyncStatusButton() {
  const {
    messages: { sync: text },
  } = useI18n();
  const devices = useSyncStore((state) => state.devices);
  const appearance = useDeviceAppearance((state) => state.byId);
  if (!devices.length) return null;

  const waiting = devices.filter(
    (device) => device.status === 'waiting',
  ).length;
  const syncing = devices.some((device) => device.status === 'syncing');
  const status = syncing ? 'syncing' : waiting ? 'waiting' : 'synced';
  const summary = syncing
    ? text.syncingDevices
    : waiting
      ? text.waitingDevices(waiting)
      : text.allSynced;
  const { icon: SummaryIcon, style } = badges[status];

  return (
    <DevicePopover
      label={`${text.devices} · ${devices.length} · ${summary}`}
      heading={text.devices}
      trigger={
        <span aria-hidden="true" className="relative">
          <MonitorSmartphone className="size-6" />
          <StatusBadge status={status} aggregate />
        </span>
      }
    >
      <p
        key={status}
        className="mt-1 flex items-center gap-2 text-sm text-muted motion-safe:animate-fade-in"
      >
        <SummaryIcon
          className={`size-3.5 shrink-0 ${style}`}
          aria-hidden="true"
        />
        {summary}
      </p>
      <ul className="mt-3 grid gap-3 border-t border-line pt-3">
        {devices.map((device) => {
          const custom = appearance[device.id];
          return (
            <li key={device.id} className="flex items-center gap-3 text-muted">
              <DeviceGlyph
                icon={custom?.icon ?? defaultDeviceIcon(device.platform)}
                color={custom?.color}
                status={device.status}
              />
              <div className="min-w-0 wrap-anywhere">
                <p className="text-sm text-ink">
                  {custom?.name?.trim() || device.name}
                </p>
                <p className="text-xs">
                  {text.deviceStatus[device.status]} ·{' '}
                  {device.online ? text.online : text.offline}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </DevicePopover>
  );
}

function DeviceGlyph({
  icon,
  color,
  status,
}: {
  icon: DeviceIcon;
  color?: DeviceAppearance['color'];
  status: DeviceSyncStatus;
}) {
  const Icon = deviceIcons[icon];
  return (
    <span className="relative shrink-0" aria-hidden="true">
      <Icon
        className={`size-[17px] ${icon === 'tablet' ? 'rotate-90' : ''}`}
        style={
          color && color !== 'none' ? { color: tagColors[color] } : undefined
        }
      />
      <StatusBadge status={status} />
    </span>
  );
}

function StatusBadge({
  status,
  aggregate = false,
}: {
  status: DeviceSyncStatus;
  aggregate?: boolean;
}) {
  const { icon: Badge, style } = badges[status];
  return (
    <span
      key={status}
      className={`absolute -right-1 -bottom-0.5 grid place-items-center rounded-full motion-safe:animate-sync-badge ${aggregate ? 'size-[18px] bg-surface' : 'size-3.5 bg-card'}`}
    >
      <Badge
        className={`${aggregate ? 'size-3.5' : 'size-2.5'} ${style}`}
        strokeWidth={2.5}
      />
    </span>
  );
}

function DevicePopover({
  label,
  heading,
  trigger,
  children,
}: {
  label: string;
  heading: string;
  trigger: ReactNode;
  children: ReactNode;
}) {
  const id = useId();
  const popup = useRef<HTMLDivElement>(null);

  function position(anchor: HTMLButtonElement) {
    const rect = anchor.getBoundingClientRect();
    const panel = popup.current;
    if (!panel) return;
    const width = Math.min(260, window.innerWidth - 24);
    panel.style.width = `${width}px`;
    panel.style.left = `${Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12))}px`;
    panel.style.top = `${rect.bottom + 4}px`;
    panel.style.maxHeight = `${window.innerHeight - rect.bottom - 16}px`;
  }

  return (
    <>
      <button
        type="button"
        aria-label={label}
        popoverTarget={id}
        onClick={(event) => position(event.currentTarget)}
        className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-focus-ring"
      >
        {trigger}
      </button>
      <div
        id={id}
        ref={popup}
        popover="auto"
        role="group"
        aria-label={heading}
        className="fixed inset-auto m-0 overflow-y-auto rounded-2xl border border-line bg-card p-4 text-ink shadow-lg"
      >
        <p className="text-sm font-medium">{heading}</p>
        {children}
      </div>
    </>
  );
}
