import { Check } from 'lucide-react';
import type { AlertOption } from '../model/alerts';

type CheckOptionsProps<T extends string> = {
  label: string;
  options: AlertOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function CheckOptions<T extends string>({
  label,
  options,
  value,
  onChange,
}: CheckOptionsProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
          className="group flex min-h-13 w-full cursor-pointer items-center justify-between border-b border-line px-2 text-left text-[17px] focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-focus-ring"
        >
          {option.label}
          <Check
            aria-hidden="true"
            strokeWidth={2.4}
            className="invisible size-[22px] text-focus-ring group-aria-checked:visible"
          />
        </button>
      ))}
    </div>
  );
}
