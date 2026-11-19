import { Navigate } from '@tanstack/react-router';
import { BulkActions } from '@widgets/bulk-actions';
import { Drawer } from '@widgets/drawer';
import { Editor } from '@widgets/editor';
import { groupTasks, ItemList, splitDone, taskItem } from '@widgets/item-list';
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
import { isInTrashedProject, isLogged, useData } from '@shared/storage';
import { ListLayout } from '@shared/ui/ListLayout';

const allTags = 'all';
const noTags = 'none';

export function TagPage({ tagId }: { tagId: string }) {
  const { locale, messages } = useI18n();
  const data = useData();
  const overlay = useOverlay();
  const { filter, setFilter, passes } = useListFilter({ areas: false });
  const tag = data.tags.find((candidate) => candidate.id === tagId);
  const special = tagId === allTags || tagId === noTags;

  if (!tag && !special) return <Navigate to="/focus" replace />;

  const title =
    tag?.name ??
    (tagId === allTags ? messages.filters.all : messages.filters.noTags);
  const today = todayIso();
  const context = { data, messages, locale, today };
  const all = data.tasks.filter((task) => {
    if (task.trashed || isInTrashedProject(data, task)) return false;
    if (tagId === allTags) return true;
    if (tagId === noTags) return task.tagIds.length === 0;
    return task.tagIds.includes(tagId);
  });
  const live = all.filter((task) => !isLogged(task, data, today));
  const logged = all.filter(
    (task) => isLogged(task, data, today) && passes(task),
  );
  const { open, done } = splitDone(
    live.filter((task) => passes(task)),
    data,
    true,
  );
  const groups = groupTasks(`tag:${tagId}`, open, 'state', context, {
    withProject: true,
  });
  groups.push({
    key: `tag:${tagId}:logged`,
    title: messages.list.logged,
    items: logged.map((task) => taskItem(task, context, true)),
  });

  return (
    <ListLayout
      bar={
        <TopBar
          start={<Drawer />}
          areas={false}
          page="tag"
          title={title}
          shareLines={open.map((task) => task.title)}
          pasteDefaults={tag ? { state: 'inbox', tagIds: [tag.id] } : undefined}
        />
      }
      header={<PageHeader title={title} />}
      filters={
        <FilterChips
          items={all}
          filter={filter}
          onChange={setFilter}
          hiddenTagId={tag?.id}
        />
      }
      fab={
        <CreateTaskButton
          defaults={tag ? { state: 'inbox', tagIds: [tag.id] } : {}}
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
        groups={groups}
        done={done.map((task) => taskItem(task, context, true))}
        empty={
          isFiltering(filter) && all.length
            ? messages.list.noMatches
            : messages.places.inbox.empty
        }
      />
    </ListLayout>
  );
}
