import { Navigate } from '@tanstack/react-router';
import { BulkActions } from '@widgets/bulk-actions';
import { Drawer } from '@widgets/drawer';
import { Editor } from '@widgets/editor';
import { groupTasks, ItemList, splitDone, taskItem } from '@widgets/item-list';
import { ProjectHeader } from '@widgets/page-header';
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
import { isLogged, projectTasks, useData } from '@shared/storage';
import { ListLayout } from '@shared/ui/ListLayout';

export function ProjectPage({ projectId }: { projectId: string }) {
  const { locale, messages } = useI18n();
  const data = useData();
  const overlay = useOverlay();
  const { filter, setFilter, passes } = useListFilter({ areas: false });
  const project = data.projects.find((candidate) => candidate.id === projectId);

  if (!project || project.trashed) return <Navigate to="/focus" replace />;

  const today = todayIso();
  const context = { data, messages, locale, today };
  const all = projectTasks(data, project.id);
  const live = all.filter((task) => !isLogged(task, data, today));
  const logged = all.filter(
    (task) => isLogged(task, data, today) && passes(task),
  );
  const { open, done } = splitDone(
    live.filter((task) => passes(task)),
    data,
    true,
  );
  const groups = groupTasks(`project:${project.id}`, open, 'state', context, {
    nextUp: project.sequential,
  });
  groups.push({
    key: `project:${project.id}:logged`,
    title: messages.list.logged,
    items: logged.map((task) => taskItem(task, context)),
  });

  return (
    <ListLayout
      bar={
        <TopBar
          start={<Drawer />}
          areas={false}
          page="project"
          title={project.name}
          shareLines={open.map((task) => task.title)}
          pasteDefaults={{ state: 'next', projectId: project.id }}
        />
      }
      header={<ProjectHeader project={project} />}
      filters={<FilterChips items={all} filter={filter} onChange={setFilter} />}
      fab={
        <CreateTaskButton
          defaults={{ state: 'next', projectId: project.id }}
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
            : messages.places.inbox.empty
        }
      />
    </ListLayout>
  );
}
