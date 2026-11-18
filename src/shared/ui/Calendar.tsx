import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import {
  formatLongDate,
  formatMonthYear,
  formatNarrowWeekday,
} from '@shared/i18n';
import { addDays, parseIsoDate, toIsoDate, todayIso } from '@shared/lib';
import { CalendarYears } from './CalendarYears';

type CalendarProps = {
  value: string | null;
  onChange: (iso: string) => void;
  locale: string;
  previousLabel: string;
  nextLabel: string;
  yearLabel: string;
  weekStart: 'sunday' | 'monday';
};

const dayIndexes = [0, 1, 2, 3, 4, 5, 6];

function Arrow({ path }: { path: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-6 fill-none stroke-current stroke-2"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

export function Calendar({
  value,
  onChange,
  locale,
  previousLabel,
  nextLabel,
  yearLabel,
  weekStart,
}: CalendarProps) {
  const initial = parseIsoDate(value ?? todayIso());
  const [month, setMonth] = useState({
    year: initial.getFullYear(),
    month: initial.getMonth(),
  });
  const [years, setYears] = useState(false);
  const today = todayIso();
  const first = new Date(month.year, month.month, 1);
  const firstIso = toIsoDate(first);
  const length = new Date(month.year, month.month + 1, 0).getDate();
  const days = Array.from({ length }, (_, index) => addDays(firstIso, index));
  const offset = weekStart === 'monday' ? 1 : 0;
  const leading = (first.getDay() - offset + 7) % 7;

  function shift(delta: number) {
    const next = new Date(month.year, month.month + delta, 1);
    setMonth({ year: next.getFullYear(), month: next.getMonth() });
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-0.5">
        <button
          type="button"
          aria-expanded={years}
          aria-label={yearLabel}
          onClick={() => setYears(!years)}
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] px-2 text-[17px] font-medium"
        >
          {formatMonthYear(first, locale)}
          <ChevronDown
            className={`size-5 motion-safe:transition-transform ${years ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
        <span className="flex-1" />
        {!years && (
          <>
            <button
              type="button"
              aria-label={previousLabel}
              onClick={() => shift(-1)}
              className="grid size-11 cursor-pointer place-items-center rounded-xl"
            >
              <Arrow path="M15 6l-6 6 6 6" />
            </button>
            <button
              type="button"
              aria-label={nextLabel}
              onClick={() => shift(1)}
              className="grid size-11 cursor-pointer place-items-center rounded-xl"
            >
              <Arrow path="M9 6l6 6-6 6" />
            </button>
          </>
        )}
      </div>
      {years ? (
        <CalendarYears
          year={month.year}
          onPick={(year) => {
            setMonth({ ...month, year });
            setYears(false);
          }}
        />
      ) : (
        <div className="grid min-h-72 grid-cols-7 content-start gap-y-0.5 text-center">
          {dayIndexes.map((index) => (
            <span
              key={index}
              aria-hidden="true"
              className="text-sm leading-9 font-medium text-muted"
            >
              {formatNarrowWeekday(
                new Date(2026, 1, 1 + index + offset),
                locale,
              )}
            </span>
          ))}
          {leading > 0 && <span style={{ gridColumn: `span ${leading}` }} />}
          {days.map((iso) => (
            <button
              key={iso}
              type="button"
              aria-pressed={iso === value}
              aria-label={formatLongDate(parseIsoDate(iso), locale)}
              onClick={() => onChange(iso)}
              className={`mx-auto size-10 cursor-pointer rounded-full text-[15px] aria-pressed:bg-accent aria-pressed:text-accent-ink focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-focus-ring ${
                iso === today
                  ? 'shadow-[inset_0_0_0_1.5px_var(--ink-soft)]'
                  : ''
              }`}
            >
              {parseIsoDate(iso).getDate()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
