import { useNavigate, useSearch } from '@tanstack/react-router';
import { Bookmark, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ProgressRing } from '@entities/project';
import { useI18n } from '@shared/i18n';
import { todayIso } from '@shared/lib';
import { useOverlay, useUiState } from '@shared/model';
import {
  activeProjects,
  isLive,
  liveReferences,
  projectProgress,
  searchWords,
  useData,
} from '@shared/storage';
import { Modal } from '@shared/ui/Modal';
import { PlaceIcon } from '@shared/ui/PlaceIcon';
import { recentEntries } from '../model/entries';
import type { Entry } from '../model/entries';
import type { Place } from '@shared/ui/PlaceIcon';

const allPlaces: Place[] = [
  'inbox',
  'focus',
  'next',
  'later',
  'scheduled',
  'someday',
  'waiting',
  'projects',
  'references',
  'logbook',
  'trash',
  'search',
  'settings',
];

export function QuickFind() {
  const { find } = useSearch({ strict: false });
  const overlay = useOverlay();

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (!find) overlay.openQuickFind();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [find, overlay]);

  return find ? <QuickFindCard onClose={overlay.close} /> : null;
}

function QuickFindCard({ onClose }: { onClose: () => void }) {
  const { messages } = useI18n();
  const navigate = useNavigate();
  const overlay = useOverlay();
  const data = useData();
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const words = searchWords(query);
  const today = todayIso();

  const places = allPlaces.filter(
    (place) =>
      (place !== 'later' || data.settings.showLater) &&
      (place !== 'waiting' || data.settings.showWaiting) &&
      (place !== 'references' || data.settings.showReference),
  );
  const named = (label: string) =>
    words.every((word) => label.toLowerCase().includes(word));
  const recent = useUiState((state) => state.recent);
  const history = recentEntries(recent, { data, messages, today, places });
  const entries: Entry[] = [
    ...(words.length
      ? places
          .map((place) => ({
            kind: 'place' as const,
            place,
            label: messages.places[place].title,
          }))
          .filter((entry) => named(entry.label))
      : [...history.recent, ...history.rest]),
    ...(words.length
      ? [
          ...activeProjects(data, today)
            .filter((project) => named(project.name))
            .map((project) => ({
              kind: 'project' as const,
              id: project.id,
              label: project.name || messages.project.untitled,
              progress: projectProgress(data, project),
            })),
          ...(data.settings.showReference ? liveReferences(data) : [])
            .filter((reference) => named(reference.name))
            .map((reference) => ({
              kind: 'reference' as const,
              id: reference.id,
              label: reference.name,
            })),
          ...data.tasks
            .filter(
              (task) =>
                isLive(task, data, today) &&
                named(`${task.title}\n${task.note}`),
            )
            .slice(0, 60)
            .map((task) => ({
              kind: 'task' as const,
              id: task.id,
              label: task.title,
            })),
        ]
      : []),
  ];

  function go(entry: Entry) {
    if (entry.kind === 'task') {
      overlay.openEditor({ kind: 'task', id: entry.id });
      return;
    }
    if (entry.kind === 'project') {
      void navigate({
        to: '/project/$projectId',
        params: { projectId: entry.id },
        replace: true,
      });
      return;
    }
    if (entry.kind === 'reference') {
      void navigate({
        to: '/reference/$referenceId',
        params: { referenceId: entry.id },
        replace: true,
      });
      return;
    }
    void navigate({ to: `/${entry.place}`, replace: true });
  }

  function handleEscape() {
    if (query) setQuery('');
    else onClose();
  }

  return (
    <Modal
      label={messages.quickFind.label}
      onClose={onClose}
      onEscape={handleEscape}
      closeLabel={messages.quickFind.close}
    >
      <div className="absolute inset-x-4 top-[calc(12px+env(safe-area-inset-top))] mx-auto flex max-h-[calc(100%-28px-env(safe-area-inset-top))] max-w-[408px] flex-col overflow-hidden rounded-[28px] bg-card shadow-[0_12px_40px_rgba(0,0,0,.3)] motion-safe:animate-pop">
        <div className="flex min-h-16 flex-none items-center gap-2 border-b border-line py-1 pr-1.5 pl-5">
          <Search className="size-6 flex-none text-muted" aria-hidden="true" />
          <input
            value={query}
            data-autofocus
            onChange={(event) => {
              setQuery(event.target.value);
              setHighlight(0);
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                const delta = event.key === 'ArrowDown' ? 1 : -1;
                setHighlight(
                  (highlight + delta + entries.length) %
                    Math.max(entries.length, 1),
                );
              }
              if (event.key === 'Enter' && entries[highlight]) {
                event.preventDefault();
                go(entries[highlight]);
              }
            }}
            placeholder={messages.quickFind.label}
            aria-label={messages.quickFind.label}
            autoComplete="off"
            className="min-h-12 min-w-0 flex-1 border-0 bg-transparent text-lg outline-0"
          />
          <button
            type="button"
            aria-label={messages.quickFind.close}
            onClick={onClose}
            className="grid size-11 flex-none cursor-pointer place-items-center rounded-xl"
          >
            <X className="size-6" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-1">
          {!words.length && (
            <p className="px-5 pt-4 pb-1 text-sm font-medium text-muted">
              {messages.quickFind.recent}
            </p>
          )}
          {entries.map((entry, index) => (
            <button
              key={
                entry.kind === 'place'
                  ? entry.place
                  : `${entry.kind}:${entry.id}`
              }
              type="button"
              onClick={() => go(entry)}
              className={`flex min-h-[54px] w-full cursor-pointer items-center gap-4.5 px-5 text-left text-[17px] ${
                words.length && index === highlight ? 'bg-glow' : ''
              }`}
            >
              {entry.kind === 'place' && <PlaceIcon place={entry.place} />}
              {entry.kind === 'project' && (
                <ProgressRing progress={entry.progress} done={false} />
              )}
              {entry.kind === 'reference' && (
                <Bookmark className="size-6 text-muted" aria-hidden="true" />
              )}
              {entry.kind === 'task' && (
                <i className="m-0.5 size-5 flex-none rounded-[4px] border-2 border-muted" />
              )}
              <span className="truncate">{entry.label}</span>
            </button>
          ))}
          {!entries.length && (
            <p className="px-5 py-7 text-center text-[17px] text-muted">
              {messages.quickFind.nothing}
            </p>
          )}
        </div>
        <p className="flex-none border-t border-line px-5 pt-3.5 pb-4 text-center text-sm text-muted">
          {messages.quickFind.hint}
        </p>
      </div>
    </Modal>
  );
}
