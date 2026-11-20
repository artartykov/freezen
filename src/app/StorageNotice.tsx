import { SaveFeedback } from '@shared/ui/SaveFeedback';

export function StorageNotice() {
  return (
    <div data-global-save-feedback>
      <SaveFeedback className="fixed inset-x-0 top-[env(safe-area-inset-top,0px)] z-[100] mx-auto max-w-md rounded-b-lg border border-line bg-surface p-3 shadow-lg" />
    </div>
  );
}
