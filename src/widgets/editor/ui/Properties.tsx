import { BarChart3, Flag, Tag as TagShape, Timer } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { TagPill } from '@entities/tag';
import {
  dueOffset,
  pomodoroBucket,
  pomodoroMinutes,
  useEffortFormat,
} from '@entities/task';
import { ManageTagsButton } from '@features/manage-tags';
import { DateDialog } from '@features/set-due-date';
import { TagSheet } from '@features/set-tags';
import { formatDate, useI18n } from '@shared/i18n';
import { todayIso } from '@shared/lib';
import { tagNames, useData } from '@shared/storage';
import type { Energy } from '@shared/storage';
import { OptionList } from '@shared/ui/OptionList';
import { Sheet, SheetBody, SheetHeader } from '@shared/ui/Sheet';
import { PropertyRow } from './PropertyRow';

export type PropertyName = 'tags' | 'time' | 'energy' | 'due';

export type PropertyValues = {
  tagIds: string[];
  minutes?: number | null;
  energy?: Energy | null;
  due: string | null;
};

type PropertiesProps = {
  names: PropertyName[];
  values: PropertyValues;
  onChange: (values: Partial<PropertyValues>) => void;
};

const minuteOptions = [5, 10, 15, 30, 45, 60, 90, 120, 180, 240, 360];
const energyOptions: Energy[] = ['low', 'medium', 'high'];

export function Properties({ names, values, onChange }: PropertiesProps) {
  const { locale, messages } = useI18n();
  const data = useData();
  const effort = useEffortFormat();
  const [open, setOpen] = useState<PropertyName | null>(null);
  const labels: Record<PropertyName, string> = {
    tags: messages.editor.tags,
    time: messages.editor.time,
    energy: messages.editor.energy,
    due: messages.editor.due,
  };
  const icons: Record<PropertyName, ReactNode> = {
    tags: <TagShape aria-hidden="true" />,
    time: <Timer aria-hidden="true" />,
    energy: <BarChart3 aria-hidden="true" />,
    due: <Flag aria-hidden="true" />,
  };

  function isSet(name: PropertyName) {
    if (name === 'tags') return values.tagIds.length > 0;
    if (name === 'time') return !!values.minutes;
    if (name === 'energy') return !!values.energy;
    return !!values.due;
  }

  function clear(name: PropertyName) {
    if (name === 'tags') onChange({ tagIds: [] });
    if (name === 'time') onChange({ minutes: null });
    if (name === 'energy') onChange({ energy: null });
    if (name === 'due') onChange({ due: null });
  }

  function display(name: PropertyName): ReactNode {
    if (name === 'tags') {
      return (
        <span className="flex flex-wrap gap-1.5 py-3">
          {tagNames(data, values.tagIds).map((tag) => (
            <TagPill key={tag} name={tag} />
          ))}
        </span>
      );
    }
    if (name === 'time') return effort.shortLabel(values.minutes ?? 0);
    if (name === 'energy')
      return values.energy ? messages.editor.energyShort[values.energy] : '';
    const due = values.due ?? todayIso();
    return (
      <span className="flex flex-col gap-0.5">
        <span>{formatDate(due, locale)}</span>
        <span className="text-[15px] text-muted">
          {messages.task.dueIn(dueOffset(due, todayIso()))}
        </span>
      </span>
    );
  }

  const unset = names.filter((name) => !isSet(name));
  return (
    <>
      {names.filter(isSet).map((name) => (
        <PropertyRow
          key={name}
          icon={icons[name]}
          clearLabel={messages.editor.clear(labels[name])}
          onOpen={() => setOpen(name)}
          onClear={() => clear(name)}
        >
          {display(name)}
        </PropertyRow>
      ))}
      {unset.length > 0 && (
        <div className="flex flex-wrap justify-end gap-2 px-3 pt-4 pb-2">
          {unset.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setOpen(name)}
              className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border border-line pr-3 pl-2 [&>svg]:size-[22px] [&>svg]:text-muted"
            >
              {icons[name]}
              {labels[name]}
            </button>
          ))}
        </div>
      )}
      <PropertyPicker
        open={open}
        values={values}
        onChange={onChange}
        onClose={() => setOpen(null)}
      />
    </>
  );
}

export function PropertyPicker({
  open,
  values,
  onChange,
  onClose,
}: Pick<PropertiesProps, 'values' | 'onChange'> & {
  open: PropertyName | null;
  onClose: () => void;
}) {
  const { messages } = useI18n();
  const effort = useEffortFormat();
  const timeOptions = effort.pomodoro ? pomodoroMinutes : minuteOptions;
  const timeValue =
    effort.pomodoro && values.minutes
      ? pomodoroBucket(values.minutes)
      : (values.minutes ?? null);

  function pickMinutes(minutes: number | null) {
    const unchanged = minutes !== null && minutes === timeValue;
    onChange({ minutes: unchanged ? (values.minutes ?? null) : minutes });
    onClose();
  }

  return (
    <>
      {open === 'tags' && (
        <TagSheet
          extra={<ManageTagsButton />}
          value={values.tagIds}
          onClose={onClose}
          onSave={(tagIds) => {
            onChange({ tagIds });
            onClose();
          }}
        />
      )}
      {open === 'due' && (
        <DateDialog
          title={messages.calendar.dueDate}
          value={values.due}
          onClose={onClose}
          onSave={(due) => {
            onChange({ due });
            onClose();
          }}
        />
      )}
      {open === 'time' && (
        <ChoiceSheet
          title={messages.editor.timeNeeded}
          value={timeValue}
          options={[
            { value: null, label: messages.common.none },
            ...timeOptions.map((minutes) => ({
              value: minutes,
              label: effort.label(minutes),
            })),
          ]}
          onClose={onClose}
          onChange={pickMinutes}
        />
      )}
      {open === 'energy' && (
        <ChoiceSheet
          title={messages.editor.energyNeeded}
          value={values.energy ?? null}
          options={[
            { value: null, label: messages.common.none },
            ...energyOptions.map((energy) => ({
              value: energy,
              label: messages.editor.energyLevels[energy],
            })),
          ]}
          onClose={onClose}
          onChange={(energy) => {
            onChange({ energy });
            onClose();
          }}
        />
      )}
    </>
  );
}

type ChoiceSheetProps<T extends string | number | null> = {
  title: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  onClose: () => void;
};

export function ChoiceSheet<T extends string | number | null>({
  title,
  value,
  options,
  onChange,
  onClose,
}: ChoiceSheetProps<T>) {
  const { messages } = useI18n();

  return (
    <Sheet label={title} onClose={onClose}>
      <SheetHeader
        title={title}
        onBack={onClose}
        backLabel={messages.common.back}
      />
      <SheetBody>
        <OptionList
          label={title}
          options={options}
          value={value}
          onChange={onChange}
        />
      </SheetBody>
    </Sheet>
  );
}
