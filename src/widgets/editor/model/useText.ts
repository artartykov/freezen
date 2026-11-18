import { useEffect, useRef, useState } from 'react';

export function useText(initial: string, commit: (value: string) => void) {
  const [value, setValue] = useState(initial);
  const pending = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const commitRef = useRef(commit);

  useEffect(() => {
    commitRef.current = commit;
  });

  useEffect(
    () => () => {
      clearTimeout(timer.current);
      if (pending.current !== null) commitRef.current(pending.current);
    },
    [],
  );

  function flush() {
    clearTimeout(timer.current);
    if (pending.current === null) return;
    const next = pending.current;
    pending.current = null;
    commitRef.current(next);
  }

  return {
    value,
    onChange(next: string) {
      setValue(next);
      pending.current = next;
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, 400);
    },
    onBlur: flush,
  };
}
