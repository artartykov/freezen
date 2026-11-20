import { RouterProvider } from '@tanstack/react-router';
import { useEffect } from 'react';
import { OnboardingPage } from '@pages/onboarding';
import { I18nContext, i18nFor } from '@shared/i18n';
import type { I18n } from '@shared/i18n';
import { useUiState } from '@shared/model';
import { useData } from '@shared/storage';
import { RecoverySnapshot, StorageNotice } from './StorageNotice';
import { router } from './router';
import './styles/global.css';

type AppProps = {
  fallback: I18n;
  loaded: boolean;
  recovery?: string;
};

export function App({ fallback, loaded, recovery }: AppProps) {
  if (!loaded) {
    return (
      <main className="mx-auto max-w-[440px] px-4 pt-[calc(2rem+env(safe-area-inset-top,0px))]">
        <p role="alert">{fallback.messages.storage.loadFailed}</p>
        {recovery !== undefined && (
          <RecoverySnapshot
            label={fallback.messages.storage.recovery}
            snapshot={recovery}
          />
        )}
      </main>
    );
  }

  return <LoadedApp />;
}

function LoadedApp() {
  const onboardingCompleted = useUiState((state) => state.onboardingCompleted);
  const completeOnboarding = useUiState((state) => state.completeOnboarding);
  const language = useData((data) => data.settings.language);
  const i18n = i18nFor(language);

  useEffect(() => {
    document.documentElement.lang = i18n.locale;
  }, [i18n.locale]);

  return (
    <I18nContext value={i18n}>
      {onboardingCompleted ? (
        <RouterProvider router={router} />
      ) : (
        <OnboardingPage
          messages={i18n.messages}
          onComplete={completeOnboarding}
        />
      )}
      <StorageNotice />
    </I18nContext>
  );
}
