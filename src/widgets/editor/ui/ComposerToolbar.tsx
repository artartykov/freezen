import {
  BarChart3,
  BellRing,
  Flag,
  Folder,
  Plus,
  Repeat,
  Tag,
  Timer,
} from 'lucide-react';
import { useRef, useState } from 'react';
import type { ReactNode, WheelEvent } from 'react';
import { dueOffset } from '@entities/task';
import { WaitingContactSheet } from '@features/manage-tags';
import { toDestination, useTaskDestinations } from '@features/move-tasks';
import { DateDialog } from '@features/set-due-date';
import { formatDate, useI18n } from '@shared/i18n';
import { addDays, todayIso } from '@shared/lib';
import { moveTask, useData, waitingContactName } from '@shared/storage';
import type { Task } from '@shared/storage';
import type { DestinationOption } from '@shared/ui/DestinationSheet';
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
const destinationChip = `${composerChip} min-w-0 justify-center bg-transparent`;
const detailChip = `${destinationChip} col-start-1 row-start-1 border-t border-line text-focus-ring motion-safe:transition-opacity motion-safe:duration-200`;

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
  const destinationTrack = useRef<HTMLDivElement>(null);
  const start = task.start ?? addDays(today, 1);
  const sections = useTaskDestinations({ hasProject: Boolean(task.projectId) });
  const places =
    sections.find((section) => section.key === 'places')?.destinations ?? [];
  const projects =
    sections.find((section) => section.key === 'projects')?.destinations ?? [];
  function closePicker() {
    setPicker(null);
    restoreFocus();
  }

  function commit(fields: Partial<Task>, reveal?: Picker) {
    onChange(fields);
    if (reveal !== 'tags') closePicker();
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
  const propertyMenus: ComposerEntry[] = properties
    .filter((entry) => entry.key !== 'repeat')
    .map((entry) => ({
      ...entry,
      onSelect: () => setPicker(entry.key),
    }));
  const propertyValues = {
    time: task.minutes ? text.time(task.minutes) : null,
    energy: task.energy ? text.energy[task.energy] : null,
    remind: task.remindAt ? formatReminder(task.remindAt, locale) : null,
    repeat:
      task.repeat && (task.state !== 'scheduled' || task.logged)
        ? messages.repeat[task.repeat]
        : null,
    tags: task.tagIds.length ? text.tags(task.tagIds.length) : null,
  };
  const order = ['time', 'energy', 'remind', 'repeat', 'tags'] as const;
  return (
    <>
      <fieldset
        disabled={saving}
        data-composer-controls
        className="mt-2 flex min-w-0 flex-col gap-1.5"
      >
        <div className="flex min-w-0 items-center gap-1.5">
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
        </div>
        <div ref={destinationTrack} className="min-w-0 p-0.5">
          <ComposerDestination
            task={task}
            destinations={places}
            start={start}
            projectControl={
              projects.length > 0 && (
                <ComposerProject
                  projectId={task.projectId}
                  projects={projects}
                  onChange={onChange}
                  onDismiss={restoreFocus}
                />
              )
            }
            onDismiss={restoreFocus}
            onMove={(next) => {
              onChange(next);
              if (next.state === 'waiting' || next.state === 'scheduled') {
                requestAnimationFrame(() => {
                  destinationTrack.current
                    ?.querySelector('[data-destination-detail]')
                    ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                });
              }
            }}
            onContact={() => setPicker('contact')}
            onStart={() => setPicker('start')}
            onRepeat={() => setPicker('repeat')}
          />
        </div>
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

function ComposerProject({
  projectId,
  projects,
  onChange,
  onDismiss,
}: {
  projectId: Task['projectId'];
  projects: DestinationOption[];
  onChange: (fields: Partial<Task>) => void;
  onDismiss: () => void;
}) {
  const { messages } = useI18n();
  const projectKey = projectId ? `project:${projectId}` : 'no-project';
  const project = projectId
    ? projects.find((option) => option.key === projectKey)
    : undefined;
  const projectLabel = project?.label ?? messages.composer.project;
  const projectMenu: ComposerEntry[] = projects.map((option) => ({
    ...option,
    checked: option.key === projectKey,
    onSelect: () => {
      if (option.key === projectKey) return;
      onChange({
        projectId:
          option.key === 'no-project'
            ? null
            : option.key.slice('project:'.length),
      });
    },
  }));

  return (
    <ComposerMenu
      label={projectLabel}
      heading={messages.move.projects}
      trigger={
        <span
          key={projectKey}
          className="flex min-w-0 items-center gap-1.5 motion-safe:animate-fade-in"
        >
          {project?.icon ?? <Folder aria-hidden="true" />}
          <span className="min-w-0 truncate" title={projectLabel}>
            {projectLabel}
          </span>
        </span>
      }
      entries={projectMenu}
      onDismiss={onDismiss}
      className={
        project
          ? `${destinationChip} w-full text-focus-ring`
          : `${destinationChip} w-full`
      }
    />
  );
}

function ComposerDestination({
  task,
  destinations,
  projectControl,
  start,
  onMove,
  onDismiss,
  onContact,
  onStart,
  onRepeat,
}: {
  task: Task;
  destinations: DestinationOption[];
  projectControl: ReactNode;
  start: string;
  onMove: (task: Task) => void;
  onDismiss: () => void;
  onContact: () => void;
  onStart: () => void;
  onRepeat: () => void;
}) {
  const { messages } = useI18n();
  const current = task.logged ? 'logbook' : task.state;
  const showProject = task.state !== 'inbox' && Boolean(projectControl);
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
      if (option.key !== current)
        onMove(moveTask(task, toDestination(option.key)));
    },
  }));
  return (
    <div
      className={`grid w-full min-w-0 items-center rounded-xl bg-surface motion-safe:transition-[grid-template-columns] motion-safe:duration-200 ${showProject ? 'grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)]' : 'grid-cols-[minmax(0,0fr)_0px_minmax(0,1fr)]'}`}
    >
      <div
        inert={!showProject}
        aria-hidden={!showProject}
        className={`min-w-0 overflow-hidden motion-safe:transition-opacity motion-safe:duration-200 ${showProject ? 'opacity-100' : 'opacity-0'}`}
      >
        {projectControl}
      </div>
      <span aria-hidden="true" className="h-5 bg-line" />
      <ComposerMenu
        label={placeLabel}
        trigger={
          <span
            key={current}
            className="flex min-w-0 items-center gap-1.5 motion-safe:animate-fade-in"
          >
            {placeIcon}
            <span className="min-w-0 truncate">{placeLabel}</span>
          </span>
        }
        entries={destinationMenu}
        onDismiss={onDismiss}
        className={destinationChip}
      />
      <ComposerDestinationDetails
        task={task}
        start={start}
        current={current}
        onContact={onContact}
        onStart={onStart}
        onRepeat={onRepeat}
      />
    </div>
  );
}

function ComposerDestinationDetails({
  task,
  start,
  current,
  onContact,
  onStart,
  onRepeat,
}: {
  task: Task;
  start: string;
  current: Task['state'] | 'logbook';
  onContact: () => void;
  onStart: () => void;
  onRepeat: () => void;
}) {
  const { messages, locale } = useI18n();
  const text = messages.composer;
  const contactName = useData((data) => waitingContactName(task, data.tags));
  const showWaiting = current === 'waiting';
  const showScheduled = current === 'scheduled';
  const showDetail = showWaiting || showScheduled;

  return (
    <div
      data-destination-detail
      className={`col-span-full grid motion-safe:transition-[grid-template-rows] motion-safe:duration-200 ${showDetail ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      onTransitionEnd={(event) => {
        if (showDetail && event.target === event.currentTarget)
          event.currentTarget.scrollIntoView({ block: 'nearest' });
      }}
    >
      <div className="grid min-h-0 overflow-hidden">
        <button
          type="button"
          inert={!showWaiting}
          aria-hidden={!showWaiting}
          className={`${detailChip} ${showWaiting ? 'opacity-100' : 'opacity-0'}`}
          onClick={onContact}
        >
          <span className="min-w-0 truncate">
            {text.waitingFor(contactName || messages.task.someone)}
          </span>
        </button>
        <div
          inert={!showScheduled}
          aria-hidden={!showScheduled}
          className={`col-start-1 row-start-1 grid min-w-0 grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)] items-center border-t border-line motion-safe:transition-opacity motion-safe:duration-200 ${showScheduled ? 'opacity-100' : 'opacity-0'}`}
        >
          <button
            type="button"
            className={`${destinationChip} text-focus-ring`}
            onClick={onStart}
          >
            <span className="min-w-0 truncate">
              {text.scheduledFor(formatDate(start, locale))}
            </span>
          </button>
          <span aria-hidden="true" className="h-5 bg-line" />
          <button
            type="button"
            className={
              task.repeat
                ? `${destinationChip} text-focus-ring`
                : destinationChip
            }
            onClick={onRepeat}
          >
            <Repeat aria-hidden="true" />
            <span className="min-w-0 truncate">
              {task.repeat
                ? messages.repeat[task.repeat]
                : messages.repeat.title}
            </span>
          </button>
        </div>
      </div>
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
          onChange={(repeat) => commit({ repeat })}
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
