export function ProgressRing({
  progress,
  done,
  className = 'size-[22px]',
}: {
  progress: number;
  done: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`relative grid flex-none place-items-center rounded-full border-2 border-focus-ring ${done ? 'border-accent bg-accent' : ''} ${className}`}
      style={
        done
          ? undefined
          : {
              background: `conic-gradient(var(--focus-ring) ${progress}%, transparent 0)`,
            }
      }
    >
      {done && (
        <svg
          viewBox="0 0 24 24"
          className="size-4 fill-none stroke-accent-ink stroke-3"
        >
          <path
            d="M6 12.5l4 4 8-9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}
