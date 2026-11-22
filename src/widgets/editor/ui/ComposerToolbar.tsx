import {
  BarChart3,
  BellRing,
  Flag,
  Plus,
  Repeat,
  Tag,
  Timer,
} from 'lucide-react';
import { useRef, useState } from 'react';
import type { ReactNode, WheelEvent } from 'react';
import { dueOffset } from '@entities/task';
import { WaitingContactSheet } from '@features/manage-tags';
import {
  destinationKey,
  toDestination,
  useTaskDestinations,
} from '@features/move-tasks';
import { DateDialog } from '@features/set-due-date';
import { formatDate, useI18n } from '@shared/i18n';
import { addDays, todayIso } from '@shared/lib';
import { moveTask, useData, waitingContactName } from '@shared/storage';
import type { Task } from '@shared/storage';
import { PlaceIcon } from '@shared/ui/PlaceIcon';
import { formatReminder } from '../lib/reminder';
import { ComposerMenu, composerChip } from './ComposerMenu';
import type { ComposerEntry } from './ComposerMenu';
import { PropertyPicker } from './Properties';
import type { PropertyName } from './Properties';
import { RemindSheet } from './RemindSheet';
import { RepeatSheet } from './RepeatSheet';

type Picker = PropertyName | 'remind' | 'repeat' | 'start' | 'contact';

function scrollTrack(event: WheelEvent<HTMLDivElement>) {
  if (event.deltaX || !event.deltaY || event.ctrlKey) return;
  event.currentTarget.scrollLeft += event.deltaY * (event.deltaMode ? 16 : 1);
}

const selectedChip = `${composerChip} bg-glow text-focus-ring`;
const detailChip = `${composerChip} relative bg-transparent text-focus-ring before:absolute before:inset-y-2.5 before:left-0 before:w-px before:bg-line`;

export function ComposerToolbar({
  task,
  onChange,
  saving,
  restoreFocus,
  children,
}: {
  task: Task;
  onChange: (fields: Partial<Task>) => void;
  saving: boolean;
  restoreFocus: () => void;
  children: ReactNode;
}) {
  const { messages, locale } = useI18n();
  const text = messages.composer;
  const today = todayIso();
  const [picker, setPicker] = useState<Picker | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const start = task.start ?? addDays(today, 1);

  function closePicker() {
    setPicker(null);
    restoreFocus();
  }

  function commit(fields: Partial<Task>, reveal?: Picker) {
    onChange(fields);
    closePicker();
    if (reveal)
      requestAnimationFrame(() => {
        track.current
          ?.querySelector(`[data-property="${reveal}"]`)
          ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      });
  }

  const properties = [
    {
      key: 'tags',
      label: messages.editor.tags,
      icon: <Tag aria-hidden="true" />,
    },
    {
      key: 'time',
      label: messages.editor.time,
      icon: <Timer aria-hidden="true" />,
    },
    {
      key: 'energy',
      label: messages.editor.energy,
      icon: <BarChart3 aria-hidden="true" />,
    },
    {
      key: 'remind',
      label: messages.remind.title,
      icon: <BellRing aria-hidden="true" />,
    },
    {
      key: 'repeat',
      label: messages.repeat.title,
      icon: <Repeat aria-hidden="true" />,
    },
  ] as const;
  const propertyMenus: ComposerEntry[] = properties.map((entry) => ({
    ...entry,
    onSelect: () => setPicker(entry.key),
  }));
  const propertyValues = {
    time: task.minutes ? text.time(task.minutes) : null,
    energy: task.energy ? text.energy[task.energy] : null,
    remind: task.remindAt ? formatReminder(task.remindAt, locale) : null,
    repeat: task.repeat ? messages.repeat[task.repeat] : null,
    tags: task.tagIds.length ? text.tags(task.tagIds.length) : null,
  };
  const order = ['time', 'energy', 'remind', 'repeat', 'tags'] as const;
  return (
    <>
      <fieldset
        disabled={saving}
        data-composer-controls
        className="mt-2 flex min-w-0 items-center gap-1.5"
      >
        <ComposerMenu
          label={text.properties}
          trigger={<Plus aria-hidden="true" />}
          entries={propertyMenus}
          onDismiss={restoreFocus}
        />
        <div
          ref={track}
          data-composer-track
          onWheel={scrollTrack}
          className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto overscroll-x-contain p-0.5"
        >
          <ComposerDestination
            task={task}
            start={start}
            onDismiss={restoreFocus}
            onMove={(next) => {
              onChange(next);
              requestAnimationFrame(() => {
                track.current
                  ?.querySelector('[data-destination-detail]')
                  ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
              });
            }}
            onContact={() => setPicker('contact')}
            onStart={() => setPicker('start')}
          />
          <button
            type="button"
            className={task.due ? selectedChip : composerChip}
            onClick={() => setPicker('due')}
          >
            <Flag aria-hidden="true" />
            {task.due
              ? text.due(dueOffset(task.due, today))
              : messages.editor.due}
          </button>
          {order.map((name) => {
            const value = propertyValues[name];
            const option = properties.find((item) => item.key === name);
            if (!value || !option) return null;
            return (
              <button
                type="button"
                key={name}
                data-property={name}
                className={selectedChip}
                aria-label={
                  name === 'tags' ? value : `${option.label}: ${value}`
                }
                onClick={() => setPicker(name)}
              >
                {option.icon}
                <span className="max-w-28 truncate" title={value}>
                  {value}
                </span>
              </button>
            );
          })}
        </div>
        {children}
      </fieldset>
      <ComposerPickers
        task={task}
        start={start}
        picker={picker}
        commit={commit}
        onClose={closePicker}
      />
    </>
  );
}

function ComposerDestination({
  task,
  start,
  onMove,
  onDismiss,
  onContact,
  onStart,
}: {
  task: Task;
  start: string;
  onMove: (task: Task) => void;
  onDismiss: () => void;
  onContact: () => void;
  onStart: () => void;
}) {
  const { messages, locale } = useI18n();
  const text = messages.composer;
  const contactName = useData((data) => waitingContactName(task, data.tags));
  const destinations = useTaskDestinations().flatMap(
    (section) => section.destinations,
  );
  const current = task.logged ? 'logbook' : destinationKey(task);
  const selected = destinations.find((entry) => entry.key === current);
  const placeLabel =
    selected?.label ??
    (task.logged
      ? messages.places.logbook.title
      : messages.places[task.state].title);
  const placeIcon = selected?.icon ?? (
    <PlaceIcon place={task.logged ? 'logbook' : task.state} />
  );

  const destinationMenu: ComposerEntry[] = destinations.map((option) => ({
    ...option,
    checked: option.key === current,
    onSelect: () => {
      if (option.key !== current) {
        onMove(moveTask(task, toDestination(option.key)));
      }
    },
  }));
  return (
    <div className="flex shrink-0 items-center rounded-xl bg-surface">
      <ComposerMenu
        label={placeLabel}
        trigger={
          <>
            {placeIcon}
            <span className="max-w-32 truncate">{placeLabel}</span>
          </>
        }
        entries={destinationMenu}
        onDismiss={onDismiss}
        className={`${composerChip} bg-transparent`}
      />
      {task.state === 'waiting' && !task.logged && (
        <button
          type="button"
          data-destination-detail
          className={detailChip}
          onClick={() => onContact()}
        >
          <span className="max-w-28 truncate">
            {text.waitingFor(contactName || messages.task.someone)}
          </span>
        </button>
      )}
      {task.state === 'scheduled' && !task.logged && (
        <button
          type="button"
          data-destination-detail
          className={detailChip}
          onClick={() => onStart()}
        >
          {text.scheduledFor(formatDate(start, locale))}
        </button>
      )}
    </div>
  );
}

function ComposerPickers({
  task,
  start,
  picker,
  commit,
  onClose,
}: {
  task: Task;
  start: string;
  picker: Picker | null;
  commit: (fields: Partial<Task>, reveal?: Picker) => void;
  onClose: () => void;
}) {
  const { messages } = useI18n();
  const propertyPicker =
    picker === 'tags' ||
    picker === 'due' ||
    picker === 'time' ||
    picker === 'energy'
      ? picker
      : null;

  return (
    <>
      <PropertyPicker
        open={propertyPicker}
        values={task}
        onChange={(fields) => commit(fields, propertyPicker ?? undefined)}
        onClose={onClose}
      />
      {picker === 'remind' && (
        <RemindSheet
          value={task.remindAt}
          onChange={(remindAt) => commit({ remindAt }, 'remind')}
          onClose={onClose}
        />
      )}
      {picker === 'repeat' && (
        <RepeatSheet
          value={task.repeat}
          onChange={(repeat) => commit({ repeat }, 'repeat')}
          onClose={onClose}
        />
      )}
      {picker === 'contact' && (
        <WaitingContactSheet
          value={task.waitingContactId}
          hasLegacyName={Boolean(task.waitingFor)}
          onSelect={(waitingContactId) =>
            commit({ waitingContactId, waitingFor: '' })
          }
          onClose={onClose}
        />
      )}
      {picker === 'start' && (
        <DateDialog
          title={messages.editor.startDate}
          value={start}
          clearable={false}
          onSave={(date) => commit({ start: date })}
          onClose={onClose}
        />
      )}
    </>
  );
}
