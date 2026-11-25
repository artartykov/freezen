import { ArrowRight, MoreHorizontal, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { endSelection } from '@features/select-tasks';
import { useI18n } from '@shared/i18n';
import {
  ActionBar,
  ActionBarButton,
  ActionBarSeparator,
} from '@shared/ui/ActionBar';
import { Menu } from '@shared/ui/Menu';
import type { MenuEntry } from '@shared/ui/Menu';

type SelectionBarProps = {
  count: number;
  label: string;
  trashLabel: string;
  menu: MenuEntry[];
  onMove: () => void;
  onTrash: () => void;
  children?: ReactNode;
};

export function SelectionBar({
  count,
  label,
  trashLabel,
  menu,
  onMove,
  onTrash,
  children,
}: SelectionBarProps) {
  const { messages } = useI18n();

  return (
    <>
      <div
        data-selecting
        className="fixed inset-x-0 top-0 z-20 bg-surface pt-[calc(12px+env(safe-area-inset-top))] min-[768px]:inset-x-auto min-[768px]:left-[calc(50%+var(--page-center-offset)-220px)] min-[768px]:w-[440px]"
      >
        <div className="mx-auto flex min-h-11 w-full max-w-[440px] items-center justify-between px-4">
          <span className="text-lg leading-none font-medium" aria-live="polite">
            {messages.selection.selected(count)}
          </span>
          <button
            type="button"
            onClick={endSelection}
            className="min-h-11 cursor-pointer rounded-[14px] bg-card px-5.5 font-bold text-focus-ring shadow-[0_2px_8px_rgba(0,0,0,.2)]"
          >
            {messages.selection.done}
          </button>
        </div>
      </div>
      <ActionBar
        label={label}
        className="pl-[calc(2*var(--page-center-offset,0px))]"
      >
        <ActionBarButton onClick={onMove}>
          <ArrowRight aria-hidden="true" />
          {messages.editor.move}
        </ActionBarButton>
        <ActionBarSeparator />
        <ActionBarButton onClick={onTrash}>
          <Trash2 aria-hidden="true" />
          {trashLabel}
        </ActionBarButton>
        <ActionBarSeparator />
        <Menu
          label={messages.editor.moreActions}
          trigger={<MoreHorizontal />}
          placement="above"
          triggerClassName="flex min-h-12 min-w-13 cursor-pointer items-center justify-center rounded-full px-4 text-focus-ring [&_svg]:size-6"
          entries={menu}
        />
      </ActionBar>
      {children}
    </>
  );
}
