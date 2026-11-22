import { Link } from '@tanstack/react-router';
import { ProgressRing } from '@entities/project';
import { ReferenceItemRow } from '@entities/reference';
import type { ReorderItemProps } from '@features/reorder';
import { useSelection } from '@features/select-tasks';
import { useI18n } from '@shared/i18n';
import { todayIso } from '@shared/lib';
import { useOverlay, useUiState } from '@shared/model';
import {
  openTaskCount,
  projectProgress,
  projectTasks,
  referenceItems,
  useData,
} from '@shared/storage';
import { EmptyState } from '@shared/ui/EmptyState';
import { Group } from '@shared/ui/Group';
import { itemKey } from '../model/types';
import type { ListGroup, ListItem } from '../model/types';
import { ProjectItem } from './ProjectItem';
import { ReferenceItem } from './ReferenceItem';
import { Rows } from './Rows';
import { TaskItem } from './TaskItem';

const noItems: ListItem[] = [];

type ItemListProps = {
  groups: ListGroup[];
  empty: string;
  emptyCentered?: boolean;
  done?: ListItem[];
  completedProjectCount?: boolean;
  reorderable?: boolean;
  selectable?: boolean;
  fromSearch?: boolean;
};

export function ItemList({
  groups,
  empty,
  emptyCentered = true,
  done = noItems,
  completedProjectCount = false,
  reorderable = false,
  selectable = false,
  fromSearch = false,
}: ItemListProps) {
  const selecting = useSelection((state) => state.ids.length > 0);
  const sortable = reorderable && !selecting;
  const { locale, messages } = useI18n();
  const { collapsed, toggleCollapsed } = useUiState();
  const data = useData();
  const overlay = useOverlay();
  const today = todayIso();
  const visible = groups.filter((group) => group.items.length > 0);

  function renderItem(item: ListItem, sort?: ReorderItemProps, lifted = false) {
    switch (item.kind) {
      case 'task':
        return (
          <TaskItem
            key={itemKey(item)}
            task={item.task}
            today={today}
            subtitle={item.subtitle}
            context={item.context}
            sort={sort}
            lifted={lifted}
          />
        );
      case 'project':
        return (
          <ProjectItem
            key={itemKey(item)}
            project={item.project}
            count={
              completedProjectCount
                ? projectTasks(data, item.project.id).length
                : openTaskCount(data, item.project.id)
            }
            subtitle={item.subtitle}
            fromSearch={fromSearch}
            selectable={selectable}
            sort={sort}
            lifted={lifted}
          />
        );
      case 'reference':
        return (
          <ReferenceItem
            key={itemKey(item)}
            reference={item.reference}
            count={referenceItems(data, item.reference.id).length}
            fromSearch={fromSearch}
            selectable={selectable}
            sort={sort}
            lifted={lifted}
          />
        );
      case 'item':
        return (
          <ReferenceItemRow
            key={itemKey(item)}
            item={item.item}
            listName={item.listName}
            {...sort}
            onOpen={() =>
              overlay.openEditor({ kind: 'item', id: item.item.id })
            }
          />
        );
    }
  }

  return (
    <>
      {visible.map((group) =>
        group.title ? (
          <Group
            key={group.key}
            title={
              group.projectId ? (
                <GroupProjectLink
                  projectId={group.projectId}
                  title={group.title}
                  progress={projectProgressOf(group.projectId)}
                />
              ) : (
                group.title
              )
            }
            collapsed={!!collapsed[group.key]}
            onToggle={() => toggleCollapsed(group.key)}
            toggleLabel={messages.list.collapse(group.title)}
          >
            <Rows
              items={group.items}
              reorderable={sortable}
              render={renderItem}
            />
            {group.footer && (
              <p className="mx-2 mt-5 flex items-center gap-3 text-[15px] text-muted">
                {group.footer}
              </p>
            )}
          </Group>
        ) : (
          <div key={group.key} className="mt-1">
            <Rows
              items={group.items}
              reorderable={sortable}
              render={renderItem}
            />
          </div>
        ),
      )}
      {visible.length === 0 && (
        <EmptyState text={empty} centered={emptyCentered} />
      )}
      {done.length > 0 && (
        <Group
          title={messages.list.done}
          collapsed={collapsed.done ?? true}
          onToggle={() => toggleCollapsed('done', true)}
          collapsedCount={done.length.toLocaleString(locale)}
          toggleLabel={messages.list.collapse(messages.list.done)}
        >
          <Rows items={done} reorderable={false} render={renderItem} />
        </Group>
      )}
    </>
  );

  function projectProgressOf(projectId: string) {
    const project = data.projects.find(
      (candidate) => candidate.id === projectId,
    );
    return project ? projectProgress(data, project) : 0;
  }
}

function GroupProjectLink({
  projectId,
  title,
  progress,
}: {
  projectId: string;
  title: string;
  progress: number;
}) {
  return (
    <Link
      to="/project/$projectId"
      params={{ projectId }}
      className="flex min-h-11 min-w-0 items-center gap-3 rounded-[10px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
    >
      <ProgressRing progress={progress} done={false} />
      <span className="truncate">{title}</span>
    </Link>
  );
}
