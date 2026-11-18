export function TaskCheck({ done }: { done: boolean }) {
  return (
    <span
      className={`grid size-[22px] place-items-center rounded-md border-2 motion-safe:transition-colors ${done ? 'border-accent bg-accent' : 'border-muted'}`}
    >
      {done && (
        <span className="h-[9px] w-[5px] translate-x-[-1px] translate-y-[-1px] rotate-45 border-r-2 border-b-2 border-accent-ink" />
      )}
    </span>
  );
}
