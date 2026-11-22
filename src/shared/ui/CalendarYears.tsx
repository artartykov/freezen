const lastYear = 2099;

export function CalendarYears({
  year,
  onPick,
}: {
  year: number;
  onPick: (year: number) => void;
}) {
  const firstYear = new Date().getFullYear() - 10;
  const years = Array.from(
    { length: lastYear - firstYear + 1 },
    (_, index) => firstYear + index,
  );

  return (
    <div
      role="group"
      className="grid max-h-72 grid-cols-3 gap-1 overflow-y-auto"
    >
      {years.map((candidate) => (
        <button
          key={candidate}
          type="button"
          aria-pressed={candidate === year}
          ref={
            candidate === year
              ? (node) => node?.scrollIntoView({ block: 'center' })
              : undefined
          }
          onClick={() => onPick(candidate)}
          className="min-h-11 cursor-pointer rounded-full text-[17px] aria-pressed:bg-accent aria-pressed:text-accent-ink focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-focus-ring"
        >
          {candidate}
        </button>
      ))}
    </div>
  );
}
