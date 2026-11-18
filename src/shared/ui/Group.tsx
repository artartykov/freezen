import type { ReactNode } from 'react';

type GroupProps = {
  title: ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  toggleLabel: string;
  children: ReactNode;
};

export function Group({
  title,
  collapsed,
  onToggle,
  toggleLabel,
  children,
}: GroupProps) {
  return (
    <section className="mt-5">
      <div className="mb-1 flex min-h-11 items-center">
        <div className="flex min-h-11 min-w-0 flex-1 items-center gap-3 px-2 text-[length:var(--group-title-size)] font-medium">
          {title}
        </div>
        <button
          type="button"
          aria-expanded={!collapsed}
          aria-label={toggleLabel}
          onClick={onToggle}
          className="grid size-11 flex-none cursor-pointer place-items-center rounded-xl text-muted focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className={`size-5 fill-none stroke-current stroke-2 motion-safe:transition-transform ${collapsed ? '-rotate-90' : ''}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>
      {!collapsed && children}
    </section>
  );
}
