import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

export type MenuEntry =
  | {
      label: string;
      icon?: ReactNode;
      onSelect: () => void;
      disabled?: boolean;
      checked?: boolean;
    }
  | 'separator';

type Placement = 'below' | 'below-start' | 'above';

type MenuProps = {
  label: string;
  trigger: ReactNode;
  entries: MenuEntry[];
  placement?: Placement;
  triggerClassName?: string;
  heading?: string;
  anchorToContainer?: boolean;
};

const defaultTrigger =
  'grid size-11 cursor-pointer place-items-center rounded-xl focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-focus-ring [&_svg]:size-6';

function position(rect: DOMRect, placement: Placement): CSSProperties {
  const right = Math.max(8, window.innerWidth - rect.right);
  if (placement === 'above')
    return { right, bottom: window.innerHeight - rect.top + 10 };
  if (placement === 'below-start')
    return { left: Math.max(8, rect.left), top: rect.bottom + 6 };
  return { right, top: rect.bottom + 2 };
}

export function Menu({
  label,
  trigger,
  entries,
  placement = 'below',
  triggerClassName = defaultTrigger,
  heading,
  anchorToContainer = false,
}: MenuProps) {
  const [style, setStyle] = useState<CSSProperties | null>(null);
  const open = style !== null;

  return (
    <>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) =>
          setStyle(
            open
              ? null
              : anchorToContainer
                ? placement === 'above'
                  ? { right: 0, bottom: 'calc(100% + 10px)' }
                  : { right: 0, top: '100%' }
                : position(
                    event.currentTarget.getBoundingClientRect(),
                    placement,
                  ),
          )
        }
        className={triggerClassName}
      >
        {trigger}
      </button>
      {style && (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setStyle(null)}
          />
          <ul
            role="menu"
            aria-label={label}
            style={style}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.stopPropagation();
                setStyle(null);
              }
            }}
            className={`${anchorToContainer ? 'absolute' : 'fixed'} z-40 m-0 max-w-[calc(100vw-16px)] list-none rounded-2xl border border-line bg-card text-ink shadow-[0_8px_28px_rgba(0,0,0,.22)] motion-safe:animate-pop ${heading ? 'min-w-58 py-1.5' : 'min-w-62 p-1.5'}`}
          >
            {heading && (
              <li
                role="presentation"
                className="px-5 pt-3 pb-2 text-base leading-[1.2] font-medium text-muted"
              >
                {heading}
              </li>
            )}
            {entries.map((entry, index) =>
              entry === 'separator' ? (
                <li
                  key={`separator-${index}`}
                  role="separator"
                  className={`my-1.5 h-px bg-line ${heading ? '' : 'mx-2.5'}`}
                />
              ) : (
                <li key={entry.label} role="none">
                  <button
                    type="button"
                    role={
                      entry.checked === undefined ? 'menuitem' : 'menuitemradio'
                    }
                    aria-checked={entry.checked}
                    aria-disabled={entry.disabled}
                    ref={index === 0 ? (node) => node?.focus() : undefined}
                    onClick={() => {
                      if (entry.disabled) return;
                      setStyle(null);
                      entry.onSelect();
                    }}
                    className={`flex w-full cursor-pointer items-center gap-3.5 text-left aria-checked:bg-glow aria-disabled:cursor-default aria-disabled:opacity-55 focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-focus-ring [&_svg]:size-6 [&_svg]:text-muted ${heading ? 'min-h-13 px-5 text-lg' : 'min-h-12 rounded-xl px-4 font-medium'}`}
                  >
                    {entry.icon}
                    {entry.label}
                  </button>
                </li>
              ),
            )}
          </ul>
        </>
      )}
    </>
  );
}
