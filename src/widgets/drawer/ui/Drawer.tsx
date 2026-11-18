import { Link } from '@tanstack/react-router';
import {
  ChevronDown,
  Menu as MenuIcon,
  Plus,
  Search,
  Settings,
} from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { ProgressRing } from '@entities/project';
import { useCreateProject } from '@features/create-project';
import { useCreateReference } from '@features/create-reference';
import {
  commitProjectOrder,
  commitReferenceOrder,
  useReorder,
} from '@features/reorder';
import { useI18n } from '@shared/i18n';
import { todayIso, useDragDismiss } from '@shared/lib';
import { useUiState } from '@shared/model';
import {
  focusCount,
  isInArea,
  liveProjects,
  liveReferences,
  openTaskCount,
  projectProgress,
  useData,
} from '@shared/storage';
import { IconButton } from '@shared/ui/IconButton';
import { Logo } from '@shared/ui/Logo';
import { Modal } from '@shared/ui/Modal';
import { PlaceIcon } from '@shared/ui/PlaceIcon';
import { placeCount } from '../model/counts';
import { ActionPlaces } from './ActionPlaces';
import { Count } from './Count';
import { itemClass, PlaceLink } from './PlaceLink';
import { TagGroup } from './TagGroup';

export function Drawer() {
  const { messages } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <>
      <IconButton
        aria-label={messages.drawer.open}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <MenuIcon aria-hidden="true" />
      </IconButton>
      {open && <DrawerPanel onClose={() => setOpen(false)} />}
    </>
  );
}

function DrawerPanel({ onClose }: { onClose: () => void }) {
  const { messages } = useI18n();
  const data = useData();
  const createProject = useCreateProject();
  const swipe = useDragDismiss('left', onClose, 80);
  const createReference = useCreateReference();
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [referencesOpen, setReferencesOpen] = useState(true);
  const area = useUiState((state) => state.area);
  const visible = (entity: { tagIds: string[]; projectId?: string | null }) =>
    isInArea(data, entity, area);
  const today = todayIso();
  const showAll = data.settings.counts === 'all';
  const countOf = (place: string) => {
    if (place === 'focus') return focusCount(data, today, visible);
    return showAll ? placeCount(data, place, today, visible) : 0;
  };
  const projects = liveProjects(data).filter(
    (project) => !project.completedAt && visible(project),
  );
  const references = liveReferences(data).filter(visible);
  const projectOrder = useReorder(
    projects.map((project) => project.id),
    commitProjectOrder,
  );
  const referenceOrder = useReorder(
    references.map((reference) => reference.id),
    commitReferenceOrder,
  );

  return (
    <Modal
      label={messages.drawer.label}
      onClose={onClose}
      closeLabel={messages.common.close}
    >
      <nav
        aria-label={messages.drawer.label}
        {...swipe.handlers}
        style={swipe.style}
        className="absolute inset-y-0 left-0 h-dvh w-[min(280px,calc(100%-56px))] overflow-y-auto rounded-r-[22px] bg-card pt-[calc(12px+env(safe-area-inset-top))] pb-[calc(16px+env(safe-area-inset-bottom))] shadow-[0_0_40px_rgba(0,0,0,.25)] touch-pan-y [scrollbar-width:none] motion-safe:animate-drawer-in"
      >
        <div className="flex items-center gap-2.5 pt-1.5 pr-2 pb-3.5 pl-6">
          <Logo className="size-[34px] flex-none fill-accent" />
          <span className="flex-1 text-[22px] leading-none font-bold tracking-[-0.03em]">
            Free<b className="text-focus-ring">Zen</b>
          </span>
          <Link
            to="/settings"
            onClick={onClose}
            aria-label={messages.places.settings.title}
            className="grid size-11 place-items-center rounded-xl text-muted"
          >
            <Settings className="size-6" aria-hidden="true" />
          </Link>
          <Link
            to="/search"
            onClick={onClose}
            aria-label={messages.places.search.title}
            className="grid size-11 place-items-center rounded-xl text-muted"
          >
            <Search className="size-6" aria-hidden="true" />
          </Link>
        </div>
        <Heading>{messages.drawer.capture}</Heading>
        <ul className="m-0 list-none p-0">
          <PlaceLink
            place="inbox"
            onNavigate={onClose}
            extra={<Count value={countOf('inbox')} />}
          />
        </ul>
        <Heading>{messages.drawer.actions}</Heading>
        <ActionPlaces countOf={countOf} onNavigate={onClose} />
        <Heading>{messages.drawer.more}</Heading>
        <Section
          title={messages.places.projects.title}
          to="/projects"
          open={projectsOpen}
          onToggle={() => setProjectsOpen(!projectsOpen)}
          onNavigate={onClose}
        >
          {projects.map((project) => (
            <li
              key={project.id}
              {...projectOrder.itemProps(project.id)}
              className="bg-card select-none [-webkit-touch-callout:none]"
            >
              <Link
                draggable={false}
                to="/project/$projectId"
                params={{ projectId: project.id }}
                onClick={onClose}
                className={`${itemClass} min-h-11 pl-7 text-base`}
              >
                <ProgressRing
                  progress={projectProgress(data, project)}
                  done={false}
                />
                <span className="truncate">
                  {project.name || messages.project.untitled}
                </span>
                {showAll && <Count value={openTaskCount(data, project.id)} />}
              </Link>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => {
                onClose();
                createProject();
              }}
              className={`${itemClass} min-h-11 pl-7 text-base text-muted`}
            >
              <Plus className="size-[22px]" aria-hidden="true" />
              {messages.drawer.newProject}
            </button>
          </li>
        </Section>
        {data.settings.showReference && (
          <Section
            title={messages.places.references.title}
            to="/references"
            open={referencesOpen}
            onToggle={() => setReferencesOpen(!referencesOpen)}
            onNavigate={onClose}
          >
            {references.map((reference) => (
              <li
                key={reference.id}
                {...referenceOrder.itemProps(reference.id)}
                className="bg-card select-none [-webkit-touch-callout:none]"
              >
                <Link
                  draggable={false}
                  to="/reference/$referenceId"
                  params={{ referenceId: reference.id }}
                  onClick={onClose}
                  className={`${itemClass} min-h-11 pl-7 text-base`}
                >
                  <PlaceIcon place="references" />
                  <span className="truncate">
                    {reference.name || messages.reference.untitled}
                  </span>
                </Link>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  createReference();
                }}
                className={`${itemClass} min-h-11 pl-7 text-base text-muted`}
              >
                <Plus className="size-[22px]" aria-hidden="true" />
                {messages.drawer.newReference}
              </button>
            </li>
          </Section>
        )}
        <TagGroup onPick={onClose} />
        <Heading>{messages.drawer.cleanup}</Heading>
        <ul className="m-0 list-none p-0">
          <PlaceLink
            place="logbook"
            onNavigate={onClose}
            extra={<Count value={countOf('logbook')} />}
          />
          <PlaceLink
            place="trash"
            onNavigate={onClose}
            extra={<Count value={countOf('trash')} />}
          />
        </ul>
      </nav>
    </Modal>
  );
}

function Heading({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 px-6 pt-5.5 pb-1.5 text-[13px] leading-none font-medium tracking-[.14em] text-muted uppercase">
      {children}
    </p>
  );
}

type SectionProps = {
  title: string;
  to: '/projects' | '/references';
  open: boolean;
  onToggle: () => void;
  onNavigate: () => void;
  children: ReactNode;
};

function Section({
  title,
  to,
  open,
  onToggle,
  onNavigate,
  children,
}: SectionProps) {
  return (
    <div>
      <div className="flex items-center has-aria-[current=page]:bg-glow">
        <Link
          to={to}
          onClick={onNavigate}
          className={`${itemClass} flex-1 aria-[current=page]:bg-transparent`}
        >
          {title}
        </Link>
        <button
          type="button"
          aria-expanded={open}
          aria-label={title}
          onClick={onToggle}
          className="grid min-h-12 w-14 flex-none cursor-pointer place-items-center text-muted"
        >
          <ChevronDown
            className={`size-5 motion-safe:transition-transform ${open ? '' : '-rotate-90'}`}
            aria-hidden="true"
          />
        </button>
      </div>
      {open && <ul className="m-0 list-none p-0">{children}</ul>}
    </div>
  );
}
