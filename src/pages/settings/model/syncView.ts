export type SyncView = 'devices' | 'show-code' | 'enter-code';

export function parseSyncView(value: unknown): SyncView | undefined {
  if (value === 'devices' || value === 'show-code' || value === 'enter-code') {
    return value;
  }
}
