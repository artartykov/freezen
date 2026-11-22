import { useId } from 'react';
import type { ReactNode } from 'react';

type GroupProps = {
  title: ReactNode;
  collapsed: boolean;
  collapsedCount?: string;
  onToggle: () => void;
  toggleLabel: string;
  children: ReactNode;
};

export function Group({
  title,
  collapsed,
  collapsedCount,
  onToggle,
  toggleLabel,
  children,
}: GroupProps) {
  const countId = useId();
  const count = collapsed ? collapsedCount : undefined;

  return (
    <section className="mt-5">
      <div
        className={`mb-1 flex min-h-11 items-center ${collapsed ? 'rounded-[8px] bg-card' : ''}`}
      >
        <div className="flex min-h-11 min-w-0 flex-1 items-center gap-3 px-2 text-[length:var(--group-title-size)] font-medium">
          {title}
        </div>
        <button
          type="button"
          aria-expanded={!collapsed}
          aria-label={toggleLabel}
          aria-describedby={count ? countId : undefined}
          onClick={onToggle}
          className="flex h-11 min-w-11 flex-none cursor-pointer items-center justify-center gap-3 rounded-xl px-3 text-muted focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          {count ? <span id={countId}>{count}</span> : null}
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
