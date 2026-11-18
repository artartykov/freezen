import { create } from 'zustand';

export type ConfirmRequest = {
  title: string;
  text?: string;
  confirm: string;
  cancel?: string;
  danger?: boolean;
  onConfirm: () => void;
};

export const useConfirm = create<{ request: ConfirmRequest | null }>(() => ({
  request: null,
}));

export function askConfirm(request: ConfirmRequest) {
  useConfirm.setState({ request });
}

export function closeConfirm() {
  useConfirm.setState({ request: null });
}
