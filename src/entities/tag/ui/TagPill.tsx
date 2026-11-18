export function TagPill({ name }: { name: string }) {
  return (
    <span className="rounded-full bg-surface px-3.5 py-1 text-sm font-medium text-muted">
      {name}
    </span>
  );
}
