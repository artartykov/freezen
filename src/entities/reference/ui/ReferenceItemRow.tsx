import type { ComponentProps, ReactNode } from 'react';
import type { ReferenceItem } from '@shared/storage';
import { useI18n } from '@shared/i18n';
import { ReferenceItemMark } from './Marks';

type ReferenceItemRowProps = Omit<ComponentProps<'li'>, 'title'> & {
  item: ReferenceItem;
  onOpen: () => void;
  listName?: string;
  trailing?: ReactNode;
};

export function ReferenceItemRow({
  item,
  onOpen,
  listName,
  trailing,
  ...rest
}: ReferenceItemRowProps) {
  const { messages } = useI18n();

  return (
    <li
      {...rest}
      className="flex touch-pan-y items-start gap-0.5 bg-card py-0.5 pr-1 pl-1.5 select-none [-webkit-touch-callout:none]"
    >
      <ReferenceItemMark />
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center rounded-[10px] px-3 py-3.5 text-left font-medium focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-focus-ring"
      >
        <span
          data-row-title
          className="text-[length:var(--row-title-size)] leading-[var(--row-title-line)] [overflow-wrap:anywhere]"
        >
          {item.title || messages.reference.itemUntitled}
          {listName && (
            <span className="ml-2 text-sm font-normal text-someday">
              {listName}
            </span>
          )}
        </span>
      </button>
      {trailing}
    </li>
  );
}
