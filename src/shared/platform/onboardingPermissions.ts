import { invoke, isTauri } from '@tauri-apps/api/core';

export type OnboardingPermission = 'notifications' | 'calendar';

export function supportsOnboardingPermission(permission: OnboardingPermission) {
  return (
    isTauri() ||
    (permission === 'notifications' &&
      window.isSecureContext &&
      typeof window.Notification?.requestPermission === 'function')
  );
}

export async function requestOnboardingPermission(
  permission: OnboardingPermission,
) {
  if (isTauri()) {
    return invoke<boolean | null>('request_onboarding_permission', {
      permission,
    });
  }

  if (supportsOnboardingPermission(permission)) {
    const result = await Notification.requestPermission();
    if (result === 'denied') return 'browserBlocked';
    return result === 'granted';
  }

  return null;
}
