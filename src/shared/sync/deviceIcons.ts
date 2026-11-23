import { AppWindow, Monitor, Smartphone, Tablet } from 'lucide-react';
import type { DeviceIcon } from './appearance';
import type { DevicePlatform } from './identity';

export const deviceIcons = {
  phone: Smartphone,
  tablet: Tablet,
  browser: AppWindow,
  desktop: Monitor,
} satisfies Record<DeviceIcon, typeof Smartphone>;

export function defaultDeviceIcon(platform: DevicePlatform): DeviceIcon {
  if (platform === 'android') return 'phone';
  if (platform === 'browser') return 'browser';
  return 'desktop';
}
