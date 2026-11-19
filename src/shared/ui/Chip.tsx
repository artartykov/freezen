import type { ComponentPropsWithoutRef } from 'react';

const chipClass =
  'min-h-7 flex-none cursor-pointer rounded-full border-[1.5px] border-line bg-card px-3 text-sm font-medium focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

export function Chip({
  pressed,
  ...props
}: ComponentPropsWithoutRef<'button'> & { pressed: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      {...props}
      className={`${chipClass} aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-accent-ink`}
    />
  );
}

export const chipLinkClass = `${chipClass} inline-flex items-center aria-[current=page]:border-accent aria-[current=page]:bg-accent aria-[current=page]:text-accent-ink`;
