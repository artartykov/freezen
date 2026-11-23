import type { ReactNode, Ref } from 'react';
import { Modal } from './Modal';

type DialogProps = {
  title: string;
  text?: string;
  onClose: () => void;
  onEscape?: () => void;
  actions: ReactNode;
  children?: ReactNode;
  kicker?: boolean;
  suppressFocus?: boolean;
  panelRef?: Ref<HTMLDivElement>;
};

export function Dialog({
  title,
  text,
  onClose,
  onEscape,
  actions,
  children,
  kicker = false,
  suppressFocus,
  panelRef,
}: DialogProps) {
  return (
    <Modal
      label={title}
      onClose={onClose}
      onEscape={onEscape}
      closeLabel={title}
      alert
      suppressFocus={suppressFocus}
    >
      <div
        className={`pointer-events-none absolute inset-0 grid place-items-center-safe overflow-y-auto ${kicker ? 'p-4' : 'p-6'}`}
      >
        <div
          ref={panelRef}
          className={`pointer-events-auto bg-card shadow-[0_12px_40px_rgba(0,0,0,.3)] motion-safe:animate-pop ${
            kicker
              ? 'w-[min(100%,360px)] rounded-[28px] px-5 pt-6 pb-3'
              : 'w-[min(100%,328px)] rounded-[22px] p-6 pb-3'
          }`}
        >
          {kicker ? (
            <h2 className="mx-1 text-sm leading-none font-medium tracking-[.04em] text-muted uppercase">
              {title}
            </h2>
          ) : (
            <h2 className="mb-3 text-[22px] leading-7 font-medium">{title}</h2>
          )}
          {text && <p className="mb-5 text-muted">{text}</p>}
          {children}
          <div className={`flex justify-end gap-1 ${kicker ? 'mt-2' : ''}`}>
            {actions}
          </div>
        </div>
      </div>
    </Modal>
  );
}

type TextButtonProps = {
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
};

export function TextButton({
  children,
  onClick,
  danger,
  disabled,
}: TextButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-11 cursor-pointer rounded-[10px] px-3.5 text-[15px] font-bold disabled:cursor-default disabled:opacity-45 focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-focus-ring ${
        danger ? 'text-danger' : 'text-focus-ring'
      }`}
    >
      {children}
    </button>
  );
}
