import { useSearch } from '@tanstack/react-router';
import { useTaskDraft } from '@features/create-task';
import { decodeEditTarget } from '@shared/model';
import { createProject, createReference, useData } from '@shared/storage';
import { ItemEditor } from './ItemEditor';
import { ProjectEditor } from './ProjectEditor';
import { ReferenceEditor } from './ReferenceEditor';
import { TaskComposer } from './TaskComposer';
import { TaskEditor } from './TaskEditor';

export function Editor() {
  const { edit } = useSearch({ strict: false });
  const target = decodeEditTarget(edit);
  const data = useData();
  const draft = useTaskDraft((state) => state.draft);

  if (!target) return null;

  switch (target.kind) {
    case 'new-task':
      if (draft?.kind === 'task') return <TaskComposer task={draft.task} />;
      if (draft?.kind === 'item') return <ItemEditor item={draft.item} isNew />;
      return null;
    case 'new-project':
      return <ProjectEditor project={createProject()} isNew />;
    case 'new-reference':
      return <ReferenceEditor reference={createReference()} isNew />;
    case 'task': {
      const task = data.tasks.find((candidate) => candidate.id === target.id);
      return task ? <TaskEditor task={task} isNew={false} /> : null;
    }
    case 'project': {
      const project = data.projects.find(
        (candidate) => candidate.id === target.id,
      );
      return project ? <ProjectEditor project={project} isNew={false} /> : null;
    }
    case 'reference': {
      const reference = data.references.find(
        (candidate) => candidate.id === target.id,
      );
      return reference ? (
        <ReferenceEditor reference={reference} isNew={false} />
      ) : null;
    }
    case 'item': {
      const item = data.referenceItems.find(
        (candidate) => candidate.id === target.id,
      );
      return item ? <ItemEditor item={item} isNew={false} /> : null;
    }
  }
}
