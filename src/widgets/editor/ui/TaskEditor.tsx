import { useNavigate } from '@tanstack/react-router';
import { ArrowRight, ChevronRight, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { CompleteTaskButton } from '@features/complete-task';
import {
  clearTaskDraft,
  isTaskDraftChanged,
  saveTaskDraft,
  updateTaskDraft,
} from '@features/create-task';
import { WaitingContactSheet } from '@features/manage-tags';
import { MoveSheet, TaskPlaceSheet } from '@features/move-tasks';
import { StarTaskButton } from '@features/star-task';
import { clearTasksFromTrash, trashTasks } from '@features/trash-tasks';
import { useI18n } from '@shared/i18n';
import { todayIso } from '@shared/lib';
import { useOverlay } from '@shared/model';
import {
  changeData,
  deleteTasks,
  findProject,
  moveTask,
  updateTask,
  useData,
} from '@shared/storage';
import type { Task } from '@shared/storage';
import {
  ActionBarButton,
  ActionBarSeparator,
  EditorSheet,
} from './EditorSheet';
import { Properties } from './Properties';
import { TaskPlaceRow } from './TaskPlaceRow';
import { TaskReminders } from './TaskReminders';
import type { ReminderSheet } from './TaskReminders';
import { taskMenu } from './taskMenu';
import { TitleBlock } from './TitleBlock';

export function TaskEditor({ task, isNew }: { task: Task; isNew: boolean }) {
  const { messages } = useI18n();
  const overlay = useOverlay();
  const navigate = useNavigate();
  const project = findProject(useData(), task.projectId);
  const [moving, setMoving] = useState(false);
  const [sheet, setSheet] = useState<ReminderSheet | null>(null);

  function change(fields: Partial<Task>) {
    if (isNew) updateTaskDraft({ kind: 'task', task: { ...task, ...fields } });
    else changeData((current) => updateTask(current, task.id, fields));
  }

  const draftChanged = isNew && isTaskDraftChanged({ kind: 'task', task });

  function discard(submitted: boolean) {
    if (submitted) changeData((current) => deleteTasks(current, [task.id]));
    clearTaskDraft();
  }

  function close() {
    if (!isNew && !task.title.trim()) change({ title: messages.task.untitled });
    if (isNew && !draftChanged) discard(false);
    overlay.close();
  }

  function remove() {
    if (isNew) close();
    else if (task.trashed)
      clearTasksFromTrash([task.id], messages, overlay.close);
    else trashTasks([task.id], messages, overlay.close);
  }

  function openProject(projectId: string) {
    void navigate({ to: '/project/$projectId', params: { projectId } });
  }

  return (
    <EditorSheet
      label={messages.editor.toDo}
      isNew={isNew}
      onClose={close}
      draftChanged={draftChanged}
      onDiscard={discard}
      onSave={() => {
        saveTaskDraft(
          { kind: 'task', task },
          {
            task: messages.task.untitled,
            item: messages.reference.itemUntitled,
          },
        );
        return () => {
          clearTaskDraft();
          overlay.close();
        };
      }}
      menu={isNew ? [] : taskMenu(task, messages, openProject)}
      actions={
        <>
          <ActionBarButton onClick={() => setMoving(true)}>
            <ArrowRight aria-hidden="true" />
            {messages.editor.move}
          </ActionBarButton>
          <ActionBarSeparator />
          <ActionBarButton onClick={remove}>
            <Trash2 aria-hidden="true" />
            {task.trashed ? messages.editor.delete : messages.editor.trash}
          </ActionBarButton>
        </>
      }
    >
      <TitleBlock
        key={task.id}
        mark={
          isNew ? (
            <span className="block size-11" />
          ) : (
            <CompleteTaskButton task={task} />
          )
        }
        end={
          isNew ? (
            <DraftStar task={task} onChange={change} />
          ) : (
            <StarTaskButton task={task} today={todayIso()} />
          )
        }
        title={task.title}
        note={task.note}
        history={task.noteHistory}
        placeholder={
          task.logged ? messages.task.completedAction : messages.task.untitled
        }
        autoFocus={isNew}
        onTitle={(title) => change({ title })}
        onNote={(note) => change({ note })}
      />
      <TaskPlaceRow task={task} onChange={change} />
      <Properties
        names={['tags', 'time', 'energy', 'due']}
        values={task}
        onChange={(values) => change(values)}
      />
      <TaskReminders
        task={task}
        sheet={sheet}
        onSheet={setSheet}
        onChange={change}
      />
      {project && !isNew && (
        <div className="flex justify-end px-4 pt-2">
          <button
            type="button"
            onClick={() => openProject(project.id)}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-2 text-[17px] font-medium text-muted"
          >
            {project.name || messages.project.untitled}
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </div>
      )}
      {moving &&
        (isNew ? (
          <TaskPlaceSheet
            waitingContactPicker={WaitingContactSheet}
            tasks={[task]}
            allowTrash={false}
            onSelect={(destination) => {
              change(moveTask(task, destination));
              setMoving(false);
            }}
            onClose={() => setMoving(false)}
          />
        ) : (
          <MoveSheet
            waitingContactPicker={WaitingContactSheet}
            taskIds={[task.id]}
            onClose={() => setMoving(false)}
          />
        ))}
    </EditorSheet>
  );
}

function DraftStar({
  task,
  onChange,
}: {
  task: Task;
  onChange: (fields: Partial<Task>) => void;
}) {
  const { messages } = useI18n();

  return (
    <button
      type="button"
      aria-pressed={task.starred}
      aria-label={
        task.starred ? messages.task.removeFromFocus : messages.task.addToFocus
      }
      onClick={() => onChange({ starred: !task.starred })}
      className="group grid size-11 cursor-pointer place-items-center rounded-xl text-muted aria-pressed:text-star"
    >
      <Star
        className="size-6 group-aria-pressed:fill-current"
        strokeWidth={1.8}
        aria-hidden="true"
      />
    </button>
  );
}
