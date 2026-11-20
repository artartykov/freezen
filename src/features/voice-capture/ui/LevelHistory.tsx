const quietLevel = 0.08;
const dotSize = 5;
const maxHeight = 44;

export function LevelHistory({
  levels,
  label,
}: {
  levels: number[];
  label: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className="flex h-16 w-full items-center justify-end gap-[3px] overflow-hidden px-1 [mask-image:linear-gradient(to_right,transparent,black_18%,black_88%,transparent)]"
    >
      {levels.map((level, position) =>
        level < quietLevel ? (
          <span
            key={position}
            className="flex-none rounded-full bg-accent/45"
            style={{ width: dotSize, height: dotSize }}
          />
        ) : (
          <span
            key={position}
            className="w-[3px] flex-none rounded-full bg-accent"
            style={{ height: Math.max(dotSize, level * maxHeight) }}
          />
        ),
      )}
    </div>
  );
}
