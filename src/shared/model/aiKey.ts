import { create } from 'zustand';

export const useAiKey = create<{ key: string }>(() => ({ key: '' }));

export function setAiKey(key: string) {
  useAiKey.setState({ key });
}
