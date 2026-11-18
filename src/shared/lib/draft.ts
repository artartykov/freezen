export function isDraftChanged<T extends object>(
  draft: T,
  start: T,
  titleKey: keyof T,
) {
  const title = draft[titleKey];
  if (typeof title === 'string' && title.trim()) return true;
  return (Object.keys(draft) as (keyof T)[]).some(
    (key) =>
      key !== titleKey &&
      JSON.stringify(draft[key]) !== JSON.stringify(start[key]),
  );
}
