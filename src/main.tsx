import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@app';
import { resolveI18n } from '@shared/i18n';
import { openStorage } from '@shared/storage';
import type { AppStorage } from '@shared/storage';

const { locale, messages } = resolveI18n(navigator.languages);
document.documentElement.lang = locale;

const root = createRoot(document.getElementById('root')!);

function render(storage: AppStorage | null) {
  root.render(
    <StrictMode>
      <App messages={messages} storage={storage} />
    </StrictMode>,
  );
}

openStorage().then(render, (error: unknown) => {
  console.error(error);
  render(null);
});
