import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App, syncAppearance } from '@app';
import { resolveI18n } from '@shared/i18n';
import {
  createTutorialData,
  openStorage,
  StorageLoadError,
} from '@shared/storage';

const system = resolveI18n(navigator.languages);
syncAppearance();

const root = createRoot(document.getElementById('root')!);

function render(loaded: boolean, recovery?: string) {
  root.render(
    <StrictMode>
      <App fallback={system} loaded={loaded} recovery={recovery} />
    </StrictMode>,
  );
}

openStorage(() =>
  createTutorialData(system.messages.tutorial, system.locale),
).then(
  () => render(true),
  (error: unknown) => {
    console.error(error);
    render(
      false,
      error instanceof StorageLoadError ? error.snapshot : undefined,
    );
  },
);
