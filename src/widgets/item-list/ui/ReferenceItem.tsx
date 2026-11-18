import { useNavigate } from '@tanstack/react-router';
import { ReferenceRow } from '@entities/reference';
import { MoveReferencesSheet } from '@features/move-references';
import type { ReorderItemProps } from '@features/reorder';
import { SelectionMark } from '@features/select-tasks';
import { StarReferenceButton } from '@features/star-reference';
import { useOverlay } from '@shared/model';
import type { Reference } from '@shared/storage';
import { useSelectableRow } from '../model/selectableRow';

type ReferenceItemProps = {
  reference: Reference;
  count: number;
  fromSearch: boolean;
  selectable: boolean;
  sort?: ReorderItemProps;
  lifted: boolean;
};

export function ReferenceItem({
  reference,
  count,
  fromSearch,
  selectable,
  sort,
  lifted,
}: ReferenceItemProps) {
  const navigate = useNavigate();
  const overlay = useOverlay();
  const row = useSelectableRow(reference.id, sort, lifted, selectable);

  return (
    <>
      <ReferenceRow
        {...row.rowProps}
        reference={reference}
        count={count}
        highlighted={row.selected}
        trailing={
          row.selecting ? (
            <SelectionMark selected={row.selected} />
          ) : (
            !reference.trashed && <StarReferenceButton reference={reference} />
          )
        }
        onOpen={() =>
          row.open(() => {
            if (reference.trashed) {
              overlay.openEditor({ kind: 'reference', id: reference.id });
              return;
            }
            void navigate({
              to: '/reference/$referenceId',
              params: { referenceId: reference.id },
              state: { fromSearch },
            });
          })
        }
      />
      {row.moving && (
        <MoveReferencesSheet
          referenceIds={[reference.id]}
          onClose={row.closeMove}
        />
      )}
    </>
  );
}
