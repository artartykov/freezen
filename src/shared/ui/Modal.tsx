import { useCallback } from 'react';
import type { ReactNode, SyntheticEvent } from 'react';
import { fitToVisibleArea } from '@shared/lib';

const openDialogs = new Set<HTMLDialogElement>();

function handleEscape(event: KeyboardEvent) {
  if (event.key !== 'Escape' || event.isComposing) return;
  const top = [...openDialogs].reverse().find((dialog) => dialog.open);
  if (!top) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (!event.repeat)
    top.dispatchEvent(new Event('cancel', { cancelable: true }));
}

function watchEscape(node: HTMLDialogElement) {
  if (!openDialogs.size)
    window.addEventListener('keydown', handleEscape, { capture: true });
  openDialogs.add(node);
  return () => {
    openDialogs.delete(node);
    if (!openDialogs.size)
      window.removeEventListener('keydown', handleEscape, { capture: true });
  };
}

function openModal(node: HTMLDialogElement, suppressFocus: boolean) {
  if (!node.open) {
    node.showModal();
    node
      .querySelector<HTMLElement>('[data-autofocus]')
      ?.focus({ preventScroll: true });
    if (
      suppressFocus &&
      document.activeElement instanceof HTMLElement &&
      node.contains(document.activeElement)
    ) {
      document.activeElement.blur();
    }
  }
  const unwatchEscape = watchEscape(node);
  const stopFitting = fitToVisibleArea(node);
  return () => {
    unwatchEscape();
    stopFitting();
  };
}

function stopPropagation(event: SyntheticEvent) {
  event.stopPropagation();
}

type ModalProps = {
  label: string;
  onClose: () => void;
  children: ReactNode;
  closeLabel: string;
  alert?: boolean;
  onEscape?: () => void;
  suppressFocus?: boolean;
};

export function Modal({
  label,
  onClose,
  children,
  closeLabel,
  alert = false,
  onEscape,
  suppressFocus = false,
}: ModalProps) {
  const showModal = useCallback(
    (node: HTMLDialogElement) => openModal(node, suppressFocus),
    [suppressFocus],
  );
  function handleCancel(event: SyntheticEvent) {
    event.preventDefault();
    event.stopPropagation();
    (onEscape ?? onClose)();
  }

  return (
    <dialog
      ref={showModal}
      role={alert ? 'alertdialog' : undefined}
      aria-label={label}
      onCancel={handleCancel}
      onPointerDown={stopPropagation}
      onTouchStart={stopPropagation}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-hidden border-0 bg-transparent p-0 text-ink backdrop:bg-black/40"
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label={closeLabel}
        onClick={onClose}
        className="absolute inset-0 size-full cursor-default outline-none"
      />
      {children}
    </dialog>
  );
}
