import { useRef, useState } from 'react';
import { useI18n } from '@shared/i18n';
import { useSaveStatus } from '@shared/storage';
import { Dialog } from '@shared/ui/Dialog';

export function SaveErrorDialog({
  onClose,
  dismissed,
  onResolved,
}: {
  onClose: () => void;
  dismissed: boolean;
  onResolved?: () => void;
}) {
  const {
    messages: { storage: m },
  } = useI18n();
  const panel = useRef<HTMLDivElement>(null);
  const [retrying, setRetrying] = useState(false);
  const failed = useSaveStatus((status) => status.kind === 'failed');

  async function retry() {
    const status = useSaveStatus.getState();
    if (status.kind !== 'failed') return;
    setRetrying(true);
    try {
      await Promise.all([
        status.retry(),
        new Promise<void>((resolve) => setTimeout(resolve, 500)),
      ]);
      if (
        useSaveStatus.getState().kind === 'failed' &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        panel.current?.animate(
          [0, -4, 4, -2, 0].map((x) => ({ transform: `translateX(${x}px)` })),
          { duration: 260, easing: 'ease-out' },
        );
      }
    } finally {
      setRetrying(false);
      if (onResolved && useSaveStatus.getState().kind === 'saved')
        requestAnimationFrame(onResolved);
    }
  }

  if (dismissed || (!failed && !retrying)) return null;

  return (
    <Dialog
      title={m.saveFailed}
      onClose={onClose}
      suppressFocus
      panelRef={panel}
      actions={
        <button
          type="button"
          className="min-h-11 cursor-pointer rounded-[10px] text-[15px] font-bold text-focus-ring underline focus-visible:outline-3 focus-visible:outline-focus-ring disabled:opacity-50"
          onClick={() => void retry()}
          disabled={retrying}
        >
          {retrying ? m.retrying : m.retry}
        </button>
      }
    />
  );
}
