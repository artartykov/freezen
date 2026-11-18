import { changeData, updateProject } from '@shared/storage';
import type { ProjectState } from '@shared/storage';

export function moveProjects(ids: string[], state: ProjectState) {
  changeData((data) =>
    ids.reduce((current, id) => updateProject(current, id, { state }), data),
  );
}
