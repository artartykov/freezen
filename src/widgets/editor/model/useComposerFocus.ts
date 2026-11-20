import { useEffect, useRef } from 'react';
import type { PointerEvent, RefObject } from 'react';

const openMenu = '[data-composer-menu]:popover-open';

function composerInput(root: HTMLElement, element: Element | null) {
  return element instanceof HTMLTextAreaElement &&
    root.contains(element) &&
    element.closest('dialog') === root.closest('dialog')
    ? element
    : null;
}

export function useComposerFocus(area: RefObject<HTMLDivElement | null>) {
  const previousInput = useRef<HTMLTextAreaElement | null>(null);
  const frame = useRef(0);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  function capture(event: PointerEvent<HTMLDivElement>) {
    const root = event.currentTarget;
    const button =
      event.target instanceof Element && event.target.closest('button');
    if (
      !event.isPrimary ||
      event.button !== 0 ||
      !button ||
      button.closest('dialog') !== root.closest('dialog') ||
      button.closest('[data-composer-menu]') ||
      !button.closest('[data-composer-controls], [data-composer-action]')
    )
      return;

    cancelAnimationFrame(frame.current);
    const active = composerInput(root, document.activeElement);
    if (active || !root.querySelector(openMenu)) previousInput.current = active;
    if (previousInput.current) event.preventDefault();
  }

  function restore() {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const root = area.current;
      if (!root || root.querySelector(`dialog[open], ${openMenu}`)) return;
      const input = previousInput.current;
      previousInput.current = null;
      if (
        input?.isConnected &&
        !input.closest('[inert]') &&
        !composerInput(root, document.activeElement)
      )
        input.focus({ preventScroll: true });
    });
  }

  function clear() {
    cancelAnimationFrame(frame.current);
    previousInput.current = null;
  }

  return { capture, restore, clear };
}
