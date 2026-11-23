import { Flag, Tag as TagShape, Tags } from 'lucide-react';
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
import { formatWeekday, useI18n } from '@shared/i18n';
import { todayIso } from '@shared/lib';
import { tagsByIds, useData } from '@shared/storage';
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
  const tags = tagsByIds(useData(), values.tagIds);
  const TagsIcon = tags.length >= 2 ? Tags : TagShape;
  const today = todayIso();
  const dueOffsetDays = values.due ? dueOffset(values.due, today) : null;
  const urgent = dueOffsetDays !== null && dueOffsetDays <= 0;
  const effort = useEffortFormat();
  const [open, setOpen] = useState<PropertyName | null>(null);
  const labels: Record<PropertyName, string> = {
    tags: messages.editor.tags,
    time: messages.editor.time,
    energy: messages.editor.energy,
    due: messages.editor.due,
  };
  const icons: Record<PropertyName, ReactNode> = {
    tags: <TagsIcon aria-hidden="true" />,
    time: <TimeIcon minutes={values.minutes ?? 0} />,
    energy: (
      <EnergyBars
        level={values.energy ? energyOptions.indexOf(values.energy) + 1 : 0}
      />
    ),
    due: <Flag aria-hidden="true" />,
  };

  function isSet(name: PropertyName) {
    if (name === 'tags') return tags.length > 0;
    if (name === 'time') return !!values.minutes;
    if (name === 'energy') return !!values.energy;
    return !!values.due;
  }

  function display(name: PropertyName): ReactNode {
    if (name === 'tags') {
      return (
        <span className="flex flex-wrap gap-1.5 py-3">
          {tags.map((tag) => (
            <TagPill key={tag.id} tag={tag} size="regular" />
          ))}
        </span>
      );
    }
    if (name === 'time') return effort.label(values.minutes ?? 0);
    if (name === 'energy')
      return values.energy ? messages.editor.energyLevels[values.energy] : '';
    const due = values.due ?? today;
    const offset = dueOffsetDays ?? 0;
    return (
      <span className="py-2">
        <span className={urgent ? 'text-danger' : undefined}>
          {labels.due}{' '}
          {formatWeekday(due, locale, due.slice(0, 4) !== today.slice(0, 4))}
        </span>
        <span className="text-muted">
          {' · '}
          {offset === 0
            ? messages.task.dueToday.toLocaleLowerCase(locale)
            : messages.task.dueIn(offset)}
        </span>
      </span>
    );
  }

  return (
    <>
      {names.map((name) => (
        <PropertyRow
          key={name}
          icon={
            name === 'due' ? (
              <Flag
                aria-hidden="true"
                fill="currentColor"
                className={urgent ? 'text-danger!' : undefined}
              />
            ) : (
              icons[name]
            )
          }
          empty={name !== 'energy' && !isSet(name)}
          onOpen={() => setOpen(name)}
        >
          {isSet(name) ? (
            display(name)
          ) : (
            <span className="text-muted">{labels[name]}</span>
          )}
        </PropertyRow>
      ))}
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
          onChange={(tagIds) => onChange({ tagIds })}
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
          halfHeight
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
            {
              value: null,
              label: messages.common.none,
              icon: <EnergyBars level={0} />,
            },
            ...energyOptions.map((energy, index) => ({
              value: energy,
              label: messages.editor.energyLevels[energy],
              icon: <EnergyBars level={index + 1} />,
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

function TimeIcon({ minutes }: { minutes: number }) {
  const duration = Math.max(0, minutes);
  const minuteAngle = (duration % 60) * 6;
  const hourAngle = (duration % 720) / 2;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="14" r="8" />
      <path d="M10 2h4" />
      <path d="M12 14v-3" transform={`rotate(${hourAngle} 12 14)`} />
      <path d="M12 14v-5" transform={`rotate(${minuteAngle} 12 14)`} />
    </svg>
  );
}

function EnergyBars({ level }: { level: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-6 shrink-0 items-center justify-center text-muted"
    >
      <span className="flex items-end gap-0.5">
        {[8, 13, 18].map((height, index) => (
          <span
            key={height}
            style={{ height }}
            className={`w-1 rounded-[1px] bg-current ${index < level ? '' : 'opacity-25'}`}
          />
        ))}
      </span>
    </span>
  );
}

type ChoiceSheetProps<T extends string | number | null> = {
  halfHeight?: boolean;
  title: string;
  value: T;
  options: { value: T; label: string; icon?: ReactNode }[];
  onChange: (value: T) => void;
  onClose: () => void;
};

export function ChoiceSheet<T extends string | number | null>({
  title,
  halfHeight,
  value,
  options,
  onChange,
  onClose,
}: ChoiceSheetProps<T>) {
  const { messages } = useI18n();

  return (
    <Sheet label={title} onClose={onClose} size={halfHeight ? 'half' : 'part'}>
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
