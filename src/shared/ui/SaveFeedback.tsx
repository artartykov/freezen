import { useI18n } from '@shared/i18n';
import { useSaveStatus } from '@shared/storage';

export function SaveFeedback({ className }: { className: string }) {
  const { messages } = useI18n();
  const saving = useSaveStatus((status) => status.kind === 'saving');
  if (!saving) return null;

  return (
    <aside
      data-save-feedback
      className={`${className} pointer-events-none animate-saving-notice`}
    >
      <p role="status" aria-label={messages.storage.saving}>
        {messages.storage.saving}
      </p>
    </aside>
  );
}
