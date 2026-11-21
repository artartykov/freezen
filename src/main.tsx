import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App, syncAppearance } from '@app';
import { resolveI18n } from '@shared/i18n';
import { createTutorialData, openStorage } from '@shared/storage';
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

openStorage(() =>
  createTutorialData(system.messages.tutorial, system.locale),
).then(
  () => {
    startDeviceSync();
    render(true);
  },
  (error: unknown) => {
    console.error(error);
    render(false);
  },
);
