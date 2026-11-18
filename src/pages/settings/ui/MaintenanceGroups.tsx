import { useNavigate } from '@tanstack/react-router';
import { BookOpen, Info, ListPlus, Star, Trash2 } from 'lucide-react';
import { useI18n } from '@shared/i18n';
import { askConfirm, useUiState } from '@shared/model';
import {
  addTutorialProject,
  changeData,
  createProject,
  createTutorialData,
} from '@shared/storage';
import { Row, SettingsGroup } from './SettingsParts';

export function MaintenanceGroups({ onAbout }: { onAbout: () => void }) {
  const { locale, messages } = useI18n();
  const navigate = useNavigate();
  const m = messages.settings;

  return (
    <>
      <SettingsGroup title={m.support}>
        <Row icon={<BookOpen />} hue="bg-scheduled" title={m.quickGuide} />
        <Row
          icon={<ListPlus />}
          hue="bg-waiting"
          title={m.tutorial}
          onClick={() =>
            askConfirm({
              title: m.tutorial,
              text: m.tutorialText,
              confirm: messages.common.ok,
              onConfirm: () => {
                const project = createProject(messages.tutorial.project);
                changeData((data) =>
                  addTutorialProject(data, project, messages.tutorial.tasks),
                );
                void navigate({
                  to: '/project/$projectId',
                  params: { projectId: project.id },
                });
              },
            })
          }
        />
      </SettingsGroup>
      <SettingsGroup title={m.development}>
        <Row
          icon={<Trash2 />}
          hue="bg-danger"
          title={m.erase}
          onClick={() =>
            askConfirm({
              title: m.eraseTitle,
              text: m.eraseText,
              confirm: m.eraseConfirm,
              danger: true,
              onConfirm: () => {
                changeData(() => createTutorialData(messages.tutorial, locale));
                useUiState.getState().reset();
                void navigate({ to: '/', replace: true });
              },
            })
          }
        />
      </SettingsGroup>
      <SettingsGroup title="FreeZen">
        <Row
          icon={<Info />}
          hue="bg-someday"
          title={m.about}
          value={m.versionShort}
          onClick={onAbout}
        />
        <Row icon={<Star />} hue="bg-star" title={m.rate} value={m.rateHint} />
      </SettingsGroup>
    </>
  );
}
