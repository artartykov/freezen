import type { ReactNode } from 'react';
import { useDragDismiss, useKeyboardOpen } from '@shared/lib';
import { Modal } from './Modal';

type SheetProps = {
  label: string;
  onClose: () => void | false;
  children: ReactNode;
  size?: 'full' | 'part';
};

function scrolledInside(target: EventTarget, panel: HTMLElement) {
  for (
    let node = target as HTMLElement | null;
    node && node !== panel;
    node = node.parentElement
  ) {
    if (node.scrollTop > 0) return true;
  }
  return false;
}

function claimDownwardSwipe(panel: HTMLDivElement) {
  let start: { x: number; y: number } | null = null;
  let claimed = false;

  function onTouchStart(event: TouchEvent) {
    const touch = event.touches.item(0);
    claimed = false;
    start =
      event.touches.length === 1 &&
      touch &&
      event.target &&
      !scrolledInside(event.target, panel)
        ? { x: touch.clientX, y: touch.clientY }
        : null;
  }

  function onTouchMove(event: TouchEvent) {
    const touch = event.touches.item(0);
    if (!start || !touch) return;
    if (!claimed) {
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      if (dy <= Math.abs(dx) * 1.2) {
        start = null;
        return;
      }
      claimed = true;
    }
    if (event.cancelable) event.preventDefault();
  }

  panel.addEventListener('touchstart', onTouchStart, { passive: true });
  panel.addEventListener('touchmove', onTouchMove, { passive: false });
  return () => {
    panel.removeEventListener('touchstart', onTouchStart);
    panel.removeEventListener('touchmove', onTouchMove);
  };
}

export function Sheet({ label, onClose, children, size = 'part' }: SheetProps) {
  const drag = useDragDismiss('down', onClose);
  const keyboardOpen = useKeyboardOpen();

  return (
    <Modal label={label} onClose={onClose} closeLabel={label}>
      <div
        ref={claimDownwardSwipe}
        style={drag.style}
        {...drag.handlers}
        onPointerDown={(event) => {
          if (scrolledInside(event.target, event.currentTarget)) return;
          if (
            event.pointerType === 'mouse' &&
            (event.target as HTMLElement).closest('textarea, input')
          )
            return;
          drag.handlers.onPointerDown(event);
        }}
        className={`absolute inset-x-0 bottom-0 mx-auto flex w-full max-w-[440px] flex-col overflow-hidden rounded-t-[22px] shadow-[0_-8px_40px_rgba(0,0,0,.25)] motion-safe:animate-sheet-in ${
          size === 'full' ? 'bg-surface' : 'bg-card'
        } ${
          keyboardOpen
            ? 'top-[env(safe-area-inset-top)]'
            : size === 'full'
              ? 'top-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]'
              : 'max-h-[86%] min-h-[min(200px,86%)] pb-[env(safe-area-inset-bottom)]'
        }`}
      >
        <SheetHandle />
        {children}
      </div>
    </Modal>
  );
}

function SheetHandle() {
  return (
    <div
      aria-hidden="true"
      className="flex shrink-0 touch-none justify-center pt-2"
    >
      <span className="block h-1 w-9 rounded-full bg-muted/40" />
    </div>
  );
}

type SheetHeaderProps = {
  title?: string;
  onBack: () => void;
  backLabel: string;
  backIcon?: ReactNode;
  end?: ReactNode;
};

export function SheetHeader({
  title,
  onBack,
  backLabel,
  backIcon,
  end,
}: SheetHeaderProps) {
  return (
    <div className="flex min-h-[60px] touch-none items-center gap-2 px-2 pt-2 pb-1">
      <button
        type="button"
        onClick={onBack}
        aria-label={backLabel}
        className="grid size-11 cursor-pointer place-items-center rounded-xl focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-focus-ring"
      >
        {backIcon ?? <BackArrow />}
      </button>
      {title ? (
        <h2 className="flex-1 text-[26px] leading-7 font-medium">{title}</h2>
      ) : (
        <span className="flex-1" />
      )}
      {end}
    </div>
  );
}

function BackArrow() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-6 fill-none stroke-current stroke-2"
      aria-hidden="true"
    >
      <path d="M19 12H5M11 6l-6 6 6 6" strokeLinecap="round" />
    </svg>
  );
}

export function SheetBody({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">{children}</div>
  );
}
