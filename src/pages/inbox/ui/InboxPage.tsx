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
import { useOverlay } from '@shared/model';
import { stateTasks, useData } from '@shared/storage';
import { ListLayout } from '@shared/ui/ListLayout';

export function InboxPage() {
  const { locale, messages } = useI18n();
  const data = useData();
  const overlay = useOverlay();
  const { filter, setFilter, passes } = useListFilter({ areas: false });
  const today = todayIso();
  const context = { data, messages, locale, today };
  const place = messages.places.inbox;
  const all = stateTasks(data, 'inbox', today);
  const { open, done } = splitDone(
    all.filter((task) => passes(task)),
    data,
  );
  const groups: ListGroup[] = groupTasks('inbox', open, 'unified', context);

  return (
    <ListLayout
      bar={
        <TopBar
          start={<Drawer />}
          areas={false}
          page="inbox"
          title={place.title}
          groupModes={[]}
          defaultGroup="unified"
          shareLines={open.map((task) => task.title)}
          pasteDefaults={{ state: 'inbox' }}
        />
      }
      header={<PageHeader title={place.title} subtitle={place.subtitle} />}
      filters={<FilterChips items={all} filter={filter} onChange={setFilter} />}
      fab={<CreateTaskButton label={messages.common.addTask} />}
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
