import { useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';

export function useDescriptionDrag({
  initiallyExpanded,
  keepExpanded,
}: {
  initiallyExpanded: boolean;
  keepExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const panel = useRef<HTMLDivElement>(null);
  const gesture = useRef<{
    x: number;
    y: number;
    height: number;
    fullHeight: number;
  } | null>(null);
  function end() {
    gesture.current = null;
    panel.current?.removeAttribute('data-dragging');
    panel.current?.style.removeProperty('grid-template-rows');
  }

  function down(event: PointerEvent<HTMLButtonElement>) {
    const node = panel.current;
    const content = node?.firstElementChild;
    if (!node || !content || !event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    const height = node.getBoundingClientRect().height;
    node.getAnimations().forEach((animation) => animation.cancel());
    gesture.current = {
      x: event.screenX,
      y: event.screenY,
      height,
      fullHeight: Math.max(1, content.scrollHeight),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function move(event: PointerEvent<HTMLButtonElement>) {
    const start = gesture.current;
    const node = panel.current;
    if (!event.isPrimary || !start || !node) return;
    const dy = start.y - event.screenY;
    const dx = Math.abs(start.x - event.screenX);
    if (!node.hasAttribute('data-dragging') && Math.abs(dy) <= dx) return;
    const fraction = Math.max(
      0,
      Math.min(1, (start.height + dy) / start.fullHeight),
    );
    node.style.gridTemplateRows = `${fraction}fr`;
    node.setAttribute('data-dragging', '');
  }

  function up(event: PointerEvent<HTMLButtonElement>) {
    const start = gesture.current;
    if (!event.isPrimary || !start) return;
    const dy = start.y - event.screenY;
    const dx = Math.abs(start.x - event.screenX);
    const dragged = panel.current?.hasAttribute('data-dragging') ?? false;
    if ((dragged || Math.abs(dy) > dx) && Math.abs(dy) >= 12)
      setExpanded(dy > 0 || (expanded && keepExpanded));
    end();
  }

  function reset() {
    end();
    panel.current?.getAnimations().forEach((animation) => animation.cancel());
    setExpanded(initiallyExpanded);
  }

  return {
    expanded,
    panel,
    reset,
    handle: {
      onPointerDown: down,
      onPointerMove: move,
      onPointerUp: up,
      onLostPointerCapture: end,
      onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
        event.preventDefault();
        setExpanded(event.key === 'ArrowUp' || (expanded && keepExpanded));
      },
    },
  };
}
