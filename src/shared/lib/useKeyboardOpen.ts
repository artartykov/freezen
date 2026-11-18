import { useSyncExternalStore } from 'react';
import { textFields } from './visibleArea';

const keyboardMinHeight = 120;
const tallest = new Map<number, number>();
const listeners = new Set<() => void>();
let open = false;

function visibleHeight() {
  const viewport = window.visualViewport;
  return viewport ? viewport.height * viewport.scale : window.innerHeight;
}

function focusesTextField() {
  return document.activeElement?.matches(textFields) ?? false;
}

function update() {
  const width = window.innerWidth;
  const height = visibleHeight();
  const full = Math.max(tallest.get(width) ?? 0, height);
  tallest.set(width, full);
  const next =
    full - height > keyboardMinHeight && (open || focusesTextField());
  if (next === open) return;
  open = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function isOpen() {
  return open;
}

function isClosed() {
  return false;
}

update();
window.visualViewport?.addEventListener('resize', update);
window.addEventListener('resize', update);
document.addEventListener('focusin', update);

export function useKeyboardOpen() {
  return useSyncExternalStore(subscribe, isOpen, isClosed);
}
