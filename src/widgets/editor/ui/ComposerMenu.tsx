import { useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { Check } from 'lucide-react';

export const composerChip =
  'inline-flex min-h-10 flex-none cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl bg-surface px-2.5 text-sm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring [&_svg]:size-5 [&_svg]:shrink-0';

export type ComposerEntry = {
  key: string;
  label: string;
  icon: ReactNode;
  checked?: boolean;
  onSelect: () => void;
};

export function ComposerMenu({
  label,
  trigger,
  entries,
  onDismiss,
  className = composerChip,
}: {
  label: string;
  trigger: ReactNode;
  entries: ComposerEntry[];
  onDismiss: () => void;
  className?: string;
}) {
  const id = useId();
  const popup = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  function position() {
    const menu = popup.current;
    const anchor = button.current?.getBoundingClientRect();
    if (!menu || !anchor) return;
    const viewport = window.visualViewport;
    const top = viewport?.offsetTop ?? 0;
    const available = anchor.top - top - 16;
    const columns = available < entries.length * 40 + 12 ? 2 : 1;
    menu.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
    const width = columns === 2 ? 328 : 252;
    menu.style.width = `min(${width}px, calc(100vw - 24px))`;
    menu.style.left = `${Math.max(12, Math.min(anchor.left, window.innerWidth - width - 12))}px`;
    const menuHeight = Math.ceil(entries.length / columns) * 40 + 12;
    menu.style.top = `${Math.max(top + 8, anchor.top - menuHeight - 8)}px`;
  }

  return (
    <>
      <button
        type="button"
        ref={button}
        className={className}
        aria-label={label}
        aria-haspopup="menu"
        popoverTarget={id}
        onClick={position}
      >
        {trigger}
      </button>
      <div
        id={id}
        ref={popup}
        popover="auto"
        role="menu"
        aria-label={label}
        data-composer-menu
        onToggle={(event) => {
          if (event.newState === 'closed') onDismiss();
        }}
        className="fixed inset-auto m-0 max-h-none max-w-none overflow-visible rounded-2xl border border-line bg-card p-1.5 text-ink shadow-[0_8px_28px_rgba(0,0,0,.22)] open:grid"
      >
        {entries.map((entry) => (
          <button
            key={entry.key}
            type="button"
            role={entry.checked === undefined ? 'menuitem' : 'menuitemradio'}
            aria-checked={entry.checked}
            onClick={() => {
              popup.current?.hidePopover();
              entry.onSelect();
            }}
            className="flex min-h-10 min-w-0 cursor-pointer items-center gap-2 rounded-xl px-2 text-left text-sm hover:bg-surface aria-checked:bg-glow focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring [&_svg]:size-5 [&_svg]:shrink-0"
          >
            {entry.icon}
            <span className="min-w-0 flex-1 truncate" title={entry.label}>
              {entry.label}
            </span>
            {entry.checked && (
              <Check aria-hidden="true" className="text-focus-ring" />
            )}
          </button>
        ))}
      </div>
    </>
  );
}
