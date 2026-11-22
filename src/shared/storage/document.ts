export type TaskState =
  'inbox' | 'next' | 'later' | 'scheduled' | 'someday' | 'waiting';

export type ProjectState = Exclude<TaskState, 'inbox'>;

export type Energy = 'low' | 'medium' | 'high';

export type Repeat = 'day' | 'week' | 'month' | 'year';

export type TagType = 'area' | 'context' | 'contact';

export type TagColor =
  'none' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple';

export type NoteVersion = { title: string; note: string };

export type Task = {
  id: string;
  title: string;
  note: string;
  noteHistory?: NoteVersion[];
  state: TaskState;
  starred: boolean;
  projectId: string | null;
  tagIds: string[];
  due: string | null;
  start: string | null;
  waitingFor: string;
  waitingContactId?: string | null;
  minutes: number | null;
  energy: Energy | null;
  remindAt: string | null;
  repeat: Repeat | null;
  completedAt: string | null;
  logged: boolean;
  trashed: boolean;
  trashId?: string;
  trashedAt?: string;
};

export type Project = {
  id: string;
  name: string;
  note: string;
  noteHistory?: NoteVersion[];
  state: ProjectState;
  sequential: boolean;
  starred: boolean;
  tagIds: string[];
  due: string | null;
  completedAt: string | null;
  logged: boolean;
  trashed: boolean;
  trashId?: string;
  trashedAt?: string;
};

export type Reference = {
  id: string;
  name: string;
  note: string;
  noteHistory?: NoteVersion[];
  starred: boolean;
  tagIds: string[];
  trashed: boolean;
  trashId?: string;
  trashedAt?: string;
};

export type ReferenceItem = {
  id: string;
  referenceId: string;
  title: string;
  note: string;
  noteHistory?: NoteVersion[];
  starred: boolean;
  tagIds: string[];
  trashed: boolean;
  trashId?: string;
  trashedAt?: string;
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

export const trashRetentionOptions = ['30', '90', '180'] as const;

export type Settings = {
  newTasks: 'top' | 'bottom';
  onCompletion: 'leave' | 'move';
  logCompleted: 'immediately' | 'daily' | 'manually';
  showLater: boolean;
  showWaiting: boolean;
  showReference: boolean;
  areaAssign: boolean;
  areaIncludeUnassigned: boolean;
  trashRetention: (typeof trashRetentionOptions)[number];
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
  onCompletion: 'move',
  logCompleted: 'daily',
  showLater: true,
  showWaiting: true,
  showReference: true,
  areaAssign: false,
  areaIncludeUnassigned: false,
  trashRetention: '30',
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

export class FutureDataVersionError extends UnsupportedDataError {}

function isNoteHistory(value: unknown) {
  return (
    Array.isArray(value) &&
    (value as unknown[]).every((entry) => {
      if (typeof entry !== 'object' || entry === null) return false;
      const version = entry as Record<string, unknown>;
      return (
        typeof version.title === 'string' && typeof version.note === 'string'
      );
    })
  );
}

function listOf<T>(
  fields: Record<string, unknown>,
  key: string,
  textFields: string[],
): T[] {
  const value = fields[key];
  if (!Array.isArray(value)) throw new UnsupportedDataError(key);
  const ids = new Set<string>();
  for (const entry of value as unknown[]) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      throw new UnsupportedDataError(key);
    }
    const record = entry as Record<string, unknown>;
    if (
      typeof record.id !== 'string' ||
      ids.has(record.id) ||
      (record.noteHistory !== undefined &&
        !isNoteHistory(record.noteHistory)) ||
      textFields.some((field) => typeof record[field] !== 'string')
    )
      throw new UnsupportedDataError(key);
    ids.add(record.id);
  }
  return value as T[];
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
    const reason = `version ${String(fields.version)}`;
    if (typeof fields.version === 'number' && fields.version > currentVersion) {
      throw new FutureDataVersionError(reason);
    }
    throw new UnsupportedDataError(reason);
  }

  const keys = Object.keys(fields);
  if (keys.length === 1) return defaultData;
  if (
    keys.some((key) => key !== 'version' && !Object.hasOwn(defaultData, key))
  ) {
    throw new UnsupportedDataError('unrecognized document fields');
  }

  const settings =
    typeof fields.settings === 'object' && fields.settings !== null
      ? (fields.settings as Partial<Settings>)
      : {};

  return {
    tasks: listOf<Task>(fields, 'tasks', ['title', 'note']).map((task) => ({
      ...task,
      remindAt: task.remindAt ?? null,
      repeat: task.repeat ?? null,
    })),
    projects: listOf<Project>(fields, 'projects', ['name', 'note']).map(
      (project) => ({
        ...project,
        trashed: project.trashed ?? false,
      }),
    ),
    references: listOf<Reference>(fields, 'references', ['name', 'note']).map(
      (reference) => ({
        ...reference,
        trashed: reference.trashed ?? false,
      }),
    ),
    referenceItems: listOf<ReferenceItem>(fields, 'referenceItems', [
      'referenceId',
      'title',
      'note',
    ]).map((item) => ({ ...item, trashed: item.trashed ?? false })),
    tags: listOf<Tag>(fields, 'tags', ['name']),
    settings: {
      ...defaultSettings,
      ...settings,
      dateFormat:
        settings.dateFormat && dateFormats.includes(settings.dateFormat)
          ? settings.dateFormat
          : 'iso',
      trashRetention:
        settings.trashRetention &&
        trashRetentionOptions.includes(settings.trashRetention)
          ? settings.trashRetention
          : defaultSettings.trashRetention,
      language: settings.language === 'ru' ? 'ru' : 'en',
    },
  };
}

export function serializeData(data: AppData) {
  return JSON.stringify({ ...data, version: currentVersion });
}
