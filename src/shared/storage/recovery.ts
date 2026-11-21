const prefix = 'freezen:recovery:';

export type Recovery = {
  key: string;
  base: string | null;
  snapshot: string;
  format?: 'automerge';
};

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
          typeof value.snapshot === 'string' &&
          (value.format === undefined || value.format === 'automerge')
        )
          entries.push({
            key,
            base: value.base,
            snapshot: value.snapshot,
            format: value.format,
          });
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

function serializeEntry({ base, snapshot, format }: Recovery) {
  return JSON.stringify({ base, snapshot, format });
}

export function journalRecovery(entry: Recovery) {
  try {
    localStorage.setItem(entry.key, serializeEntry(entry));
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export function removeRecovery(entry: Recovery) {
  try {
    const raw = serializeEntry(entry);
    if (localStorage.getItem(entry.key) === raw)
      localStorage.removeItem(entry.key);
  } catch (error) {
    console.error(error);
  }
}
