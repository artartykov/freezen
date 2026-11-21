import { isTauri } from '@tauri-apps/api/core';
import { isSyncSecret } from './transport';

export type DevicePlatform =
  'android' | 'browser' | 'windows' | 'linux' | 'unknown';

export type DeviceIdentity = {
  id: string;
  name: string;
  platform: DevicePlatform;
};

export type PairedDevice = DeviceIdentity & { secret: string };

const identityKey = 'freezen-sync-identity';
export const peersKey = 'freezen-sync-devices';
const platforms: readonly string[] = [
  'android',
  'browser',
  'windows',
  'linux',
  'unknown',
];

export function isDeviceIdentity(value: unknown): value is DeviceIdentity {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<DeviceIdentity>;
  return (
    typeof item.id === 'string' &&
    /^[0-9a-f-]{36}$/i.test(item.id) &&
    typeof item.name === 'string' &&
    item.name.trim().length > 0 &&
    item.name.length <= 80 &&
    typeof item.platform === 'string' &&
    platforms.includes(item.platform)
  );
}

export function loadPairedDevices(): PairedDevice[] {
  const raw = localStorage.getItem(peersKey);
  if (!raw) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item: unknown): item is PairedDevice =>
      isDeviceIdentity(item) &&
      isSyncSecret((item as Partial<PairedDevice>).secret),
  );
}

export function savePairedDevices(devices: PairedDevice[]) {
  localStorage.setItem(peersKey, JSON.stringify(devices));
}

export function localIdentity(): DeviceIdentity {
  const agent = navigator.userAgent;
  const os = /Android/i.test(agent)
    ? 'android'
    : /Windows/i.test(agent)
      ? 'windows'
      : /Linux/i.test(agent)
        ? 'linux'
        : 'unknown';
  const platform = isTauri() ? os : 'browser';
  const browser = /Edg\//.test(agent)
    ? 'Edge'
    : /Firefox\//.test(agent)
      ? 'Firefox'
      : /(?:Chrome|CriOS)\//.test(agent)
        ? 'Chrome'
        : /Safari\//.test(agent)
          ? 'Safari'
          : 'Browser';
  const androidModel = agent.match(
    /Android [^;()]+;\s*([^;)]+)\s+Build\//,
  )?.[1];
  const name =
    platform === 'browser'
      ? browser
      : platform === 'android'
        ? androidModel?.slice(0, 80) || 'Android'
        : 'FreeZen';
  const savedId = localStorage.getItem(identityKey);
  if (savedId && /^[0-9a-f-]{36}$/i.test(savedId)) {
    return { id: savedId, name, platform };
  }
  const id = crypto.randomUUID();
  localStorage.setItem(identityKey, id);
  return { id, name, platform };
}
