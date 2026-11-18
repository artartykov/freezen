import { useEffect, useRef, useState } from 'react';
import type {
  CSSProperties,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
} from 'react';

const holdDelay: Record<string, number> = { mouse: 350, touch: 250, pen: 250 };
const slop = 7;
const scrollEdge = 56;
const maxScrollSpeed = 14;

type Pending = {
  id: string;
  pointerId: number;
  x: number;
  y: number;
  timer: ReturnType<typeof setTimeout>;
};

type Lift = {
  id: string;
  index: number;
  pointerId: number;
  startY: number;
  tops: number[];
  heights: number[];
  gap: number;
  scroller: HTMLElement | null;
  scrollStart: number;
  y: number;
  moved: boolean;
};

type Drag = Lift & { offset: number; target: number };

function scrollerOf(node: HTMLElement) {
  for (let parent = node.parentElement; parent; parent = parent.parentElement) {
    const { overflowY } = getComputedStyle(parent);
    if (overflowY === 'auto' || overflowY === 'scroll') return parent;
  }
  return null;
}

function scrollOf(scroller: HTMLElement | null) {
  return scroller ? scroller.scrollTop : window.scrollY;
}

function scrollBy(scroller: HTMLElement | null, amount: number) {
  if (scroller) scroller.scrollTop += amount;
  else window.scrollBy(0, amount);
}

function edgeSpeed(lift: Lift) {
  const rect = lift.scroller?.getBoundingClientRect();
  const top = (rect?.top ?? 0) + scrollEdge;
  const bottom = (rect?.bottom ?? window.innerHeight) - scrollEdge;
  if (lift.y < top)
    return -Math.min(maxScrollSpeed, Math.ceil((top - lift.y) / 4));
  if (lift.y > bottom)
    return Math.min(maxScrollSpeed, Math.ceil((lift.y - bottom) / 4));
  return 0;
}

function moveId(ids: string[], from: number, to: number) {
  const next = [...ids];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

function targetIndex(lift: Lift, offset: number) {
  const top = lift.tops[lift.index] + offset;
  const bottom = top + lift.heights[lift.index];
  return lift.tops.filter((rowTop, index) => {
    const middle = rowTop + lift.heights[index] / 2;
    if (index < lift.index) return middle <= top;
    return index > lift.index && middle < bottom;
  }).length;
}

function clampOffset(lift: Lift, offset: number) {
  const last = lift.tops.length - 1;
  const min = lift.tops[0] - lift.tops[lift.index];
  const max =
    lift.tops[last] +
    lift.heights[last] -
    lift.heights[lift.index] -
    lift.tops[lift.index];
  return Math.max(min, Math.min(max, offset));
}

function dragAt(lift: Lift): Drag {
  const offset = clampOffset(
    lift,
    lift.y - lift.startY + scrollOf(lift.scroller) - lift.scrollStart,
  );
  return { ...lift, offset, target: targetIndex(lift, offset) };
}

function shiftFor(drag: Drag, index: number) {
  const shift = drag.heights[drag.index] + drag.gap;
  if (drag.index < drag.target && index > drag.index && index <= drag.target)
    return -shift;
  if (drag.target < drag.index && index >= drag.target && index < drag.index)
    return shift;
  return 0;
}

export function useReorder(
  ids: string[],
  onCommit: (ids: string[]) => void,
  enabled = true,
) {
  const nodes = useRef(new Map<string, HTMLElement>());
  const pending = useRef<Pending | null>(null);
  const lift = useRef<Lift | null>(null);
  const suppressClick = useRef(false);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragging = drag !== null;

  useEffect(() => {
    if (!dragging) return;
    const block = (event: TouchEvent) => event.preventDefault();
    window.addEventListener('touchmove', block, {
      passive: false,
      capture: true,
    });
    return () =>
      window.removeEventListener('touchmove', block, { capture: true });
  }, [dragging]);

  useEffect(() => {
    if (!dragging) return;
    let frame = requestAnimationFrame(function tick() {
      const active = lift.current;
      const speed = active?.moved ? edgeSpeed(active) : 0;
      if (active && speed) {
        const before = scrollOf(active.scroller);
        scrollBy(active.scroller, speed);
        if (scrollOf(active.scroller) !== before) setDrag(dragAt(active));
      }
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [dragging]);

  useEffect(() => () => clearTimeout(pending.current?.timer), []);

  function startLift(id: string, pointerId: number, y: number) {
    pending.current = null;
    const index = ids.indexOf(id);
    if (index < 0) return;
    const rects = ids.map((current) =>
      nodes.current.get(current)?.getBoundingClientRect(),
    );
    if (rects.some((rect) => !rect)) return;
    const tops = rects.map((rect) => rect?.top ?? 0);
    const heights = rects.map((rect) => rect?.height ?? 0);
    const gap =
      tops.length > 1 ? Math.max(0, tops[1] - tops[0] - heights[0]) : 0;
    const node = nodes.current.get(id);
    if (!node) return;
    const scroller = scrollerOf(node);
    const lifted = {
      id,
      index,
      pointerId,
      startY: y,
      tops,
      heights,
      gap,
      scroller,
      scrollStart: scrollOf(scroller),
      y,
      moved: false,
    };
    lift.current = lifted;
    try {
      node.setPointerCapture(pointerId);
    } catch {
      lift.current = null;
      return;
    }
    navigator.vibrate?.(10);
    setDrag({ ...lifted, offset: 0, target: index });
  }

  function finish(commit: boolean) {
    const current = lift.current;
    lift.current = null;
    if (!current || !drag) return;
    suppressClick.current = true;
    setTimeout(() => {
      suppressClick.current = false;
    }, 300);
    setDrag(null);
    const { target } = dragAt(current);
    if (commit && target !== current.index)
      onCommit(moveId(ids, current.index, target));
  }

  function itemProps(id: string) {
    const index = ids.indexOf(id);
    let style: CSSProperties | undefined;
    if (drag) {
      style =
        drag.id === id
          ? {
              transform: `translateY(${drag.offset}px) scale(1.02)`,
              position: 'relative',
              zIndex: 3,
              boxShadow: '0 8px 24px rgba(0,0,0,.28)',
            }
          : {
              transform: `translateY(${shiftFor(drag, index)}px)`,
              transition: 'transform .16s ease',
            };
    }

    return {
      ref: (node: HTMLElement | null) => {
        if (node) nodes.current.set(id, node);
        else nodes.current.delete(id);
      },
      style,
      onPointerDown: (event: PointerEvent) => {
        if (
          !enabled ||
          !event.isPrimary ||
          (event.pointerType === 'mouse' && event.button !== 0)
        )
          return;
        clearTimeout(pending.current?.timer);
        const { pointerId, clientX, clientY } = event;
        pending.current = {
          id,
          pointerId,
          x: clientX,
          y: clientY,
          timer: setTimeout(
            () => startLift(id, pointerId, clientY),
            holdDelay[event.pointerType] ?? 250,
          ),
        };
      },
      onPointerMove: (event: PointerEvent) => {
        const waiting = pending.current;
        if (waiting && waiting.pointerId === event.pointerId) {
          if (
            Math.hypot(event.clientX - waiting.x, event.clientY - waiting.y) >
            slop
          ) {
            clearTimeout(waiting.timer);
            pending.current = null;
          }
          return;
        }
        const active = lift.current;
        if (!active || active.pointerId !== event.pointerId) return;
        active.y = event.clientY;
        if (Math.abs(active.y - active.startY) > 3) active.moved = true;
        setDrag(dragAt(active));
      },
      onPointerUp: (event: PointerEvent) => {
        clearTimeout(pending.current?.timer);
        pending.current = null;
        if (lift.current?.pointerId === event.pointerId) finish(true);
      },
      onPointerCancel: (event: PointerEvent) => {
        clearTimeout(pending.current?.timer);
        pending.current = null;
        if (lift.current?.pointerId === event.pointerId) finish(false);
      },
      onClickCapture: (event: MouseEvent) => {
        if (!suppressClick.current) return;
        event.preventDefault();
        event.stopPropagation();
      },
      onContextMenu: (event: MouseEvent) => {
        if (enabled) event.preventDefault();
      },
      onKeyDown: (event: KeyboardEvent) => {
        if (
          !enabled ||
          !event.altKey ||
          (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')
        )
          return;
        const to = index + (event.key === 'ArrowDown' ? 1 : -1);
        if (index < 0 || to < 0 || to >= ids.length) return;
        event.preventDefault();
        event.stopPropagation();
        onCommit(moveId(ids, index, to));
      },
    };
  }

  return { itemProps, liftedId: drag?.id ?? null };
}

export type ReorderItemProps = ReturnType<
  ReturnType<typeof useReorder>['itemProps']
>;
