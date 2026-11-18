import type { ComponentProps, ReactNode } from 'react';
import type { Reference } from '@shared/storage';
import { useI18n } from '@shared/i18n';
import { ReferenceMark } from './Marks';

type ReferenceRowProps = Omit<ComponentProps<'li'>, 'title'> & {
  reference: Reference;
  count: number;
  onOpen: () => void;
  trailing?: ReactNode;
  highlighted?: boolean;
};

export function ReferenceRow({
  reference,
  count,
  onOpen,
  trailing,
  highlighted = false,
  ...rest
}: ReferenceRowProps) {
  const { messages } = useI18n();

  return (
    <li
      {...rest}
      className={`flex touch-pan-y items-start gap-0.5 py-0.5 pr-1 pl-1.5 select-none [-webkit-touch-callout:none] ${highlighted ? 'bg-glow' : 'bg-card'}`}
    >
      <ReferenceMark />
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center rounded-[10px] py-1 pr-1 pl-1.5 text-left font-medium focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-focus-ring"
      >
        <span
          data-row-title
          className="text-[length:var(--row-title-size)] leading-[var(--row-title-line)] [overflow-wrap:anywhere]"
        >
          {reference.name || messages.reference.untitled}{' '}
          <span className="font-normal text-muted">({count})</span>
        </span>
      </button>
      {trailing}
    </li>
  );
}
