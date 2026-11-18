import type { ReactNode } from 'react';
import { Button } from '@shared/ui/Button';
import { StepContent } from './StepContent';

type PermissionPromptProps = {
  title: string;
  description: string;
  action: string;
  skip: string;
  icon: ReactNode;
  preview: {
    icon: ReactNode;
    title: string;
    detail: string;
    time: string;
  };
  onContinue: () => void;
};

export function PermissionPrompt({
  title,
  description,
  action,
  skip,
  icon,
  preview,
  onContinue,
}: PermissionPromptProps) {
  return (
    <main className="relative mx-auto flex min-h-dvh select-none max-w-[440px] flex-col pt-[env(safe-area-inset-top)] pb-[calc(16px+env(safe-area-inset-bottom,0px))]">
      <button
        type="button"
        className="absolute top-[calc(4px+env(safe-area-inset-top,0px))] right-0 z-10 min-h-11 cursor-pointer rounded-[10px] px-2 text-sm font-medium text-muted focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus-ring"
        onClick={onContinue}
      >
        {skip}
      </button>
      <StepContent labelledBy="onboarding-title">
        {icon}
        <h1 className="sr-only" id="onboarding-title">
          {title}
        </h1>
        <p className="max-w-[30ch] text-[17px] text-balance text-muted">
          {description}
        </p>
        <div
          className="mt-3 flex w-full max-w-[340px] items-center gap-3 rounded-[18px] border border-line bg-card px-3.5 py-3 text-left"
          aria-hidden="true"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-accent text-xl font-bold text-accent-ink">
            {preview.icon}
          </span>
          <span className="flex min-w-0 flex-1 flex-col text-sm leading-[1.3]">
            <b className="text-[13px]">{preview.title}</b>
            <span className="wrap-anywhere text-muted">{preview.detail}</span>
          </span>
          <span className="shrink-0 self-start text-xs text-muted">
            {preview.time}
          </span>
        </div>
      </StepContent>
      <Button onClick={onContinue}>{action}</Button>
    </main>
  );
}
