import { MoreVertical } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { openCapture } from '@features/voice-capture';
import { hasLoggable } from '@features/log-completed';
import { useI18n } from '@shared/i18n';
import type { GroupMode } from '@shared/model';
import { isInTrashedProject, useData } from '@shared/storage';
import type { Task } from '@shared/storage';
import { Menu } from '@shared/ui/Menu';
import { AppearanceSheet } from './AppearanceSheet';
import { AreaMenu } from './AreaMenu';
import { BackToSearch } from './BackToSearch';
import { moreMenu } from './moreMenu';
import { ViewOptionsSheet } from './ViewOptionsSheet';

const noGroupModes: GroupMode[] = [];

type TopBarProps = {
  start: ReactNode;
  page: string;
  title: string;
  groupModes?: GroupMode[];
  defaultGroup?: GroupMode;
  shareLines?: string[];
  pasteDefaults?: Partial<Task>;
  end?: ReactNode;
  areas?: boolean;
  sortList?: 'projects' | 'references';
};

export function TopBar({
  start,
  page,
  title,
  groupModes = noGroupModes,
  defaultGroup = 'unified',
  shareLines,
  pasteDefaults,
  end,
  areas = true,
  sortList,
}: TopBarProps) {
  const { messages, locale } = useI18n();
  const [sheet, setSheet] = useState<'view' | 'appearance' | null>(null);
  const loggable = useData((data) =>
    hasLoggable(data.tasks.filter((task) => !isInTrashedProject(data, task))),
  );
  const aiEnabled = useData((data) => data.settings.ai.enabled);
  const entries = moreMenu({
    messages,
    title,
    loggable,
    shareLines,
    pasteDefaults,
    capture: aiEnabled ? () => void openCapture(locale) : undefined,
    openSheet: setSheet,
  });

  return (
    <div className="-mx-2 flex items-center justify-between">
      <div className="flex items-center">
        {start}
        <BackToSearch />
      </div>
      <div className="flex items-center gap-0.5">
        {areas && <AreaMenu />}
        {end}
        <Menu
          label={messages.topBar.more}
          trigger={<MoreVertical />}
          entries={entries}
        />
      </div>
      {sheet === 'view' && (
        <ViewOptionsSheet
          page={page}
          modes={groupModes}
          defaultMode={defaultGroup}
          sortList={sortList}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'appearance' && (
        <AppearanceSheet onClose={() => setSheet(null)} />
      )}
    </div>
  );
}
