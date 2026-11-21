import type { RoomErrorCode } from 'trystero';

const appId = 'freezen-sync-v1';
const pairingAlphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const relayUrls = [
  'wss://relay.ditto.pub',
  'wss://relay.nostr.net',
  'wss://relay.primal.net',
  'wss://relay.snort.social',
];
const encoder = new TextEncoder();
const maximumControlMessageBytes = 4096;

export type SyncConnection = {
  send(data: object, peerId: string): Promise<void>;
  sendSync(data: Uint8Array, peerId: string): Promise<void>;
  close(): Promise<void>;
};

export type SyncConnectionCallbacks = {
  onPeerJoin(peerId: string): void;
  onPeerLeave(peerId: string): void;
  onMessage(data: unknown, peerId: string): void;
  onSyncMessage?(data: Uint8Array, peerId: string): void;
  onError?(error: RoomErrorCode): void;
};

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}

export function createPairingCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const code = Array.from(bytes, (byte) => pairingAlphabet[byte & 31]).join('');
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export function normalizePairingCode(value: string) {
  const input = value.toUpperCase().replace(/\s/g, '');
  if (!/^[A-Z2-9]{4}-?[A-Z2-9]{4}$/.test(input)) return null;
  const code = input.replace('-', '');
  return Array.from(code).every((letter) => pairingAlphabet.includes(letter))
    ? code
    : null;
}

export function isSyncSecret(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

export function createSyncSecret() {
  return toHex(crypto.getRandomValues(new Uint8Array(32)));
}

type Credentials = { roomId: string; password: string };

async function pairingCredentials(code: string): Promise<Credentials> {
  const normalized = normalizePairingCode(code);
  if (!normalized) throw new Error('Invalid pairing code');
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(normalized),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const keyMaterial = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations: 600_000,
      salt: encoder.encode(`${appId}:invitation`),
    },
    key,
    512,
  );
  const bytes = new Uint8Array(keyMaterial);
  return {
    roomId: `pair-${toHex(bytes.subarray(0, 32))}`,
    password: toHex(bytes.subarray(32)),
  };
}

async function syncCredentials(secret: string): Promise<Credentials> {
  if (!isSyncSecret(secret)) throw new Error('Invalid sync secret');
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    'HKDF',
    false,
    ['deriveBits'],
  );
  const derive = async (purpose: 'room' | 'password') => {
    const bits = await crypto.subtle.deriveBits(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: encoder.encode(`${appId}:device`),
        info: encoder.encode(purpose),
      },
      key,
      256,
    );
    return toHex(new Uint8Array(bits));
  };
  const [roomKey, password] = await Promise.all([
    derive('room'),
    derive('password'),
  ]);
  return { roomId: `sync-${roomKey}`, password };
}

function parseControlMessage(data: unknown): unknown {
  if (typeof data !== 'string' || data.length > maximumControlMessageBytes) {
    return undefined;
  }
  try {
    return JSON.parse(data) as unknown;
  } catch {
    return undefined;
  }
}

async function joinTransport(
  { roomId, password }: Credentials,
  callbacks: SyncConnectionCallbacks,
  sync: boolean,
): Promise<SyncConnection> {
  const { joinRoom } = await import('trystero');
  const relayOverride = import.meta.env.VITE_SYNC_RELAY_URL as
    string | undefined;
  const room = joinRoom(
    {
      appId,
      password,
      identity: 'none',
      relayConfig: { urls: relayOverride ? [relayOverride] : relayUrls },
      ...(sync ? {} : { maxReceiveBytes: 32 * 1024 }),
    },
    roomId,
  );
  const control = room.makeAction<string>('fz-control');
  const document = sync ? room.makeAction<Uint8Array>('fz-doc') : null;
  const listeners = [
    room.onPeerJoin(({ peerId }) => callbacks.onPeerJoin(peerId)),
    room.onPeerLeave(({ peerId }) => callbacks.onPeerLeave(peerId)),
    room.onError(({ code }) => callbacks.onError?.(code)),
    control.onReceive(
      ({ byteLength }) => byteLength <= maximumControlMessageBytes,
    ),
    control.onMessage((data, { peerId }) => {
      const value = parseControlMessage(data);
      if (value !== undefined) callbacks.onMessage(value, peerId);
    }),
  ];
  if (document) {
    listeners.push(
      document.onMessage((data, { peerId }) => {
        if (data instanceof Uint8Array) callbacks.onSyncMessage?.(data, peerId);
      }),
    );
  }

  let closing: Promise<void> | undefined;
  return {
    async send(data, peerId) {
      if (closing || !Object.hasOwn(room.getPeers(), peerId)) {
        throw new Error('Sync peer is disconnected');
      }
      const payload = JSON.stringify(data);
      if (encoder.encode(payload).byteLength > maximumControlMessageBytes) {
        throw new Error('Sync control message is too large');
      }
      await control.send(payload, { target: peerId });
    },
    async sendSync(data, peerId) {
      if (!document || closing || !Object.hasOwn(room.getPeers(), peerId)) {
        throw new Error('Sync peer is disconnected');
      }
      await document.send(data, { target: peerId });
    },
    close() {
      if (!closing) {
        for (const remove of listeners) remove();
        closing = room.leave();
      }
      return closing;
    },
  };
}

export async function joinPairingRoom(
  code: string,
  callbacks: SyncConnectionCallbacks,
) {
  return joinTransport(await pairingCredentials(code), callbacks, false);
}

export async function joinSyncRoom(
  secret: string,
  callbacks: SyncConnectionCallbacks,
) {
  return joinTransport(await syncCredentials(secret), callbacks, true);
}
