import type { Messages } from '@shared/i18n';
import type { RecentEntry } from '@shared/model';
import { isLive, isProjectLogged, projectProgress } from '@shared/storage';
import type { AppData } from '@shared/storage';
import type { Place } from '@shared/ui/PlaceIcon';

export type Entry =
  | { kind: 'place'; place: Place; label: string }
  | { kind: 'project'; id: string; label: string; progress: number }
  | { kind: 'reference'; id: string; label: string }
  | { kind: 'task'; id: string; label: string };

type Context = {
  data: AppData;
  messages: Messages;
  today: string;
  places: Place[];
};

function toEntry(
  recent: RecentEntry,
  { data, messages, today, places }: Context,
): Entry | null {
  if (recent.kind === 'place') {
    const place = places.find((candidate) => candidate === recent.id);
    return place
      ? { kind: 'place', place, label: messages.places[place].title }
      : null;
  }
  if (recent.kind === 'project') {
    const project = data.projects.find(
      (candidate) => candidate.id === recent.id,
    );
    if (!project || project.trashed || isProjectLogged(project, data, today))
      return null;
    return {
      kind: 'project',
      id: project.id,
      label: project.name || messages.project.untitled,
      progress: projectProgress(data, project),
    };
  }
  if (recent.kind === 'reference') {
    const reference = data.references.find(
      (candidate) => candidate.id === recent.id,
    );
    if (!reference || reference.trashed || !data.settings.showReference)
      return null;
    return {
      kind: 'reference',
      id: reference.id,
      label: reference.name || messages.reference.untitled,
    };
  }
  const task = data.tasks.find((candidate) => candidate.id === recent.id);
  return task && isLive(task, data, today)
    ? { kind: 'task', id: task.id, label: task.title }
    : null;
}

export function recentEntries(recent: RecentEntry[], context: Context) {
  const entries = recent
    .map((entry) => toEntry(entry, context))
    .filter((entry): entry is Entry => !!entry);
  const shown = entries.slice(0, 6);
  const shownPlaces = new Set(
    shown.flatMap((entry) => (entry.kind === 'place' ? [entry.place] : [])),
  );
  const rest: Entry[] = context.places
    .filter((place) => !shownPlaces.has(place))
    .map((place) => ({
      kind: 'place',
      place,
      label: context.messages.places[place].title,
    }));
  return { recent: shown, rest };
}
