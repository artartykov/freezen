import type { ReactNode, SyntheticEvent } from 'react';
import { fitToVisibleArea } from '@shared/lib';

function showModal(node: HTMLDialogElement) {
  if (!node.open) {
    node.showModal();
    node
      .querySelector<HTMLElement>('[data-autofocus]')
      ?.focus({ preventScroll: true });
  }
  return fitToVisibleArea(node);
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
};

export function Modal({
  label,
  onClose,
  children,
  closeLabel,
  alert = false,
  onEscape,
}: ModalProps) {
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
        className="absolute inset-0 size-full cursor-default"
      />
      {children}
    </dialog>
  );
}
