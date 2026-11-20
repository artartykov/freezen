import type { ComponentPropsWithRef } from 'react';

export function AutoTextarea({
  className = '',
  ...props
}: ComponentPropsWithRef<'textarea'>) {
  return (
    <textarea
      rows={1}
      {...props}
      className={`block resize-none rounded-lg border-0 bg-transparent text-ink outline-0 [field-sizing:content] placeholder:text-muted placeholder:opacity-70 ${className}`}
    />
  );
}
