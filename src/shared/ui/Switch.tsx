type SwitchProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function Switch({ label, checked, onChange }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group flex min-h-14 w-full cursor-pointer items-center justify-between gap-4 px-2 text-left text-[17px] focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-focus-ring"
    >
      {label}
      <span
        aria-hidden="true"
        className="relative h-8 w-13 flex-none rounded-full border-2 border-muted bg-line after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-muted after:transition-transform group-aria-checked:border-accent group-aria-checked:bg-accent group-aria-checked:after:translate-x-5 group-aria-checked:after:bg-accent-ink"
      />
    </button>
  );
}
