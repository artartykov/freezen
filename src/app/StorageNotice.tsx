import { useRecovery, useSaveStatus } from '@shared/storage';
import type { Recovery } from '@shared/storage';
import { useState } from 'react';
import { useI18n } from '@shared/i18n';

export function RecoverySnapshot({
  label,
  snapshot,
}: {
  label: string;
  snapshot: string;
}) {
  return (
    <details>
      <summary className="cursor-pointer underline">{label}</summary>
      <textarea
        aria-label={label}
        className="mt-2 max-h-32 w-full rounded border border-line p-2 font-mono"
        readOnly
        value={snapshot}
        onFocus={(event) => event.currentTarget.select()}
      />
    </details>
  );
}

export function StorageNotice() {
  const { messages } = useI18n();
  const status = useSaveStatus();
  const { entries, recover } = useRecovery();
  const [recoveryFailed, setRecoveryFailed] = useState(false);
  const m = messages.storage;

  async function restore(entry: Recovery) {
    try {
      setRecoveryFailed(!(await recover?.(entry)));
    } catch {
      setRecoveryFailed(true);
    }
  }

  if (status.kind === 'saved' && entries.length === 0) return null;

  return (
    <aside
      className={`fixed inset-x-0 top-[env(safe-area-inset-top,0px)] z-[100] mx-auto max-w-md rounded-b-lg border border-line bg-surface p-3 shadow-lg ${status.kind === 'saving' ? 'pointer-events-none' : ''}`}
    >
      {status.kind === 'saving' ? (
        <p role="status" aria-label={m.saving}>
          {m.saving}
        </p>
      ) : status.kind !== 'saved' ? (
        <>
          <p role="alert">
            {status.kind === 'conflict' ? m.conflict : m.saveFailed}
          </p>
          {status.kind === 'failed' && (
            <button
              type="button"
              className="cursor-pointer underline"
              onClick={status.retry}
            >
              {m.retry}
            </button>
          )}
          <RecoverySnapshot label={m.recovery} snapshot={status.snapshot} />
        </>
      ) : (
        <details>
          <summary className="cursor-pointer">{m.recoveries}</summary>
          {entries.map((entry) => (
            <div key={entry.key} className="mt-2 border-t border-line pt-2">
              <button
                type="button"
                className="cursor-pointer underline"
                onClick={() => void restore(entry)}
              >
                {m.restore}
              </button>
              <RecoverySnapshot label={m.recovery} snapshot={entry.snapshot} />
            </div>
          ))}
          {recoveryFailed && <p role="alert">{m.restoreFailed}</p>}
        </details>
      )}
    </aside>
  );
}
