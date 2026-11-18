export const textFields =
  'textarea, [contenteditable], input:not([type=checkbox], [type=radio], [type=range], [type=button], [type=submit], [type=reset], [type=color], [type=file])';

function follow(node: HTMLElement, viewport: VisualViewport) {
  let height = viewport.height;
  let frame = 0;

  function revealFocusedField() {
    const focused = document.activeElement;
    if (focused?.matches(textFields) && node.contains(focused))
      focused.scrollIntoView({ block: 'nearest' });
  }

  function fit() {
    const shrank = viewport.height < height;
    height = viewport.height;
    node.style.top = `${viewport.offsetTop}px`;
    node.style.height = `${viewport.height}px`;
    if (!shrank) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(revealFocusedField);
  }

  fit();
  viewport.addEventListener('resize', fit);
  viewport.addEventListener('scroll', fit);
  return () => {
    cancelAnimationFrame(frame);
    viewport.removeEventListener('resize', fit);
    viewport.removeEventListener('scroll', fit);
  };
}

export function fitToVisibleArea(node: HTMLElement) {
  const viewport = window.visualViewport;
  return viewport ? follow(node, viewport) : () => {};
}
