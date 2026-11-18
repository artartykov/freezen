import type { ReactNode } from 'react';

type StepContentProps = {
  labelledBy: string;
  children: ReactNode;
};

export function StepContent({ labelledBy, children }: StepContentProps) {
  return (
    <section
      className="flex flex-1 flex-col items-center gap-3 pt-[max(60px,calc(50dvh-155px))] pb-6 text-center group-data-[exiting=true]/onboarding:animate-rise-out group-data-[exiting=false]/onboarding:motion-safe:animate-rise motion-reduce:[animation-duration:0s]"
      aria-labelledby={labelledBy}
    >
      {children}
    </section>
  );
}
