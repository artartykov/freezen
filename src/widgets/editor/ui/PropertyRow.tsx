import { X } from 'lucide-react';
import type { ReactNode } from 'react';

type PropertyRowProps = {
  icon: ReactNode;
  clearLabel: string;
  onOpen: () => void;
  onClear: () => void;
  children: ReactNode;
};

export function PropertyRow({
  icon,
  clearLabel,
  onOpen,
  onClear,
  children,
}: PropertyRowProps) {
  return (
    <div className="flex min-h-14 items-center border-t border-line pr-2 last-of-type:border-b">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-14 min-w-0 flex-1 cursor-pointer items-center gap-4 pl-4 text-left text-lg [&>svg]:size-6 [&>svg]:flex-none [&>svg]:text-muted"
      >
        {icon}
        {children}
      </button>
      <button
        type="button"
        aria-label={clearLabel}
        onClick={onClear}
        className="grid size-11 flex-none cursor-pointer place-items-center rounded-xl text-muted"
      >
        <X className="size-[22px]" aria-hidden="true" />
      </button>
    </div>
  );
}
