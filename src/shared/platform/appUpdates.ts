import { invoke, isTauri } from '@tauri-apps/api/core';

export async function supportsAppUpdates() {
  return isTauri() && (await invoke<boolean>('supports_app_updates'));
}

export function checkAppUpdate() {
  return invoke<string | null>('check_app_update');
}

export function installAppUpdate(version: string) {
  return invoke<boolean>('install_app_update', { version });
}
