import { MoreVertical } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
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
  titleInBar?: boolean;
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
  titleInBar = true,
  groupModes = noGroupModes,
  defaultGroup = 'unified',
  shareLines,
  pasteDefaults,
  end,
  areas = true,
  sortList,
}: TopBarProps) {
  const { messages } = useI18n();
  const [sheet, setSheet] = useState<'view' | 'appearance' | null>(null);
  const loggable = useData((data) =>
    hasLoggable(data.tasks.filter((task) => !isInTrashedProject(data, task))),
  );
  const entries = moreMenu({
    messages,
    title,
    loggable,
    shareLines,
    pasteDefaults,
    openSheet: setSheet,
  });

  return (
    <div className="-mx-2 flex min-h-11 items-center gap-1">
      <div className="flex shrink-0 items-center">
        {start}
        <BackToSearch />
      </div>
      {titleInBar && (
        <h1 className="min-w-0 flex-1 truncate text-[length:var(--top-bar-title-size)] leading-tight font-medium">
          {title}
        </h1>
      )}
      <div className="ml-auto flex min-w-0 items-center gap-0.5">
        {areas && <AreaMenu />}
        {end}
        <div className="shrink-0">
          <Menu
            label={messages.topBar.more}
            trigger={<MoreVertical />}
            entries={entries}
          />
        </div>
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
