import type { ComponentPropsWithoutRef } from 'react';

export function Button({
  className = '',
  type = 'button',
  ...props
}: ComponentPropsWithoutRef<'button'>) {
  return (
    <button
      {...props}
      type={type}
      className={`min-h-14 w-full cursor-pointer rounded-[18px] bg-accent text-[17px] font-bold text-accent-ink focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus-ring active:scale-[0.98] motion-safe:transition-transform motion-safe:duration-[120ms] ${className}`}
    />
  );
}
