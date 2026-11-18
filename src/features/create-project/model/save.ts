import { addProject, changeData } from '@shared/storage';
import type { Project } from '@shared/storage';

export function saveNewProject(project: Project, untitled: string) {
  const saved = { ...project, name: project.name.trim() || untitled };
  changeData((data) => addProject(data, saved));
  return saved.id;
}
