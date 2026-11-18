export type AppData = Record<string, never>;

const currentVersion = 1;

export const defaultData: AppData = {};

export class UnsupportedDataError extends Error {
  constructor(reason: string) {
    super(`Unsupported FreeZen data: ${reason}`);
    this.name = 'UnsupportedDataError';
  }
}

export function parseData(raw: string | null): AppData {
  if (raw === null) return defaultData;

  let document: unknown;
  try {
    document = JSON.parse(raw);
  } catch {
    throw new UnsupportedDataError('invalid JSON');
  }

  if (typeof document !== 'object' || document === null) {
    throw new UnsupportedDataError('not an object');
  }

  const { version } = document as Record<string, unknown>;

  if (version !== currentVersion) {
    throw new UnsupportedDataError(`version ${String(version)}`);
  }

  return {};
}

export function serializeData(data: AppData) {
  return JSON.stringify({ ...data, version: currentVersion });
}
