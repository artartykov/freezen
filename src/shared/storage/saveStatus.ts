import { create } from 'zustand';

type SaveStatus =
  | { kind: 'saved' }
  | { kind: 'saving' }
  | { kind: 'failed'; retry: () => void; snapshot: string }
  | { kind: 'conflict'; snapshot: string };

export const useSaveStatus = create<SaveStatus>(() => ({ kind: 'saved' }));
