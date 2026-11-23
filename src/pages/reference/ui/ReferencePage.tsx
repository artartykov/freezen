import { Navigate } from '@tanstack/react-router';
import { ReferenceItemBulkActions } from '@widgets/bulk-actions';
import { Drawer } from '@widgets/drawer';
import { Editor } from '@widgets/editor';
import { ItemList } from '@widgets/item-list';
import { ReferenceHeader } from '@widgets/page-header';
import { QuickFind } from '@widgets/quick-find';
import { TopBar } from '@widgets/top-bar';
import { CreateTaskButton } from '@features/create-task';
import {
  FilterChips,
  isFiltering,
  useListFilter,
} from '@features/filter-tasks';
import { useI18n } from '@shared/i18n';
import { useOverlay } from '@shared/model';
import { referenceItems, useData } from '@shared/storage';
import { ListLayout } from '@shared/ui/ListLayout';

export function ReferencePage({ referenceId }: { referenceId: string }) {
  const { messages } = useI18n();
  const data = useData();
  const overlay = useOverlay();
  const { filter, setFilter, passes } = useListFilter({ areas: false });
  const reference = data.references.find(
    (candidate) => candidate.id === referenceId,
  );

  if (!reference || reference.trashed) return <Navigate to="/focus" replace />;

  const all = referenceItems(data, reference.id).map((item) => ({
    ...item,
    due: null,
  }));
  const shown = all.filter((item) => passes(item));

  return (
    <ListLayout
      bar={
        <TopBar
          start={<Drawer />}
          areas={false}
          page="reference"
          titleInBar={false}
          title={reference.name}
          shareLines={shown.map((item) => item.title)}
        />
      }
      header={<ReferenceHeader reference={reference} />}
      filters={<FilterChips items={all} filter={filter} onChange={setFilter} />}
      fab={
        <CreateTaskButton
          defaults={{ referenceId: reference.id }}
          label={messages.common.addItem}
        />
      }
      overlays={
        <>
          <Editor />
          <ReferenceItemBulkActions />
          <QuickFind />
        </>
      }
      onPullDown={overlay.openQuickFind}
    >
      <ItemList
        reorderable
        selectable
        groups={[
          {
            key: `reference:${reference.id}`,
            items: shown.map((item) => ({ kind: 'item' as const, item })),
          },
        ]}
        empty={
          isFiltering(filter) && all.length
            ? messages.list.noMatches
            : messages.places.references.empty
        }
      />
    </ListLayout>
  );
}
