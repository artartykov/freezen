export type TaskState =
  'inbox' | 'next' | 'later' | 'scheduled' | 'someday' | 'waiting';

export type ProjectState = Exclude<TaskState, 'inbox'>;

export type Energy = 'low' | 'medium' | 'high';

export type Repeat = 'day' | 'week' | 'month' | 'year';

export type TagType = 'area' | 'context' | 'contact';

export type TagColor =
  'none' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple';

export type Task = {
  id: string;
  title: string;
  note: string;
  state: TaskState;
  starred: boolean;
  projectId: string | null;
  tagIds: string[];
  due: string | null;
  start: string | null;
  waitingFor: string;
  minutes: number | null;
  energy: Energy | null;
  remindAt: string | null;
  repeat: Repeat | null;
  completedAt: string | null;
  logged: boolean;
  trashed: boolean;
};

export type Project = {
  id: string;
  name: string;
  note: string;
  state: ProjectState;
  sequential: boolean;
  starred: boolean;
  tagIds: string[];
  due: string | null;
  completedAt: string | null;
  logged: boolean;
  trashed: boolean;
};

export type Reference = {
  id: string;
  name: string;
  note: string;
  starred: boolean;
  tagIds: string[];
  trashed: boolean;
};

export type ReferenceItem = {
  id: string;
  referenceId: string;
  title: string;
  note: string;
  starred: boolean;
  tagIds: string[];
  trashed: boolean;
};

export type Tag = {
  id: string;
  name: string;
  type: TagType;
  color: TagColor;
};

export type Weekday =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday';

export type Settings = {
  newTasks: 'top' | 'bottom';
  onCompletion: 'leave' | 'move';
  logCompleted: 'immediately' | 'daily' | 'manually';
  showLater: boolean;
  showWaiting: boolean;
  showReference: boolean;
  areaAssign: boolean;
  areaIncludeUnassigned: boolean;
  language: 'en' | 'ru';
  showCalendarEvents: boolean;
  dateFormat: 'ru' | 'iso' | 'us';
  timeFormat: '12h' | '24h';
  weekStart: 'sunday' | 'monday';
  longNotes: 'lines' | 'full';
  effortFormat: 'standard' | 'pomodoro';
  counts: 'important' | 'all';
  dailyNudge: {
    mode: 'off' | 'weekdays' | 'everyday';
    hour: number;
    minute: number;
  };
  weeklyReview: { day: 'off' | Weekday; hour: number; minute: number };
};

export type AppData = {
  tasks: Task[];
  projects: Project[];
  references: Reference[];
  referenceItems: ReferenceItem[];
  tags: Tag[];
  settings: Settings;
};

const currentVersion = 1;

const dateFormats: Settings['dateFormat'][] = ['ru', 'iso', 'us'];

export const defaultSettings: Settings = {
  newTasks: 'bottom',
  onCompletion: 'leave',
  logCompleted: 'daily',
  showLater: false,
  showWaiting: true,
  showReference: false,
  areaAssign: false,
  areaIncludeUnassigned: false,
  language: 'en',
  showCalendarEvents: true,
  dateFormat: 'iso',
  timeFormat: '24h',
  weekStart: 'monday',
  longNotes: 'lines',
  effortFormat: 'standard',
  counts: 'important',
  dailyNudge: { mode: 'everyday', hour: 8, minute: 0 },
  weeklyReview: { day: 'friday', hour: 15, minute: 0 },
};

export const defaultData: AppData = {
  tasks: [],
  projects: [],
  references: [],
  referenceItems: [],
  tags: [],
  settings: defaultSettings,
};

export class UnsupportedDataError extends Error {
  constructor(reason: string) {
    super(`Unsupported FreeZen data: ${reason}`);
    this.name = 'UnsupportedDataError';
  }
}

function listOf<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function parseData(raw: string | null): AppData {
  if (raw === null) return defaultData;

  let document: unknown;
  try {
    document = JSON.parse(raw);
  } catch {
    throw new UnsupportedDataError('invalid JSON');
  }

  if (typeof document !== 'object' || document === null) {
    throw new UnsupportedDataError('not an object');
  }

  const fields = document as Record<string, unknown>;

  if (fields.version !== currentVersion) {
    throw new UnsupportedDataError(`version ${String(fields.version)}`);
  }

  const settings =
    typeof fields.settings === 'object' && fields.settings !== null
      ? (fields.settings as Partial<Settings>)
      : {};

  return {
    tasks: listOf<Task>(fields.tasks).map((task) => ({
      ...task,
      remindAt: task.remindAt ?? null,
      repeat: task.repeat ?? null,
    })),
    projects: listOf<Project>(fields.projects).map((project) => ({
      ...project,
      trashed: project.trashed ?? false,
    })),
    references: listOf<Reference>(fields.references).map((reference) => ({
      ...reference,
      trashed: reference.trashed ?? false,
    })),
    referenceItems: listOf<ReferenceItem>(fields.referenceItems).map(
      (item) => ({ ...item, trashed: item.trashed ?? false }),
    ),
    tags: listOf<Tag>(fields.tags),
    settings: {
      ...defaultSettings,
      ...settings,
      dateFormat:
        settings.dateFormat && dateFormats.includes(settings.dateFormat)
          ? settings.dateFormat
          : 'iso',
      language: settings.language === 'ru' ? 'ru' : 'en',
    },
  };
}

export function serializeData(data: AppData) {
  return JSON.stringify({ ...data, version: currentVersion });
}
