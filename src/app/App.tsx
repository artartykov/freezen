import { OnboardingPage } from '@pages/onboarding';
import type { resolveI18n } from '@shared/i18n';
import { useUiState } from '@shared/model';
import type { AppStorage } from '@shared/storage';
import './styles/global.css';

type AppProps = {
  messages: ReturnType<typeof resolveI18n>['messages'];
  storage: AppStorage | null;
};

export function App({ messages, storage }: AppProps) {
  const onboardingCompleted = useUiState((state) => state.onboardingCompleted);
  const completeOnboarding = useUiState((state) => state.completeOnboarding);

  if (!storage) {
    return (
      <main className="mx-auto max-w-[440px] px-4 pt-[calc(2rem+env(safe-area-inset-top,0px))]">
        <p role="alert">{messages.storage.loadFailed}</p>
      </main>
    );
  }

  if (!onboardingCompleted) {
    return (
      <OnboardingPage messages={messages} onComplete={completeOnboarding} />
    );
  }

  return (
    <main className="mx-auto max-w-[440px] pt-[calc(2rem+env(safe-area-inset-top,0px))] pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
      <h1 className="text-2xl font-bold">{messages.onboarding.focus}</h1>
    </main>
  );
}
