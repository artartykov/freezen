import type { ReactNode } from 'react';

type PropertyRowProps = {
  icon: ReactNode;
  empty?: boolean;
  onOpen: () => void;
  children: ReactNode;
};

export function PropertyRow({
  icon,
  empty = false,
  onOpen,
  children,
}: PropertyRowProps) {
  return (
    <div className="flex min-h-14 items-center pr-2">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-14 min-w-0 flex-1 cursor-pointer items-center gap-4 pl-4 text-left text-base"
      >
        <span
          className={`inline-flex size-6 shrink-0 items-center justify-center text-muted [&>svg]:size-6 ${empty ? 'opacity-25' : ''}`}
        >
          {icon}
        </span>
        {children}
      </button>
    </div>
  );
}
