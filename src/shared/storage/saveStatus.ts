import { create } from 'zustand';

type SaveStatus =
  | { kind: 'saved' }
  | { kind: 'saving' }
  | { kind: 'failed'; retry: () => void };

export const useSaveStatus = create<SaveStatus>(() => ({ kind: 'saved' }));

export function waitForSave(signal: AbortSignal): Promise<boolean> {
  if (signal.aborted) return Promise.resolve(false);
  if (useSaveStatus.getState().kind === 'saved') return Promise.resolve(true);

  return new Promise((resolve) => {
    function finish() {
      unsubscribe();
      signal.removeEventListener('abort', finish);
      resolve(!signal.aborted);
    }

    const unsubscribe = useSaveStatus.subscribe((state) => {
      if (state.kind === 'saved') finish();
    });
    signal.addEventListener('abort', finish, { once: true });
  });
}
