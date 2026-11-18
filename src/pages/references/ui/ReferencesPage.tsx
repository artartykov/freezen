import { ReferenceBulkActions } from '@widgets/bulk-actions';
import { Drawer } from '@widgets/drawer';
import { Editor } from '@widgets/editor';
import { ItemList } from '@widgets/item-list';
import { PageHeader } from '@widgets/page-header';
import { QuickFind } from '@widgets/quick-find';
import { TopBar } from '@widgets/top-bar';
import { CreateReferenceButton } from '@features/create-reference';
import {
  FilterChips,
  isFiltering,
  useListFilter,
} from '@features/filter-tasks';
import { useI18n } from '@shared/i18n';
import { useOverlay, useUiState } from '@shared/model';
import { liveReferences, useData } from '@shared/storage';
import { ListLayout } from '@shared/ui/ListLayout';

export function ReferencesPage() {
  const { messages } = useI18n();
  const data = useData();
  const overlay = useOverlay();
  const { filter, setFilter, passes } = useListFilter({ areas: true });
  const place = messages.places.references;
  const lists = liveReferences(data);
  const all = lists.map((reference) => ({ ...reference, due: null }));
  const alphabetical = useUiState((state) => state.sort.references === 'alpha');
  const filtered = lists.filter((reference) =>
    passes({ ...reference, due: null }),
  );
  const shown = alphabetical
    ? [...filtered].sort((a, b) => a.name.localeCompare(b.name))
    : filtered;

  return (
    <ListLayout
      bar={
        <TopBar
          start={<Drawer />}
          page="references"
          sortList="references"
          title={place.title}
          shareLines={shown.map((reference) => reference.name)}
        />
      }
      header={<PageHeader title={place.title} subtitle={place.subtitle} />}
      filters={<FilterChips items={all} filter={filter} onChange={setFilter} />}
      fab={<CreateReferenceButton label={messages.common.addReference} />}
      overlays={
        <>
          <Editor />
          <ReferenceBulkActions />
          <QuickFind />
        </>
      }
      onPullDown={overlay.openQuickFind}
    >
      <ItemList
        reorderable={!alphabetical}
        selectable
        groups={[
          {
            key: 'references:lists',
            title: messages.list.lists,
            items: shown.map((reference) => ({
              kind: 'reference' as const,
              reference,
            })),
          },
        ]}
        empty={
          isFiltering(filter) && all.length
            ? messages.list.noMatches
            : place.empty
        }
      />
    </ListLayout>
  );
}
