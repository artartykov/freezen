import { useState } from 'react';
import { OnboardingPage } from '@pages/onboarding';
import type { resolveI18n } from '@shared/i18n';
import './styles/global.css';

type AppProps = {
  messages: ReturnType<typeof resolveI18n>['messages'];
};

export function App({ messages }: AppProps) {
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  if (!onboardingComplete) {
    return (
      <OnboardingPage
        messages={messages}
        onComplete={() => setOnboardingComplete(true)}
      />
    );
  }

  return (
    <main className="mx-auto max-w-[440px] py-8">
      <h1 className="text-2xl font-bold">{messages.onboarding.focus}</h1>
    </main>
  );
}
