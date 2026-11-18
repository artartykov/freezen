import type { ReactNode } from 'react';

export function RowList({ children }: { children: ReactNode }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-px p-0 [&>li]:rounded-[4px] [&>li:first-child]:rounded-t-[22px] [&>li:last-child]:rounded-b-[22px]">
      {children}
    </ul>
  );
}
