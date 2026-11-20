import { useI18n } from '@shared/i18n';
import { useSaveStatus } from '@shared/storage';

export function SaveFeedback({
  className,
  savingClassName = className,
}: {
  className: string;
  savingClassName?: string;
}) {
  const {
    messages: { storage: m },
  } = useI18n();
  const status = useSaveStatus();
  if (status.kind === 'saved') return null;

  return (
    <aside
      data-save-feedback
      className={
        status.kind === 'saving'
          ? `${savingClassName} pointer-events-none animate-saving-notice`
          : className
      }
    >
      {status.kind === 'saving' ? (
        <p role="status" aria-label={m.saving}>
          {m.saving}
        </p>
      ) : (
        <>
          <p role="alert">{m.saveFailed}</p>
          <button
            type="button"
            className="cursor-pointer underline"
            onClick={status.retry}
          >
            {m.retry}
          </button>
        </>
      )}
    </aside>
  );
}
