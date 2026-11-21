import { useRef, useState } from 'react';
import type { CSSProperties, MouseEvent, PointerEvent } from 'react';

type Direction = 'down' | 'left';

type Drag = { id: number; x: number; y: number; time: number; active: boolean };

function distance(direction: Direction, dx: number, dy: number) {
  if (direction === 'down') return Math.max(0, dy);
  return Math.min(0, dx);
}

function isAlongAxis(direction: Direction, dx: number, dy: number) {
  if (direction === 'down') return dy > 8 && dy > Math.abs(dx) * 1.2;
  return dx < -8 && Math.abs(dx) > Math.abs(dy);
}

export function useDragDismiss(
  direction: Direction,
  onDismiss: () => void | false,
  threshold = 100,
) {
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const [offset, setOffset] = useState(0);
  const axis = direction === 'down' ? 'Y' : 'X';

  function finish(event: PointerEvent, commit: boolean) {
    const current = drag.current;
    drag.current = null;
    if (!current?.active) return;
    suppressClick.current = true;
    setTimeout(() => {
      suppressClick.current = false;
    }, 300);
    const moved = distance(
      direction,
      event.clientX - current.x,
      event.clientY - current.y,
    );
    const speed = Math.abs(moved) / Math.max(1, event.timeStamp - current.time);
    const shouldDismiss =
      commit && (Math.abs(moved) > threshold || speed > 0.6);
    if (shouldDismiss && onDismiss() !== false) return;
    setOffset(0);
  }

  return {
    style: offset
      ? ({
          transform: `translate${axis}(${offset}px)`,
          transition: 'none',
        } as CSSProperties)
      : undefined,
    handlers: {
      onPointerDown: (event: PointerEvent) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        drag.current = {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          time: event.timeStamp,
          active: false,
        };
      },
      onPointerMove: (event: PointerEvent<HTMLElement>) => {
        const current = drag.current;
        if (!current || current.id !== event.pointerId) return;
        const dx = event.clientX - current.x;
        const dy = event.clientY - current.y;
        if (!current.active) {
          if (!isAlongAxis(direction, dx, dy)) return;
          current.active = true;
          event.currentTarget.setPointerCapture(event.pointerId);
        }
        setOffset(distance(direction, dx, dy));
      },
      onPointerUp: (event: PointerEvent) => finish(event, true),
      onPointerCancel: (event: PointerEvent) => finish(event, false),
      onClickCapture: (event: MouseEvent) => {
        if (!suppressClick.current) return;
        event.preventDefault();
        event.stopPropagation();
      },
    },
  };
}
