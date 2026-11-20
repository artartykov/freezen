import { addProject, changeData, updateProject } from '@shared/storage';
import type { Project } from '@shared/storage';

export function saveNewProject(project: Project, untitled: string) {
  const saved = { ...project, name: project.name.trim() || untitled };
  changeData((data) => {
    const existing = data.projects.find((entry) => entry.id === saved.id);
    return existing
      ? updateProject(data, saved.id, {
          ...saved,
          noteHistory: existing.noteHistory,
        })
      : addProject(data, saved);
  });
  return saved.id;
}
