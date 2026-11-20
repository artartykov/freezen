import { create } from 'zustand';

const prefix = 'freezen:recovery:';

export type Recovery = {
  key: string;
  base: string | null;
  snapshot: string;
};

export const useRecovery = create<{
  entries: Recovery[];
  recover?: (entry: Recovery) => Promise<boolean>;
}>(() => ({ entries: [] }));

export function readRecoveries() {
  const entries: Recovery[] = [];
  try {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      const raw = localStorage.getItem(key);
      if (raw === null) continue;
      try {
        const value = JSON.parse(raw) as Partial<Recovery> | null;
        if (
          value &&
          (value.base === null || typeof value.base === 'string') &&
          typeof value.snapshot === 'string'
        )
          entries.push({ key, base: value.base, snapshot: value.snapshot });
      } catch (error) {
        console.error(error);
      }
    }
  } catch (error) {
    console.error(error);
  }
  return entries;
}

export function recoveryKey() {
  return prefix + crypto.randomUUID();
}

export function journalRecovery(entry: Recovery) {
  try {
    localStorage.setItem(
      entry.key,
      JSON.stringify({ base: entry.base, snapshot: entry.snapshot }),
    );
  } catch (error) {
    console.error(error);
  }
}

export function removeRecovery(entry: Recovery) {
  try {
    const raw = JSON.stringify({ base: entry.base, snapshot: entry.snapshot });
    if (localStorage.getItem(entry.key) === raw)
      localStorage.removeItem(entry.key);
  } catch (error) {
    console.error(error);
  }
}
