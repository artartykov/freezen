import { Search } from 'lucide-react';

export function TagSearch({
  label,
  value,
  onChange,
  onSubmit,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <label className="mt-1 mb-2 flex min-h-13 items-center gap-3 rounded-2xl bg-surface px-4 focus-within:shadow-[0_0_0_3px_var(--focus-ring)]">
      <Search className="size-[22px] text-muted" aria-hidden="true" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            onSubmit();
          }
        }}
        placeholder={label}
        aria-label={label}
        autoComplete="off"
        className="min-w-0 flex-1 border-0 bg-transparent text-[17px] outline-0"
      />
    </label>
  );
}
