import { Logo } from '@shared/ui/Logo';
import { Button } from '@shared/ui/Button';
import { StepContent } from './StepContent';

type Headline = {
  emphasis: string;
  rest: string;
};

type WelcomeStepProps = {
  action: string;
  onContinue: () => void;
  hero: {
    title1: Headline;
    title2: Headline;
  };
};

export function WelcomeStep({ hero, action, onContinue }: WelcomeStepProps) {
  return (
    <main className="mx-auto flex min-h-dvh select-none max-w-[440px] flex-col pt-[env(safe-area-inset-top)] pb-[calc(16px+env(safe-area-inset-bottom,0px))]">
      <StepContent labelledBy="hero-headline">
        <Logo className="relative -top-3.5 mb-5 block size-[145px] shrink-0 fill-accent" />
        <h1
          className="mt-4 text-balance text-[clamp(15px,4.4vw,18px)] leading-[1.9] font-medium tracking-[0.2em] uppercase [&_em]:underline [&_em]:decoration-[0.09em] [&_em]:underline-offset-[0.22em] [&_em]:not-italic"
          id="hero-headline"
        >
          <span className="block">
            <em>{hero.title1.emphasis}</em> {hero.title1.rest}
          </span>
          <span className="block text-muted">
            <em>{hero.title2.emphasis}</em> {hero.title2.rest}
          </span>
        </h1>
      </StepContent>
      <Button onClick={onContinue}>{action}</Button>
    </main>
  );
}
