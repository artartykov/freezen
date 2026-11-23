import { ChevronDown } from 'lucide-react';
import { useEffect, useId, useImperativeHandle, useRef, useState } from 'react';
import type { Ref } from 'react';
import { formatLongDate, formatMonth, formatNarrowWeekday } from '@shared/i18n';
import { addDays, parseIsoDate, toIsoDate, todayIso } from '@shared/lib';
import { CalendarYears } from './CalendarYears';

type CalendarProps = {
  value: string | null;
  onChange: (iso: string) => void;
  locale: string;
  yearLabel: string;
  monthLabel: string;
  yearsLabel: string;
  monthsLabel: string;
  ref?: Ref<CalendarHandle>;
  weekStart: 'sunday' | 'monday';
};

const dayIndexes = [0, 1, 2, 3, 4, 5, 6];

type Picker = 'year' | 'month';

export type CalendarHandle = { dismissPicker: () => boolean };

const pickerPanel =
  'absolute top-full z-10 mt-1 w-60 max-w-[calc(100vw-64px)] rounded-xl border border-line bg-card p-1.5 shadow-[0_4px_14px_#0003]';

export function Calendar({
  value,
  onChange,
  locale,
  yearLabel,
  monthLabel,
  yearsLabel,
  monthsLabel,
  ref,
  weekStart,
}: CalendarProps) {
  const initial = parseIsoDate(value ?? todayIso());
  const [month, setMonth] = useState({
    year: initial.getFullYear(),
    month: initial.getMonth(),
  });
  const [picker, setPicker] = useState<Picker | null>(null);
  const yearControl = useRef<HTMLDivElement>(null);
  const monthControl = useRef<HTMLDivElement>(null);
  const activeControl = picker === 'year' ? yearControl : monthControl;
  const pickerId = useId();
  const today = todayIso();
  const first = new Date(month.year, month.month, 1);
  const firstIso = toIsoDate(first);
  const length = new Date(month.year, month.month + 1, 0).getDate();
  const days = Array.from({ length }, (_, index) => addDays(firstIso, index));
  const offset = weekStart === 'monday' ? 1 : 0;
  const leading = (first.getDay() - offset + 7) % 7;

  function closePicker() {
    setPicker(null);
    activeControl.current?.querySelector('button')?.focus();
  }

  useImperativeHandle(ref, () => ({
    dismissPicker() {
      if (!picker) return false;
      closePicker();
      return true;
    },
  }));

  useEffect(() => {
    if (!picker) return;
    function dismissOutside(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !activeControl.current?.contains(event.target)
      ) {
        setPicker(null);
      }
    }
    window.addEventListener('pointerdown', dismissOutside, true);
    return () =>
      window.removeEventListener('pointerdown', dismissOutside, true);
  }, [activeControl, picker]);

  const controls = [
    {
      key: 'year',
      label: yearLabel,
      text: String(month.year),
      ref: yearControl,
    },
    {
      key: 'month',
      label: monthLabel,
      text: formatMonth(first, locale),
      ref: monthControl,
    },
  ] as const;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-0.5">
        {controls.map(({ key, label, text, ref: controlRef }) => {
          const expanded = picker === key;
          const id = `${pickerId}-${key}`;
          return (
            <div key={key} ref={controlRef} className="relative">
              <button
                type="button"
                aria-controls={expanded ? id : undefined}
                aria-expanded={expanded}
                aria-label={`${label}: ${text}`}
                onClick={() => setPicker(expanded ? null : key)}
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] px-2 text-[17px] font-medium focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-focus-ring"
              >
                {text}
                <ChevronDown
                  className={`size-5 motion-safe:transition-transform ${expanded ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>
              {expanded &&
                (key === 'year' ? (
                  <CalendarYears
                    id={id}
                    label={yearsLabel}
                    className={`${pickerPanel} start-0`}
                    year={month.year}
                    onPick={(year) => {
                      setMonth({ ...month, year });
                      closePicker();
                    }}
                  />
                ) : (
                  <div
                    id={id}
                    role="group"
                    aria-label={monthsLabel}
                    className={`${pickerPanel} end-0 grid grid-cols-3 gap-1`}
                  >
                    {Array.from({ length: 12 }, (_, index) => {
                      const date = new Date(month.year, index, 1);
                      return (
                        <button
                          key={index}
                          type="button"
                          aria-label={formatMonth(date, locale)}
                          aria-pressed={month.month === index}
                          onClick={() => {
                            setMonth({ ...month, month: index });
                            closePicker();
                          }}
                          className="min-h-10 cursor-pointer rounded-full text-[15px] aria-pressed:bg-accent aria-pressed:text-accent-ink focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-focus-ring"
                        >
                          {formatMonth(date, locale, 'short')}
                        </button>
                      );
                    })}
                  </div>
                ))}
            </div>
          );
        })}
      </div>
      <div className="grid min-h-72 grid-cols-7 content-start gap-y-0.5 text-center">
        {dayIndexes.map((index) => (
          <span
            key={index}
            aria-hidden="true"
            className="text-sm leading-9 font-medium text-muted"
          >
            {formatNarrowWeekday(new Date(2026, 1, 1 + index + offset), locale)}
          </span>
        ))}
        {leading > 0 && <span style={{ gridColumn: `span ${leading}` }} />}
        {days.map((iso) => (
          <button
            key={iso}
            type="button"
            aria-current={iso === today ? 'date' : undefined}
            aria-pressed={iso === value}
            aria-label={formatLongDate(parseIsoDate(iso), locale)}
            onClick={() => onChange(iso)}
            className={`mx-auto h-10 w-full max-w-10 cursor-pointer rounded-full text-[15px] aria-pressed:bg-accent aria-pressed:text-accent-ink focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-focus-ring ${
              iso === today ? 'shadow-[inset_0_0_0_1.5px_var(--ink-soft)]' : ''
            }`}
          >
            {parseIsoDate(iso).getDate()}
          </button>
        ))}
      </div>
    </div>
  );
}
