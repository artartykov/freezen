import {
  Bookmark,
  Calendar,
  ChevronsRight,
  Clock,
  FolderClosed,
  Inbox,
  ListChecks,
  Moon,
  Search,
  Settings,
  Star,
  Tag,
  Trash2,
} from 'lucide-react';

export type Place =
  | 'inbox'
  | 'focus'
  | 'next'
  | 'later'
  | 'scheduled'
  | 'someday'
  | 'waiting'
  | 'projects'
  | 'references'
  | 'logbook'
  | 'trash'
  | 'search'
  | 'settings';

const icons = {
  inbox: [Inbox, 'text-muted'],
  focus: [Star, 'text-star fill-star'],
  next: [ChevronsRight, 'text-next'],
  later: [Tag, 'text-later'],
  scheduled: [Calendar, 'text-scheduled'],
  someday: [Moon, 'text-someday'],
  waiting: [Clock, 'text-waiting'],
  projects: [FolderClosed, 'text-muted'],
  references: [Bookmark, 'text-muted'],
  logbook: [ListChecks, 'text-muted'],
  trash: [Trash2, 'text-muted'],
  search: [Search, 'text-muted'],
  settings: [Settings, 'text-muted'],
} as const;

export function PlaceIcon({ place }: { place: Place }) {
  const [Icon, color] = icons[place];
  return (
    <Icon
      className={`size-6 flex-none ${color}`}
      strokeWidth={1.8}
      aria-hidden="true"
    />
  );
}
