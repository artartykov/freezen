import type { ComponentPropsWithoutRef } from 'react';

export function IconButton({
  className = '',
  ...props
}: ComponentPropsWithoutRef<'button'>) {
  return (
    <button
      type="button"
      {...props}
      className={`grid size-11 flex-none cursor-pointer place-items-center rounded-xl text-ink focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-focus-ring [&_svg]:size-6 ${className}`}
    />
  );
}
