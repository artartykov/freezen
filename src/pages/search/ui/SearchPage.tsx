import { Search, X } from 'lucide-react';
import { BulkActions } from '@widgets/bulk-actions';
import { Drawer } from '@widgets/drawer';
import { Editor } from '@widgets/editor';
import { groupTasks, ItemList } from '@widgets/item-list';
import { PageHeader } from '@widgets/page-header';
import { TopBar } from '@widgets/top-bar';
import { CreateTaskButton } from '@features/create-task';
import { FilterChips, useListFilter } from '@features/filter-tasks';
import { useI18n } from '@shared/i18n';
import { todayIso } from '@shared/lib';
import { searchData, useData } from '@shared/storage';
import { ListLayout } from '@shared/ui/ListLayout';

type SearchPageProps = {
  query: string;
  onQueryChange: (query: string) => void;
};

export function SearchPage({ query, onQueryChange }: SearchPageProps) {
  const { locale, messages } = useI18n();
  const data = useData();
  const { filter, setFilter, passes } = useListFilter({ areas: false });
  const today = todayIso();
  const context = { data, messages, locale, today };
  const results = searchData(data, query, today);
  const tasks = results.tasks.filter((task) => passes(task));
  const projects = results.projects.filter((project) => passes(project));
  const references = results.references.filter((reference) =>
    passes({ ...reference, due: null }),
  );
  const items = results.items.filter((item) => passes({ ...item, due: null }));
  const groups = [
    ...groupTasks('search', tasks, 'state', context, { withProject: true }),
    {
      key: 'search:projects',
      title: messages.search.projects,
      items: projects.map((project) => ({ kind: 'project' as const, project })),
    },
    {
      key: 'search:references',
      title: messages.search.references,
      items: references.map((reference) => ({
        kind: 'reference' as const,
        reference,
      })),
    },
    {
      key: 'search:items',
      title: messages.search.items,
      items: items.map((item) => ({
        kind: 'item' as const,
        item,
        listName: data.references.find(
          (reference) => reference.id === item.referenceId,
        )?.name,
      })),
    },
  ];

  return (
    <ListLayout
      bar={
        <TopBar
          start={<Drawer />}
          areas={false}
          page="search"
          title={messages.places.search.title}
        />
      }
      header={<PageHeader title={messages.places.search.title} />}
      filters={
        <>
          <label className="mt-5 mb-2 flex min-h-13 items-center gap-2.5 rounded-full border-[1.5px] border-line bg-card px-4 focus-within:border-focus-ring">
            <Search
              className="size-[22px] flex-none text-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              ref={(node) => node?.focus()}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={messages.search.placeholder}
              aria-label={messages.search.placeholder}
              autoComplete="off"
              className="min-h-12 min-w-0 flex-1 border-0 bg-transparent text-[17px] outline-0 [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                aria-label={messages.search.clear}
                onClick={() => onQueryChange('')}
                className="-mr-2 grid size-10 flex-none cursor-pointer place-items-center rounded-full text-muted"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            )}
          </label>
          {query.trim() && (
            <FilterChips
              items={[...results.tasks, ...results.projects]}
              filter={filter}
              onChange={setFilter}
            />
          )}
        </>
      }
      fab={
        <CreateTaskButton
          defaults={{ title: query.trim() }}
          label={messages.common.addTask}
        />
      }
      overlays={
        <>
          <Editor />
          <BulkActions />
        </>
      }
    >
      <ItemList
        fromSearch
        groups={groups}
        empty={query.trim() ? messages.search.nothing : messages.search.prompt}
      />
    </ListLayout>
  );
}
