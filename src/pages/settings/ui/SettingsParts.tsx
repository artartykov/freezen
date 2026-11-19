import type { ReactNode } from 'react';
import type { Settings } from '@shared/storage';
import { choiceLabel } from '../model/choices';
import type { Choice } from '../model/choices';

export function SettingsGroup({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <section>
      {title ? (
        <h2 className="mx-2 mt-6 mb-2 text-sm font-medium text-muted">
          {title}
        </h2>
      ) : (
        <div className="mt-4" />
      )}
      <ul className="m-0 list-none rounded-[22px] bg-card p-0 py-1">
        {children}
      </ul>
    </section>
  );
}

type RowProps = {
  icon: ReactNode;
  hue: string;
  title: string;
  value?: string;
  disabled?: boolean;
  onClick?: () => void;
};

const rowClass =
  'flex min-h-16 w-full items-center gap-4 rounded-xl px-4 py-2 text-left';

function RowContent({
  icon,
  hue,
  title,
  value,
}: Omit<RowProps, 'onClick' | 'disabled'>) {
  return (
    <>
      <span
        className={`grid size-9 flex-none place-items-center rounded-[10px] text-white [&_svg]:size-5 ${hue}`}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-[17px]">{title}</span>
        {value && <span className="text-sm text-muted">{value}</span>}
      </span>
    </>
  );
}

export function Row({ onClick, disabled, ...content }: RowProps) {
  return (
    <li>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={`${rowClass} cursor-pointer focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-focus-ring disabled:cursor-default`}
        >
          <RowContent {...content} />
        </button>
      ) : (
        <div className={rowClass}>
          <RowContent {...content} />
        </div>
      )}
    </li>
  );
}

type ChoiceRowProps = {
  choice: Choice;
  settings: Settings;
  icon: ReactNode;
  hue: string;
  value?: string;
  onChoose: (choice: Choice) => void;
};

export function ChoiceRow({
  choice,
  settings,
  icon,
  hue,
  value,
  onChoose,
}: ChoiceRowProps) {
  return (
    <Row
      icon={icon}
      hue={hue}
      title={choice.label ?? choice.title}
      value={value ?? choiceLabel(choice, settings)}
      onClick={() => onChoose(choice)}
    />
  );
}
