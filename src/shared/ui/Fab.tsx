import type { ComponentPropsWithoutRef } from 'react';

export function Fab(props: ComponentPropsWithoutRef<'button'>) {
  return (
    <button
      type="button"
      {...props}
      className="grid size-16 cursor-pointer place-items-center rounded-full bg-accent text-accent-ink shadow-[0_6px_18px_rgba(0,0,0,.22)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring [&_svg]:size-7"
    />
  );
}
