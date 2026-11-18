import type {
  CSSProperties,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
} from 'react';
import type { ReorderItemProps } from '@features/reorder';

type Swipe = {
  style: CSSProperties | undefined;
  onPointerDown: (event: PointerEvent) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent) => void;
  onPointerCancel: (event: PointerEvent) => void;
  onClickCapture: (event: MouseEvent) => void;
};

export function combineGestures(
  swipe: Swipe,
  sort: ReorderItemProps | undefined,
  lifted: boolean,
) {
  if (!sort) return swipe;
  return {
    ref: sort.ref,
    style: sort.style ?? swipe.style,
    onPointerDown(event: PointerEvent) {
      swipe.onPointerDown(event);
      sort.onPointerDown(event);
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      if (!lifted) swipe.onPointerMove(event);
      sort.onPointerMove(event);
    },
    onPointerUp(event: PointerEvent) {
      swipe.onPointerUp(event);
      sort.onPointerUp(event);
    },
    onPointerCancel(event: PointerEvent) {
      swipe.onPointerCancel(event);
      sort.onPointerCancel(event);
    },
    onClickCapture(event: MouseEvent) {
      swipe.onClickCapture(event);
      sort.onClickCapture(event);
    },
    onContextMenu: sort.onContextMenu,
    onKeyDownCapture(event: KeyboardEvent) {
      sort.onKeyDown(event);
    },
  };
}
