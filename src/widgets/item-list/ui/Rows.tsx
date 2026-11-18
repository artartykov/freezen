import type { ReactNode } from 'react';
import {
  commitProjectOrder,
  commitReferenceItemOrder,
  commitReferenceOrder,
  commitTaskOrder,
  useReorder,
} from '@features/reorder';
import type { ReorderItemProps } from '@features/reorder';
import { RowList } from '@shared/ui/RowList';
import type { ListItem } from '../model/types';

type RowsProps = {
  items: ListItem[];
  reorderable: boolean;
  render: (
    item: ListItem,
    sort?: ReorderItemProps,
    lifted?: boolean,
  ) => ReactNode;
};

const commits = {
  task: commitTaskOrder,
  project: commitProjectOrder,
  reference: commitReferenceOrder,
  item: commitReferenceItemOrder,
};

function rawId(item: ListItem) {
  switch (item.kind) {
    case 'task':
      return item.task.id;
    case 'project':
      return item.project.id;
    case 'reference':
      return item.reference.id;
    case 'item':
      return item.item.id;
  }
}

export function Rows({ items, reorderable, render }: RowsProps) {
  const kind = items.at(0)?.kind;
  const sortable =
    reorderable && !!kind && items.every((item) => item.kind === kind);
  const { itemProps, liftedId } = useReorder(
    items.map(rawId),
    kind ? commits[kind] : commitTaskOrder,
    sortable,
  );

  return (
    <RowList>
      {items.map((item) => {
        const id = rawId(item);
        return sortable
          ? render(item, itemProps(id), liftedId === id)
          : render(item);
      })}
    </RowList>
  );
}
