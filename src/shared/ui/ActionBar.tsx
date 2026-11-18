import type { ReactNode } from 'react';

export function ActionBar({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(16px+env(safe-area-inset-bottom))] z-20 flex justify-center">
      <div
        role="toolbar"
        aria-label={label}
        className="pointer-events-auto relative flex min-h-14 items-center rounded-full bg-card px-1.5 shadow-[0_6px_18px_rgba(0,0,0,.24)] motion-safe:animate-rise"
      >
        {children}
      </div>
    </div>
  );
}

export function ActionBarButton({
  children,
  onClick,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex min-h-12 min-w-13 cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-[17px] font-bold text-focus-ring focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-focus-ring [&_svg]:size-6"
    >
      {children}
    </button>
  );
}

export function ActionBarSeparator() {
  return <i aria-hidden="true" className="h-6 w-px bg-line" />;
}
