import type { ReactNode } from 'react';

type HeaderCardProps = {
  mark: ReactNode;
  title: string;
  note: string;
  editLabel: string;
  onEdit: () => void;
  meta?: ReactNode;
  footer?: ReactNode;
  end?: ReactNode;
};

export function HeaderCard({
  mark,
  title,
  note,
  editLabel,
  onEdit,
  meta,
  footer,
  end,
}: HeaderCardProps) {
  return (
    <div className="relative mt-3 rounded-[22px] bg-card">
      <div className="absolute top-1.5 left-1.5">{mark}</div>
      <button
        type="button"
        onClick={onEdit}
        aria-label={editLabel}
        className="block w-full cursor-pointer rounded-[22px] pt-4 pr-14 pb-4.5 pl-15 text-left focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
      >
        <h1 className="text-[22px] leading-7 font-medium">{title}</h1>
        {note && (
          <p className="mt-2 text-[length:var(--row-meta-size)] leading-[var(--card-note-line)] text-muted">
            {note}
          </p>
        )}
        {meta}
      </button>
      {footer && <div className="pr-4 pb-4.5 pl-15">{footer}</div>}
      {end && <div className="absolute top-1.5 right-1.5">{end}</div>}
    </div>
  );
}
