import { useRef, useState } from 'react';
import type { MouseEvent, PointerEvent } from 'react';

const threshold = 56;

type Gesture = { id: number; x: number; y: number; dragging: boolean };

export function useSwipe(onLeft: () => void, onRight: () => void) {
  const gesture = useRef<Gesture | null>(null);
  const suppressClick = useRef(false);
  const [offset, setOffset] = useState(0);

  function finish(event: PointerEvent, commit: boolean) {
    const current = gesture.current;
    gesture.current = null;
    if (!current?.dragging) return;
    const dx = event.clientX - current.x;
    setOffset(0);
    suppressClick.current = true;
    setTimeout(() => {
      suppressClick.current = false;
    }, 120);
    if (!commit || Math.abs(dx) < threshold) return;
    if (dx < 0) onLeft();
    else onRight();
  }

  return {
    style: offset ? { transform: `translateX(${offset}px)` } : undefined,
    onPointerDown(event: PointerEvent) {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      gesture.current = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        dragging: false,
      };
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      const current = gesture.current;
      if (!current || current.id !== event.pointerId) return;
      const dx = event.clientX - current.x;
      const dy = event.clientY - current.y;
      if (!current.dragging) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
          gesture.current = null;
          return;
        }
        if (Math.abs(dx) <= 10 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
        current.dragging = true;
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      setOffset(Math.max(-72, Math.min(72, dx * 0.6)));
    },
    onPointerUp(event: PointerEvent) {
      finish(event, true);
    },
    onPointerCancel(event: PointerEvent) {
      finish(event, false);
    },
    onClickCapture(event: MouseEvent) {
      if (!suppressClick.current) return;
      event.preventDefault();
      event.stopPropagation();
    },
  };
}
