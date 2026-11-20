import { useRef, useState } from 'react';

export function useCreationDraft<T extends object>(
  kind: string,
  initial: T,
  enabled: boolean,
) {
  const key = `freezen:draft:${kind}`;
  const [draft, setDraft] = useState(() => {
    if (!enabled) return initial;
    try {
      const stored = sessionStorage.getItem(key);
      if (stored !== null) return JSON.parse(stored) as T;
    } catch (error) {
      console.error(error);
    }
    return initial;
  });
  const current = useRef(draft);

  function change(fields: Partial<T>) {
    const next = { ...current.current, ...fields };
    current.current = next;
    setDraft(next);
    try {
      sessionStorage.setItem(key, JSON.stringify(next));
    } catch (error) {
      console.error(error);
    }
  }

  function clear() {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.error(error);
    }
  }

  return { draft, change, clear };
}
