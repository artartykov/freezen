import type { ReactNode } from 'react';

type Option<T> = { value: T; label: ReactNode; icon?: ReactNode };

type OptionListProps<T> = {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function OptionList<T extends string | number | boolean | null>({
  label,
  options,
  value,
  onChange,
}: OptionListProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-0.5">
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
          className="group flex min-h-12 w-full cursor-pointer items-center gap-4 rounded-[10px] px-4 text-left text-[17px] aria-checked:bg-glow focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-focus-ring"
        >
          <i className="grid size-[22px] flex-none place-items-center rounded-full border-2 border-muted group-aria-checked:border-focus-ring after:size-2.5 after:scale-0 after:rounded-full after:bg-focus-ring group-aria-checked:after:scale-100" />
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}
