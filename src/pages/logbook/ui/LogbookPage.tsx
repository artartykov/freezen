import { BulkActions } from '@widgets/bulk-actions';
import { Drawer } from '@widgets/drawer';
import { Editor } from '@widgets/editor';
import { ItemList } from '@widgets/item-list';
import type { ListGroup } from '@widgets/item-list';
import { QuickFind } from '@widgets/quick-find';
import { TopBar } from '@widgets/top-bar';
import { CreateTaskButton } from '@features/create-task';
import {
  FilterChips,
  isFiltering,
  useListFilter,
} from '@features/filter-tasks';
import { formatDate, useI18n } from '@shared/i18n';
import { addDays, dayOfTimestamp, todayIso } from '@shared/lib';
import { useOverlay } from '@shared/model';
import {
  findProject,
  logbookProjects,
  logbookTasks,
  useData,
} from '@shared/storage';
import { ListLayout } from '@shared/ui/ListLayout';

export function LogbookPage() {
  const { locale, messages } = useI18n();
  const data = useData();
  const overlay = useOverlay();
  const { filter, setFilter, passes } = useListFilter({ areas: true });
  const today = todayIso();
  const place = messages.places.logbook;
  const tasks = logbookTasks(data, today);
  const projects = logbookProjects(data, today);
  const entries = [
    ...tasks
      .filter((task) => passes(task))
      .map((task) => ({
        day: dayOfTimestamp(task.completedAt ?? new Date().toISOString()),
        at: task.completedAt ?? '',
        task,
      })),
    ...projects
      .filter((project) => passes(project))
      .map((project) => ({
        day: dayOfTimestamp(project.completedAt ?? new Date().toISOString()),
        at: project.completedAt ?? '',
        project,
      })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const days = [...new Set(entries.map((entry) => entry.day))];

  function dayTitle(day: string) {
    if (day === today) return messages.list.today;
    if (day === addDays(today, -1)) return messages.list.yesterday;
    return formatDate(day, locale);
  }

  const groups: ListGroup[] = days.map((day) => ({
    key: `logbook:${day}`,
    title: dayTitle(day),
    items: entries
      .filter((entry) => entry.day === day)
      .map((entry) =>
        'task' in entry
          ? {
              kind: 'task' as const,
              task: entry.task,
              context: findProject(data, entry.task.projectId)?.name,
              subtitle: messages.task.completedOn(
                formatDate(entry.day, locale),
              ),
            }
          : {
              kind: 'project' as const,
              project: entry.project,
              subtitle: messages.task.completedOn(
                formatDate(entry.day, locale),
              ),
            },
      ),
  }));

  return (
    <ListLayout
      bar={
        <TopBar
          start={<Drawer />}
          page="logbook"
          title={place.title}
          shareLines={tasks.map((task) => task.title)}
        />
      }
      subtitle={place.subtitle}
      filters={
        <FilterChips
          items={[...tasks, ...projects]}
          filter={filter}
          onChange={setFilter}
        />
      }
      fab={
        <CreateTaskButton
          defaults={{ completedAt: new Date().toISOString(), logged: true }}
          label={messages.common.addTask}
        />
      }
      overlays={
        <>
          <Editor />
          <BulkActions logbook />
          <QuickFind />
        </>
      }
      onPullDown={overlay.openQuickFind}
    >
      <ItemList
        groups={groups}
        completedProjectCount
        empty={
          isFiltering(filter) && tasks.length
            ? messages.list.noMatches
            : place.empty
        }
      />
    </ListLayout>
  );
}
