import {
  ClipboardPaste,
  Eye,
  Heart,
  History,
  Palette,
  Share2,
} from 'lucide-react';
import { confirmLogCompleted } from '@features/log-completed';
import { pasteTasks, shareTasks } from '@features/import-export';
import type { Messages } from '@shared/i18n';
import { askConfirm } from '@shared/model';
import type { Task } from '@shared/storage';
import type { MenuEntry } from '@shared/ui/Menu';

type MoreMenuOptions = {
  messages: Messages;
  title: string;
  loggable: boolean;
  shareLines?: string[];
  pasteDefaults?: Partial<Task>;
  openSheet: (sheet: 'view' | 'appearance') => void;
};

export function moreMenu({
  messages,
  title,
  loggable,
  shareLines,
  pasteDefaults,
  openSheet,
}: MoreMenuOptions) {
  const entries: MenuEntry[] = [
    {
      label: messages.topBar.viewOptions,
      icon: <Eye />,
      onSelect: () => openSheet('view'),
    },
    {
      label: messages.topBar.theme,
      icon: <Palette />,
      onSelect: () => openSheet('appearance'),
    },
    'separator',
    {
      label: messages.topBar.logCompleted,
      icon: <History />,
      disabled: !loggable,
      onSelect: () => confirmLogCompleted(messages),
    },
    'separator',
    {
      label: messages.topBar.upgrade,
      icon: <Heart />,
      onSelect: () =>
        askConfirm({
          title: messages.topBar.upgrade,
          text: messages.topBar.upgradeText,
          confirm: messages.common.ok,
          cancel: '',
          onConfirm: () => undefined,
        }),
    },
  ];
  if (pasteDefaults) {
    entries.push({
      label: messages.topBar.paste,
      icon: <ClipboardPaste />,
      onSelect: () => pasteTasks(pasteDefaults, messages),
    });
  }
  if (shareLines) {
    entries.push({
      label: messages.topBar.share,
      icon: <Share2 />,
      onSelect: () => shareTasks(shareLines, title),
    });
  }
  return entries;
}
