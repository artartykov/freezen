import type { ComponentPropsWithoutRef } from 'react';

export function SaveButton(props: ComponentPropsWithoutRef<'button'>) {
  return (
    <button
      type="button"
      {...props}
      className="mr-2 min-h-10 cursor-pointer rounded-full bg-accent px-5 text-[15px] font-bold text-accent-ink disabled:cursor-default disabled:bg-line disabled:text-muted focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
    />
  );
}
