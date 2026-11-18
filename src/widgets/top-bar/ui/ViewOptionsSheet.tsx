import { useI18n } from '@shared/i18n';
import { useUiState } from '@shared/model';
import type { GroupMode } from '@shared/model';
import { OptionList } from '@shared/ui/OptionList';
import { Sheet, SheetBody, SheetHeader } from '@shared/ui/Sheet';
import { Switch } from '@shared/ui/Switch';

type ViewOptionsSheetProps = {
  page: string;
  modes: GroupMode[];
  defaultMode: GroupMode;
  sortList?: 'projects' | 'references';
  onClose: () => void;
};

function Heading({ children }: { children: string }) {
  return (
    <p className="mx-2 mt-6 mb-2 text-sm font-medium text-muted first:mt-2">
      {children}
    </p>
  );
}

export function ViewOptionsSheet({
  page,
  modes,
  defaultMode,
  sortList,
  onClose,
}: ViewOptionsSheetProps) {
  const { messages } = useI18n();
  const ui = useUiState();
  const sortTitle =
    sortList === 'references'
      ? messages.view.sortReferences
      : messages.view.sortProjects;

  return (
    <Sheet label={messages.topBar.viewOptions} onClose={onClose}>
      <SheetHeader
        title={messages.topBar.viewOptions}
        onBack={onClose}
        backLabel={messages.common.back}
      />
      <SheetBody>
        {sortList && (
          <>
            <Heading>{sortTitle}</Heading>
            <OptionList
              label={sortTitle}
              value={ui.sort[sortList]}
              onChange={(order) => ui.setSort(sortList, order)}
              options={[
                { value: 'alpha', label: messages.view.alphabetically },
                { value: 'manual', label: messages.view.manually },
              ]}
            />
          </>
        )}
        {modes.length > 0 && (
          <>
            <Heading>{messages.view.actions}</Heading>
            <OptionList
              label={messages.view.actions}
              value={ui.groupBy[page] ?? defaultMode}
              onChange={(mode) => ui.setGroupBy(page, mode)}
              options={modes.map((mode) => ({
                value: mode,
                label: messages.view[mode],
              }))}
            />
          </>
        )}
        <Heading>{messages.view.details}</Heading>
        <Switch
          label={messages.view.wrap}
          checked={ui.wrap}
          onChange={ui.setWrap}
        />
        <Switch
          label={messages.view.showNotes}
          checked={ui.showNotes}
          onChange={ui.setShowNotes}
        />
        <Switch
          label={messages.view.showTags}
          checked={ui.showTags}
          onChange={ui.setShowTags}
        />
        <Switch
          label={messages.view.showEffort}
          checked={ui.showEffort}
          onChange={ui.setShowEffort}
        />
      </SheetBody>
    </Sheet>
  );
}
