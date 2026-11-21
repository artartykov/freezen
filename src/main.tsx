import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App, syncAppearance } from '@app';
import { resolveI18n } from '@shared/i18n';
import { useUiState } from '@shared/model';
import {
  createTutorialData,
  expiredTrashKeys,
  getData,
  openStorage,
} from '@shared/storage';
import { startDeviceSync } from '@shared/sync';

const system = resolveI18n(navigator.languages);
syncAppearance();

const root = createRoot(document.getElementById('root')!);

function render(loaded: boolean) {
  root.render(
    <StrictMode>
      <App fallback={system} loaded={loaded} />
    </StrictMode>,
  );
}

function clearExpiredTrash() {
  const { clearedTrash, clearTrash } = useUiState.getState();
  const keys = expiredTrashKeys(getData(), clearedTrash, Date.now());
  if (keys.length) clearTrash(keys);
}

openStorage(() =>
  createTutorialData(system.messages.tutorial, system.locale),
).then(
  () => {
    try {
      clearExpiredTrash();
    } catch (error) {
      console.error(error);
    }
    startDeviceSync();
    render(true);
  },
  (error: unknown) => {
    console.error(error);
    render(false);
  },
);
