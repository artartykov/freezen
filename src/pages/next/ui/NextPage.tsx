import { BulkActions } from '@widgets/bulk-actions';
import { Drawer } from '@widgets/drawer';
import { Editor } from '@widgets/editor';
import { groupTasks, ItemList, splitDone, taskItem } from '@widgets/item-list';
import type { ListGroup } from '@widgets/item-list';
import { PageHeader } from '@widgets/page-header';
import { QuickFind } from '@widgets/quick-find';
import { TopBar } from '@widgets/top-bar';
import { CreateTaskButton } from '@features/create-task';
import {
  FilterChips,
  isFiltering,
  useListFilter,
} from '@features/filter-tasks';
import { useI18n } from '@shared/i18n';
import { todayIso } from '@shared/lib';
import { useOverlay, useUiState } from '@shared/model';
import { stateTasks, useData, isFirstAction } from '@shared/storage';
import { ListLayout } from '@shared/ui/ListLayout';

export function NextPage() {
  const { locale, messages } = useI18n();
  const data = useData();
  const overlay = useOverlay();
  const groupBy = useUiState((state) => state.groupBy.next ?? 'project');
  const { filter, setFilter, passes } = useListFilter({ areas: true });
  const today = todayIso();
  const context = { data, messages, locale, today };
  const place = messages.places.next;
  const all = stateTasks(data, 'next', today).filter(
    (task) => groupBy !== 'sequential' || isFirstAction(task, data, today),
  );
  const { open, done } = splitDone(
    all.filter((task) => passes(task)),
    data,
  );
  const groups: ListGroup[] = groupTasks('next', open, groupBy, context);

  return (
    <ListLayout
      bar={
        <TopBar
          start={<Drawer />}
          page="next"
          title={place.title}
          groupModes={['unified', 'project', 'sequential']}
          defaultGroup="project"
          shareLines={open.map((task) => task.title)}
          pasteDefaults={{ state: 'next' }}
        />
      }
      header={<PageHeader title={place.title} subtitle={place.subtitle} />}
      filters={<FilterChips items={all} filter={filter} onChange={setFilter} />}
      fab={
        <CreateTaskButton
          defaults={{ state: 'next' }}
          label={messages.common.addTask}
        />
      }
      overlays={
        <>
          <Editor />
          <BulkActions />
          <QuickFind />
        </>
      }
      onPullDown={overlay.openQuickFind}
    >
      <ItemList
        reorderable
        groups={groups}
        done={done.map((task) => taskItem(task, context))}
        empty={
          isFiltering(filter) && all.length
            ? messages.list.noMatches
            : place.empty
        }
      />
    </ListLayout>
  );
}
