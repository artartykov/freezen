import type { Messages } from '@shared/i18n';
import {
  checkAppUpdate,
  installAppUpdate,
  supportsAppUpdates,
} from '@shared/platform';
import { create } from 'zustand';
import { askConfirm } from './confirm';
import { useUiState } from './uiState';

export const useAppUpdates = create<{
  supported: boolean;
  activity: 'checking' | 'installing' | null;
  availableVersion: string | null;
}>(() => ({ supported: false, activity: null, availableVersion: null }));

let started = false;

export async function startAppUpdateCheck(messages: Messages) {
  if (started) return;
  started = true;

  const supported = await supportsAppUpdates().catch(() => false);
  useAppUpdates.setState({ supported });
  if (supported) await checkForAppUpdates(messages, false);
}

export async function checkForAppUpdates(messages: Messages, manual = true) {
  const { activity, supported } = useAppUpdates.getState();
  if (activity || !supported) return;

  useAppUpdates.setState({ activity: 'checking' });
  try {
    const version = await checkAppUpdate();
    useAppUpdates.setState({ availableVersion: version });
    if (manual) {
      if (version) showAppUpdate(version, messages);
      else notify(messages, messages.appUpdates.upToDate);
    }
  } catch {
    if (manual) notify(messages, messages.appUpdates.checkFailed);
  } finally {
    useAppUpdates.setState({ activity: null });
  }
}

export function showAppUpdate(version: string, messages: Messages) {
  const m = messages.appUpdates;
  useUiState.getState().setLastUpdatePrompt(version);
  askConfirm({
    title: m.available,
    text: m.versionAvailable(version),
    confirm: m.update,
    cancel: m.later,
    onConfirm: () => void install(version, messages),
  });
}

async function install(version: string, messages: Messages) {
  useAppUpdates.setState({ activity: 'installing' });
  try {
    if (!(await installAppUpdate(version))) {
      notify(messages, messages.appUpdates.installPermissionRequired);
    }
  } catch {
    notify(messages, messages.appUpdates.installFailed);
  } finally {
    useAppUpdates.setState({ activity: null });
  }
}

function notify(messages: Messages, title: string) {
  askConfirm({
    title,
    confirm: messages.common.ok,
    cancel: '',
    onConfirm: () => {},
  });
}
