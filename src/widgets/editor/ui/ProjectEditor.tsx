import { useNavigate } from '@tanstack/react-router';
import { ArrowRight, Bookmark, Share2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ProgressRing } from '@entities/project';
import { CompleteProjectButton } from '@features/complete-project';
import { saveNewProject } from '@features/create-project';
import { shareTasks } from '@features/import-export';
import {
  deleteProjectForever,
  MoveProjectsSheet,
  ProjectPlaceSheet,
  restoreProjectFromTrash,
} from '@features/move-projects';
import { StarProjectButton } from '@features/star-project';
import { useI18n } from '@shared/i18n';
import { isDraftChanged } from '@shared/lib';
import { askConfirm, useOverlay } from '@shared/model';
import {
  changeData,
  convertProjectToReference,
  getData,
  projectProgress,
  projectTasks,
  trashProject,
  updateProject,
  useData,
} from '@shared/storage';
import type { Project } from '@shared/storage';
import type { MenuEntry } from '@shared/ui/Menu';
import { PlaceIcon } from '@shared/ui/PlaceIcon';
import {
  ActionBarButton,
  ActionBarSeparator,
  EditorSheet,
  TrashedActions,
} from './EditorSheet';
import { Properties } from './Properties';
import { TitleBlock } from './TitleBlock';

export function ProjectEditor({
  project: initial,
  isNew,
}: {
  project: Project;
  isNew: boolean;
}) {
  const { messages } = useI18n();
  const overlay = useOverlay();
  const navigate = useNavigate();
  const data = useData();
  const [start] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [moving, setMoving] = useState(false);
  const project = isNew
    ? draft
    : (data.projects.find((candidate) => candidate.id === initial.id) ??
      initial);

  function change(fields: Partial<Project>) {
    if (isNew) setDraft({ ...draft, ...fields });
    else changeData((current) => updateProject(current, project.id, fields));
  }

  function save() {
    const projectId = saveNewProject(draft, messages.project.untitled);
    void navigate({
      to: '/project/$projectId',
      params: { projectId },
      replace: true,
    });
  }

  function close() {
    if (isNew && isDraftChanged(draft, start, 'name')) {
      askConfirm({
        title: messages.editor.discardTitle,
        confirm: messages.editor.discard,
        danger: true,
        onConfirm: overlay.close,
      });
      return;
    }
    overlay.close();
  }

  const menu: MenuEntry[] = isNew
    ? []
    : [
        ...(data.settings.showReference && !project.trashed
          ? [
              {
                label: messages.editor.convertToReference,
                icon: <Bookmark />,
                onSelect: () =>
                  askConfirm({
                    title: messages.editor.convertProjectTitle,
                    text: messages.editor.convertProjectText,
                    confirm: messages.editor.convertToReference,
                    onConfirm: () => {
                      const result = convertProjectToReference(
                        getData(),
                        project.id,
                      );
                      changeData(() => result.data);
                      if (result.referenceId) {
                        void navigate({
                          to: '/reference/$referenceId',
                          params: { referenceId: result.referenceId },
                          replace: true,
                        });
                      }
                    },
                  }),
              },
              'separator' as const,
            ]
          : []),
        {
          label: messages.editor.share,
          icon: <Share2 />,
          onSelect: () =>
            shareTasks(
              projectTasks(getData(), project.id)
                .filter((task) => !task.completedAt)
                .map((task) => task.title),
              project.name,
            ),
        },
      ];

  return (
    <EditorSheet
      label={messages.project.edit}
      isNew={isNew}
      onClose={close}
      onSave={save}
      menu={menu}
      actions={
        project.trashed ? (
          <TrashedActions
            onRestore={() => {
              restoreProjectFromTrash(project.id);
              overlay.close();
            }}
            onDelete={() =>
              deleteProjectForever(project.id, messages, overlay.close)
            }
          />
        ) : (
          <>
            <ActionBarButton onClick={() => setMoving(true)}>
              <ArrowRight aria-hidden="true" />
              {messages.editor.move}
            </ActionBarButton>
            <ActionBarSeparator />
            <ActionBarButton
              onClick={() => {
                if (isNew) {
                  close();
                  return;
                }
                askConfirm({
                  title: messages.editor.trashTitle,
                  text: messages.editor.trashProjectText,
                  confirm: messages.editor.trash,
                  danger: true,
                  onConfirm: () => {
                    void navigate({ to: '/focus', replace: true });
                    changeData((current) => trashProject(current, project.id));
                  },
                });
              }}
            >
              <Trash2 aria-hidden="true" />
              {messages.editor.trash}
            </ActionBarButton>
          </>
        )
      }
    >
      <TitleBlock
        key={project.id}
        mark={
          isNew || project.trashed ? (
            <span className="grid size-11 place-items-center">
              <ProgressRing
                progress={isNew ? 0 : projectProgress(data, project)}
                done={!!project.completedAt}
                className="size-[26px]"
              />
            </span>
          ) : (
            <CompleteProjectButton
              project={project}
              ringClassName="size-[26px]"
            />
          )
        }
        end={
          !isNew && !project.trashed && <StarProjectButton project={project} />
        }
        title={project.name}
        note={project.note}
        placeholder={messages.project.untitled}
        autoFocus={isNew}
        onTitle={(name) => change({ name })}
        onNote={(note) => change({ note })}
      />
      <div className="flex min-h-14 items-center border-t border-line pr-2">
        <span className="flex min-w-0 flex-1 items-center gap-3.5 pl-4 text-[17px] whitespace-nowrap">
          {messages.project.behavior}
        </span>
        <div
          role="radiogroup"
          aria-label={messages.project.behavior}
          className="mr-2 ml-1 flex overflow-hidden rounded-xl border-[1.5px] border-line"
        >
          {[false, true].map((sequential) => (
            <button
              key={String(sequential)}
              type="button"
              role="radio"
              aria-checked={project.sequential === sequential}
              onClick={() => change({ sequential })}
              className="min-h-11 cursor-pointer border-l-[1.5px] border-line px-2.5 text-sm font-medium first:border-l-0 aria-checked:bg-glow aria-checked:text-focus-ring"
            >
              {sequential
                ? messages.project.sequential
                : messages.project.parallel}
            </button>
          ))}
        </div>
      </div>
      <div className="flex min-h-14 items-center border-t border-line">
        <button
          type="button"
          disabled={project.trashed}
          onClick={() => setMoving(true)}
          className="flex min-h-14 flex-1 cursor-pointer items-center gap-4 pl-4 text-left text-lg disabled:cursor-default"
        >
          <PlaceIcon place={project.state} />
          {messages.places[project.state].title}
        </button>
      </div>
      <Properties
        names={['tags', 'due']}
        values={project}
        onChange={(values) => change(values)}
      />
      {moving &&
        (isNew ? (
          <ProjectPlaceSheet
            current={project.state}
            onSave={(state) => {
              change({ state });
              setMoving(false);
            }}
            onClose={() => setMoving(false)}
          />
        ) : (
          <MoveProjectsSheet
            projectIds={[project.id]}
            allowTrash={false}
            onClose={() => setMoving(false)}
          />
        ))}
    </EditorSheet>
  );
}
