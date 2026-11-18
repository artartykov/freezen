import { useState } from 'react';
import type { AnimationEvent } from 'react';
import type { resolveI18n } from '@shared/i18n';
import { CalendarStep } from './CalendarStep';
import { NotificationStep } from './NotificationStep';
import { WelcomeStep } from './WelcomeStep';

type OnboardingPageProps = {
  messages: ReturnType<typeof resolveI18n>['messages'];
  onComplete: () => void;
};

export function OnboardingPage({ messages, onComplete }: OnboardingPageProps) {
  const [step, setStep] = useState<'welcome' | 'notifications' | 'calendar'>(
    'welcome',
  );
  const [exiting, setExiting] = useState(false);
  const { onboarding } = messages;

  function advance() {
    setExiting(false);

    switch (step) {
      case 'welcome':
        setStep('notifications');
        break;
      case 'notifications':
        setStep('calendar');
        break;
      case 'calendar':
        onComplete();
        break;
    }
  }

  function handleContinue() {
    if (exiting) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      advance();
      return;
    }

    setExiting(true);
  }

  function handleAnimationEnd(event: AnimationEvent<HTMLDivElement>) {
    if (exiting && event.animationName === 'rise-out') {
      advance();
    }
  }

  return (
    <div
      className="group/onboarding"
      data-exiting={exiting}
      onAnimationEnd={handleAnimationEnd}
    >
      {step === 'welcome' && (
        <WelcomeStep
          hero={messages.hero}
          action={onboarding.continue}
          onContinue={handleContinue}
        />
      )}
      {step === 'notifications' && (
        <NotificationStep
          copy={onboarding.notifications}
          skip={onboarding.skip}
          continueLabel={onboarding.continue}
          permissionStatus={onboarding.permissionStatus}
          onContinue={handleContinue}
        />
      )}
      {step === 'calendar' && (
        <CalendarStep
          copy={onboarding.calendar}
          skip={onboarding.skip}
          continueLabel={onboarding.continue}
          permissionStatus={onboarding.permissionStatus}
          onContinue={handleContinue}
        />
      )}
    </div>
  );
}
