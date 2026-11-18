export function SelectionMark({ selected }: { selected: boolean }) {
  return (
    <span
      className="grid size-11 flex-none cursor-pointer place-items-center"
      aria-hidden="true"
    >
      <i
        className={`grid size-[22px] place-items-center rounded-full border-2 after:size-2.5 after:rounded-full after:bg-focus-ring after:transition-transform ${
          selected
            ? 'border-focus-ring after:scale-100'
            : 'border-muted after:scale-0'
        }`}
      />
    </span>
  );
}
