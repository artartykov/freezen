import { BulkActions } from '@widgets/bulk-actions';
import { Drawer } from '@widgets/drawer';
import { Editor } from '@widgets/editor';
import { ItemList, taskItem } from '@widgets/item-list';
import { PageHeader } from '@widgets/page-header';
import { QuickFind } from '@widgets/quick-find';
import { TopBar } from '@widgets/top-bar';
import { CreateTaskButton } from '@features/create-task';
import {
  FilterChips,
  isFiltering,
  useListFilter,
} from '@features/filter-tasks';
import { EmptyTrashButton } from '@features/trash-tasks';
import { useI18n } from '@shared/i18n';
import { todayIso } from '@shared/lib';
import { useOverlay, useUiState } from '@shared/model';
import { findReference, trashContents, useData } from '@shared/storage';
import { ListLayout } from '@shared/ui/ListLayout';

export function TrashPage() {
  const { locale, messages } = useI18n();
  const data = useData();
  const overlay = useOverlay();
  const { filter, setFilter, passes } = useListFilter({ areas: false });
  const context = { data, messages, locale, today: todayIso() };
  const place = messages.places.trash;
  const clearedTrash = useUiState((state) => state.clearedTrash);
  const {
    tasks: all,
    projects,
    references: lists,
    items,
    entries,
  } = trashContents(data, clearedTrash);
  const total = entries.length;
  const shown = all.filter((task) => passes(task));
  const shownProjects = projects.filter((project) => passes(project));
  const shownLists = lists.filter((reference) => passes(reference));
  const shownItems = items.filter((item) => passes(item));

  return (
    <ListLayout
      bar={
        <TopBar
          start={<Drawer />}
          areas={false}
          page="trash"
          title={place.title}
          shareLines={[
            ...shown.map((task) => task.title),
            ...shownProjects.map((project) => project.name),
            ...shownLists.map((reference) => reference.name),
            ...shownItems.map((item) => item.title),
          ]}
        />
      }
      header={<PageHeader title={place.title} subtitle={place.subtitle} />}
      filters={
        <FilterChips
          items={[...all, ...projects, ...lists, ...items]}
          filter={filter}
          onChange={setFilter}
        />
      }
      fab={
        <>
          <EmptyTrashButton keys={entries.map(({ key }) => key)} />
          <CreateTaskButton
            defaults={{ state: 'inbox' }}
            label={messages.common.addTask}
          />
        </>
      }
      overlays={
        <>
          <Editor />
          <BulkActions trash />
          <QuickFind />
        </>
      }
      onPullDown={overlay.openQuickFind}
    >
      <ItemList
        groups={[
          {
            key: 'trash',
            items: shown.map((task) => taskItem(task, context, true)),
          },
          {
            key: 'trash:projects',
            title: messages.search.projects,
            items: shownProjects.map((project) => ({
              kind: 'project' as const,
              project,
            })),
          },
          {
            key: 'trash:lists',
            title: messages.list.lists,
            items: shownLists.map((reference) => ({
              kind: 'reference' as const,
              reference,
            })),
          },
          {
            key: 'trash:items',
            title: messages.search.items,
            items: shownItems.map((item) => ({
              kind: 'item' as const,
              item,
              listName: findReference(data, item.referenceId)?.name,
            })),
          },
        ]}
        empty={
          isFiltering(filter) && total ? messages.list.noMatches : place.empty
        }
      />
    </ListLayout>
  );
}
