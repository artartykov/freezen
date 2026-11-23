import { ReferenceItemRow } from '@entities/reference';
import { MoveReferenceItemsSheet } from '@features/move-references';
import type { ReorderItemProps } from '@features/reorder';
import { SelectionMark } from '@features/select-tasks';
import { useOverlay } from '@shared/model';
import type { ReferenceItem } from '@shared/storage';
import { useSelectableRow } from '../model/selectableRow';

type ReferenceEntryProps = {
  item: ReferenceItem;
  listName?: string;
  selectable: boolean;
  sort?: ReorderItemProps;
  lifted: boolean;
};

export function ReferenceEntry({
  item,
  listName,
  selectable,
  sort,
  lifted,
}: ReferenceEntryProps) {
  const overlay = useOverlay();
  const row = useSelectableRow(
    item.id,
    sort,
    lifted,
    selectable && !item.trashed,
  );

  return (
    <>
      <ReferenceItemRow
        {...row.rowProps}
        item={item}
        listName={listName}
        highlighted={row.selected}
        trailing={row.selecting && <SelectionMark selected={row.selected} />}
        onOpen={() =>
          row.open(() => overlay.openEditor({ kind: 'item', id: item.id }))
        }
      />
      {row.moving && (
        <MoveReferenceItemsSheet itemIds={[item.id]} onClose={row.closeMove} />
      )}
    </>
  );
}
