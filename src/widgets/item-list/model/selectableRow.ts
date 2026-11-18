import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { ReorderItemProps } from '@features/reorder';
import {
  startSelection,
  toggleSelection,
  useSelection,
  useSwipe,
} from '@features/select-tasks';
import { combineGestures } from './gestures';

export function useSelectableRow(
  id: string,
  sort: ReorderItemProps | undefined,
  lifted: boolean,
  enabled = true,
) {
  const selecting = useSelection((state) => enabled && state.ids.length > 0);
  const selected = useSelection((state) => enabled && state.ids.includes(id));
  const [moving, setMoving] = useState(false);
  const swipe = useSwipe(
    () => (selecting ? toggleSelection(id) : startSelection(id)),
    () => (selecting ? toggleSelection(id) : setMoving(true)),
  );

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (
      selecting ||
      event.target !==
        event.currentTarget.querySelector('[data-row-title]')?.parentElement
    )
      return;
    if (event.key === 'ArrowLeft') startSelection(id);
    if (event.key === 'ArrowRight') setMoving(true);
  }

  return {
    selecting,
    selected,
    moving,
    closeMove: () => setMoving(false),
    open: (action: () => void) => {
      if (!selecting) action();
    },
    rowProps: enabled
      ? {
          ...combineGestures(swipe, sort, lifted),
          'aria-selected': selecting ? selected : undefined,
          onClick: selecting ? () => toggleSelection(id) : undefined,
          onKeyDown,
        }
      : sort,
  };
}
