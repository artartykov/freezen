import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@app';
import { resolveI18n } from '@shared/i18n';

const { locale, messages } = resolveI18n(navigator.languages);
document.documentElement.lang = locale;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App hero={messages.hero} />
  </StrictMode>,
);
