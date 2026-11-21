import { BulkActions } from '@widgets/bulk-actions';
import { Drawer } from '@widgets/drawer';
import { Editor } from '@widgets/editor';
import { groupTasks, ItemList, splitDone, taskItem } from '@widgets/item-list';
import type { ListItem } from '@widgets/item-list';
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
import {
  focusProjects,
  focusTasks,
  liveReferenceItems,
  liveReferences,
  useData,
} from '@shared/storage';
import { ListLayout } from '@shared/ui/ListLayout';

export function FocusPage() {
  const { locale, messages } = useI18n();
  const data = useData();
  const overlay = useOverlay();
  const groupBy = useUiState((state) => state.groupBy.focus ?? 'unified');
  const { filter, setFilter, passes } = useListFilter({ areas: true });
  const today = todayIso();
  const context = { data, messages, locale, today };
  const place = messages.places.focus;
  const all = focusTasks(data, today);
  const projects = focusProjects(data, today).filter((project) =>
    passes(project),
  );
  const items = liveReferenceItems(data).filter(
    (item) => item.starred && passes({ ...item, due: null }),
  );
  const { open, done } = splitDone(
    all.filter((task) => passes(task)),
    data,
  );
  const groups = groupTasks('focus', open, groupBy, context);
  const extras: ListItem[] = [
    ...projects.map((project) => ({ kind: 'project' as const, project })),
    ...liveReferences(data)
      .filter(
        (reference) => reference.starred && passes({ ...reference, due: null }),
      )
      .map((reference) => ({ kind: 'reference' as const, reference })),
    ...items.map((item) => ({
      kind: 'item' as const,
      item,
      listName: data.references.find(
        (reference) => reference.id === item.referenceId,
      )?.name,
    })),
  ];
  if (extras.length) groups.push({ key: 'focus:extras', items: extras });

  return (
    <ListLayout
      bar={
        <TopBar
          start={<Drawer />}
          page="focus"
          title={place.title}
          groupModes={['unified', 'project', 'state']}
          defaultGroup="unified"
          shareLines={open.map((task) => task.title)}
          pasteDefaults={{ state: 'next', starred: true }}
        />
      }
      subtitle={place.subtitle}
      filters={
        <FilterChips
          items={[...all, ...projects]}
          filter={filter}
          onChange={setFilter}
        />
      }
      fab={
        <CreateTaskButton
          defaults={{ state: 'next', starred: true }}
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
        emptyCentered={false}
        empty={
          isFiltering(filter) && all.length
            ? messages.list.noMatches
            : place.empty
        }
      />
    </ListLayout>
  );
}
