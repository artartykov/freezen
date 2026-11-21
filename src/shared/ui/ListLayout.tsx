import { useRef } from 'react';
import type { ReactNode } from 'react';
import { useKeyboardOpen } from '@shared/lib';

type ListLayoutProps = {
  bar: ReactNode;
  header?: ReactNode;
  subtitle?: string;
  children: ReactNode;
  filters?: ReactNode;
  fab?: ReactNode;
  overlays?: ReactNode;
  onPullDown?: () => void;
};

export function ListLayout({
  bar,
  header,
  subtitle,
  children,
  filters,
  fab,
  overlays,
  onPullDown,
}: ListLayoutProps) {
  const pullStart = useRef<{ x: number; y: number } | null>(null);
  const keyboardOpen = useKeyboardOpen();

  return (
    <main
      className="relative mx-auto flex min-h-dvh w-full max-w-[440px] flex-col pt-[calc(12px+env(safe-area-inset-top))] pb-28"
      onTouchStart={(event) => {
        const touch = event.touches.item(0);
        pullStart.current =
          touch && window.scrollY <= 0
            ? { x: touch.clientX, y: touch.clientY }
            : null;
      }}
      onTouchMove={(event) => {
        const start = pullStart.current;
        const touch = event.touches.item(0);
        if (!start || !touch) return;
        const dx = Math.abs(touch.clientX - start.x);
        if (
          event.isDefaultPrevented() ||
          (dx > 12 && dx > Math.abs(touch.clientY - start.y))
        )
          pullStart.current = null;
      }}
      onTouchEnd={(event) => {
        const start = pullStart.current;
        const touch = event.changedTouches.item(0);
        pullStart.current = null;
        if (start !== null && touch && touch.clientY - start.y > 160) {
          onPullDown?.();
        }
      }}
    >
      {bar}
      {header}
      {subtitle && (
        <p className="mt-2 text-[length:var(--page-subtitle-size)] leading-[var(--page-subtitle-line)] font-light text-muted">
          {subtitle}
        </p>
      )}
      {filters}
      {children}
      {fab && !keyboardOpen && (
        <div className="fixed right-[max(16px,calc(50%-204px))] bottom-[calc(16px+env(safe-area-inset-bottom))] z-10 flex items-center gap-3 [:root:has([data-selecting])_&]:hidden">
          {fab}
        </div>
      )}
      {overlays}
    </main>
  );
}
