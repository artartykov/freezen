import { useCallback, useId, useRef } from 'react';
import type { KeyboardEvent, MouseEvent, UIEvent } from 'react';

const ROW = 44;
const SETTLE_MS = 90;

const pad = (value: number) => String(value).padStart(2, '0');
const HOURS_24 = Array.from({ length: 24 }, (_, hour) => pad(hour));
const HOURS_12 = Array.from({ length: 12 }, (_, index) => String(index + 1));
const MINUTES = Array.from({ length: 12 }, (_, index) => pad(index * 5));

const KEY_STEPS: Record<string, number> = {
  ArrowUp: -1,
  ArrowDown: 1,
  Home: -Infinity,
  End: Infinity,
};

type WheelProps = {
  label: string;
  options: readonly string[];
  selected: number;
  onSelect: (index: number) => void;
};

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 'auto'
    : 'smooth';
}

function Wheel({ label, options, selected, onSelect }: WheelProps) {
  const id = useId();
  const initial = useRef(selected);
  const timer = useRef(0);
  const attach = useCallback((node: HTMLDivElement | null) => {
    if (node) node.scrollTop = initial.current * ROW;
    return () => window.clearTimeout(timer.current);
  }, []);

  function go(list: HTMLElement, index: number, scroll: boolean) {
    const next = Math.max(0, Math.min(options.length - 1, index));
    if (next !== selected) onSelect(next);
    if (scroll) list.scrollTo({ top: next * ROW, behavior: scrollBehavior() });
  }

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const list = event.currentTarget;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      go(list, Math.round(list.scrollTop / ROW), false);
    }, SETTLE_MS);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = KEY_STEPS[event.key];
    if (step === undefined) return;
    event.preventDefault();
    go(event.currentTarget, selected + step, true);
  }

  function handleClick(event: MouseEvent<HTMLButtonElement>, index: number) {
    const list = event.currentTarget.parentElement;
    if (list) go(list, index, true);
  }

  return (
    <div
      ref={attach}
      role="listbox"
      tabIndex={0}
      aria-label={label}
      aria-activedescendant={`${id}-${selected}`}
      onScroll={handleScroll}
      onKeyDown={handleKeyDown}
      className="relative z-1 h-[220px] max-w-24 flex-1 basis-0 snap-y snap-mandatory overflow-y-auto rounded-xl py-[88px] focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-focus-ring"
    >
      {options.map((option, index) => (
        <button
          key={option}
          id={`${id}-${index}`}
          type="button"
          role="option"
          tabIndex={-1}
          aria-selected={index === selected}
          onClick={(event) => handleClick(event, index)}
          className="block h-11 w-full cursor-pointer snap-center text-center text-[20px] leading-11 text-muted aria-selected:font-medium aria-selected:text-ink"
        >
          {option}
        </button>
      ))}
    </div>
  );
}

type TimeWheelsProps = {
  hour: number;
  minute: number;
  hours24: boolean;
  labels: {
    time: string;
    hour: string;
    minute: string;
    period: string;
    periods: readonly [string, string];
  };
  onChange: (hour: number, minute: number) => void;
};

export function TimeWheels({
  hour,
  minute,
  hours24,
  labels,
  onChange,
}: TimeWheelsProps) {
  const pm = hour >= 12;
  const minuteIndex = Math.min(MINUTES.length - 1, Math.round(minute / 5));

  return (
    <div
      role="group"
      aria-label={labels.time}
      className="relative mt-3 mb-1 flex h-[220px] justify-center gap-1 before:absolute before:inset-x-0 before:top-[88px] before:h-11 before:rounded-xl before:bg-glow"
    >
      {hours24 ? (
        <Wheel
          label={labels.hour}
          options={HOURS_24}
          selected={hour}
          onSelect={(index) => onChange(index, minute)}
        />
      ) : (
        <Wheel
          label={labels.hour}
          options={HOURS_12}
          selected={(hour % 12 || 12) - 1}
          onSelect={(index) =>
            onChange(((index + 1) % 12) + (pm ? 12 : 0), minute)
          }
        />
      )}
      <Wheel
        label={labels.minute}
        options={MINUTES}
        selected={minuteIndex}
        onSelect={(index) => onChange(hour, index * 5)}
      />
      {!hours24 && (
        <Wheel
          label={labels.period}
          options={labels.periods}
          selected={pm ? 1 : 0}
          onSelect={(index) => onChange((hour % 12) + (index ? 12 : 0), minute)}
        />
      )}
    </div>
  );
}
