import { ProjectBulkActions } from '@widgets/bulk-actions';
import { Drawer } from '@widgets/drawer';
import { Editor } from '@widgets/editor';
import { ItemList } from '@widgets/item-list';
import { QuickFind } from '@widgets/quick-find';
import { TopBar } from '@widgets/top-bar';
import { CreateProjectButton } from '@features/create-project';
import {
  FilterChips,
  isFiltering,
  useListFilter,
} from '@features/filter-tasks';
import { useI18n } from '@shared/i18n';
import { todayIso } from '@shared/lib';
import { useOverlay, useUiState } from '@shared/model';
import { activeProjects, useData } from '@shared/storage';
import type { ProjectState } from '@shared/storage';
import { ListLayout } from '@shared/ui/ListLayout';

const states: ProjectState[] = [
  'next',
  'later',
  'scheduled',
  'someday',
  'waiting',
];

export function ProjectsPage() {
  const { messages } = useI18n();
  const data = useData();
  const overlay = useOverlay();
  const { filter, setFilter, passes } = useListFilter({ areas: true });
  const place = messages.places.projects;
  const all = activeProjects(data, todayIso());
  const alphabetical = useUiState((state) => state.sort.projects === 'alpha');
  const filtered = all.filter((project) => passes(project));
  const shown = alphabetical
    ? [...filtered].sort((a, b) => a.name.localeCompare(b.name))
    : filtered;

  return (
    <ListLayout
      bar={
        <TopBar
          start={<Drawer />}
          page="projects"
          sortList="projects"
          title={place.title}
          shareLines={shown.map((project) => project.name)}
        />
      }
      subtitle={place.subtitle}
      filters={<FilterChips items={all} filter={filter} onChange={setFilter} />}
      fab={<CreateProjectButton label={messages.common.addProject} />}
      overlays={
        <>
          <Editor />
          <ProjectBulkActions />
          <QuickFind />
        </>
      }
      onPullDown={overlay.openQuickFind}
    >
      <ItemList
        reorderable={!alphabetical}
        selectable
        groups={states.map((state) => ({
          key: `projects:${state}`,
          title: messages.places[state].title,
          items: shown
            .filter((project) => project.state === state)
            .map((project) => ({ kind: 'project' as const, project })),
        }))}
        empty={
          isFiltering(filter) && all.length
            ? messages.list.noMatches
            : place.empty
        }
      />
    </ListLayout>
  );
}
