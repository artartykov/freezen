import { create } from 'zustand';
import { openDataSync } from '@shared/storage';
import {
  isDeviceIdentity,
  loadPairedDevices,
  localIdentity,
  peersKey,
  savePairedDevices,
} from './identity';
import type { DeviceIdentity, PairedDevice } from './identity';
import {
  createPairingCode,
  createSyncSecret,
  isSyncSecret,
  joinPairingRoom,
  joinSyncRoom,
  normalizePairingCode,
} from './transport';
import type { SyncConnection } from './transport';

type PairingStatus =
  | 'idle'
  | 'connecting'
  | 'waiting'
  | 'paired'
  | 'rejected'
  | 'invalid-code'
  | 'offline'
  | 'expired'
  | 'failed';

type VisibleDevice = DeviceIdentity & { online: boolean };
type Invitation = { code: string; expiresAt: number };
type SyncState = {
  devices: VisibleDevice[];
  invitation: Invitation | null;
  invitationError: 'offline' | 'failed' | 'expired' | null;
  request: { id: string; name: string } | null;
  pairing: PairingStatus;
};

type PairMessage =
  | { type: 'request'; identity: DeviceIdentity }
  | { type: 'waiting'; identity: DeviceIdentity }
  | { type: 'approve'; secret: string }
  | { type: 'accepted' }
  | { type: 'complete' }
  | { type: 'reject' }
  | { type: 'cancel' };

type ControlMessage =
  | { type: 'hello' | 'ready' | 'disconnect'; id: string }
  | { type: 'sync-check'; id: string; nonce: string }
  | { type: 'sync-checked'; id: string; nonce: string; fingerprint: string };
type GuestRequest = { peer: string; identity: DeviceIdentity };
type PairSession = {
  room: Promise<SyncConnection>;
  timeout: ReturnType<typeof setTimeout>;
  candidate?: GuestRequest;
  peer?: string;
  accepted?: (accepted: boolean) => void;
  secret?: string;
};
type DataLink = ReturnType<typeof openDataSync>;
type ActiveSync = {
  room: Promise<SyncConnection>;
  links: Map<string, DataLink>;
  ready: Set<string>;
};
type SyncCheck = {
  nonce: string;
  acknowledgements: Map<DataLink, string | null>;
  finish: (success: boolean) => void;
};

const invitationLifetime = 5 * 60_000;
const discoveryTimeout = 25_000;
const retryDelay = 5_000;

export const useSyncStore = create<SyncState>(() => ({
  devices: [],
  invitation: null,
  invitationError: null,
  request: null,
  pairing: 'idle',
}));

let identity: DeviceIdentity | undefined;
let devices: PairedDevice[] = [];
let host: PairSession | undefined;
let guest: PairSession | undefined;
let started = false;
let syncCheck: SyncCheck | undefined;

const active = new Map<string, ActiveSync>();
const retryTimers = new Map<string, ReturnType<typeof setTimeout>>();

function report(error: unknown) {
  console.error('Device sync', error);
}

function localDevice() {
  identity ??= localIdentity();
  return identity;
}

function publishDevices() {
  useSyncStore.setState({
    devices: devices.map(({ id, name, platform }) => ({
      id,
      name,
      platform,
      online: (active.get(id)?.links.size ?? 0) > 0,
    })),
  });
}

function parsePairMessage(value: unknown): PairMessage | undefined {
  if (!value || typeof value !== 'object') return;
  const message = value as {
    type?: unknown;
    identity?: unknown;
    secret?: unknown;
  };
  switch (message.type) {
    case 'request':
    case 'waiting':
      if (isDeviceIdentity(message.identity)) {
        return { type: message.type, identity: message.identity };
      }
      return;
    case 'approve':
      if (isSyncSecret(message.secret)) {
        return { type: 'approve', secret: message.secret };
      }
      return;
    case 'accepted':
    case 'complete':
    case 'reject':
    case 'cancel':
      return { type: message.type };
  }
}

function parseControlMessage(value: unknown): ControlMessage | undefined {
  if (!value || typeof value !== 'object') return;
  const { type, id, nonce, fingerprint } = value as Record<string, unknown>;
  if (typeof id !== 'string') return;
  if (type === 'hello' || type === 'ready' || type === 'disconnect') {
    return { type, id };
  }
  if (typeof nonce !== 'string' || nonce.length !== 36) return;
  if (type === 'sync-check') return { type, id, nonce };
  if (
    type === 'sync-checked' &&
    typeof fingerprint === 'string' &&
    /^[a-f0-9]{64}$/.test(fingerprint)
  ) {
    return { type, id, nonce, fingerprint };
  }
}

function closeRoom(room: Promise<SyncConnection>) {
  void room
    .then(
      (connection) => connection.close(),
      () => undefined,
    )
    .catch(report);
}

function closePairSession(session: PairSession) {
  clearTimeout(session.timeout);
  session.accepted?.(false);
  closeRoom(session.room);
}

async function sendPair(
  session: PairSession,
  peer: string,
  message: PairMessage,
) {
  await (await session.room).send(message, peer);
}

function stopDevice(id: string) {
  const timer = retryTimers.get(id);
  if (timer) clearTimeout(timer);
  retryTimers.delete(id);
  const connection = active.get(id);
  if (!connection) return;
  active.delete(id);
  for (const link of connection.links.values()) closeLink(link);
  closeRoom(connection.room);
}

function closeLink(link: DataLink | undefined) {
  if (!link) return;
  link.close();
  if (syncCheck?.acknowledgements.has(link)) syncCheck.finish(false);
}

function applyPairedDevices(next: PairedDevice[]) {
  for (const previous of devices) {
    if (
      !next.some(
        ({ id, secret }) => id === previous.id && secret === previous.secret,
      )
    ) {
      stopDevice(previous.id);
    }
  }
  devices = next;
  for (const device of devices) connectDevice(device);
  publishDevices();
}

function storeDevice(device: PairedDevice) {
  const next = [
    ...loadPairedDevices().filter(({ id }) => id !== device.id),
    device,
  ];
  savePairedDevices(next);
  applyPairedDevices(next);
}

function forgetDevice(id: string) {
  const next = loadPairedDevices().filter((device) => device.id !== id);
  savePairedDevices(next);
  devices = next;
  publishDevices();
}

function connectDevice(device: PairedDevice) {
  const { id, secret } = device;
  if (active.has(id) || retryTimers.has(id)) return;
  const connection: ActiveSync = {
    room: joinSyncRoom(secret, {
      onPeerJoin(peer) {
        sendControl(peer, 'hello');
      },
      onPeerLeave(peer) {
        connection.ready.delete(peer);
        closeLink(connection.links.get(peer));
        connection.links.delete(peer);
        publishDevices();
      },
      onMessage(value, peer) {
        const message = parseControlMessage(value);
        if (
          message?.id !== id ||
          active.get(id) !== connection ||
          !devices.some(
            (paired) => paired.id === id && paired.secret === secret,
          )
        )
          return;
        if (message.type === 'disconnect') {
          try {
            forgetDevice(id);
            stopDevice(id);
          } catch (error) {
            report(error);
          }
          return;
        }
        if (message.type === 'sync-check' || message.type === 'sync-checked') {
          void checkPeerSync(connection, peer, message).catch(report);
          return;
        }
        connection.ready.add(peer);
        if (message.type === 'hello') sendControl(peer, 'ready');
        if (connection.links.has(peer)) return;
        const link = openDataSync((data) => {
          void connection.room
            .then((room) => room.sendSync(data, peer))
            .catch(report);
        });
        connection.links.set(peer, link);
        publishDevices();
      },
      onSyncMessage(data, peer) {
        try {
          connection.links.get(peer)?.receive(data);
        } catch (error) {
          report(error);
        }
      },
      onError: report,
    }),
    links: new Map(),
    ready: new Set(),
  };
  active.set(id, connection);

  function sendControl(peer: string, type: 'hello' | 'ready') {
    void connection.room
      .then((room) => room.send({ type, id: localDevice().id }, peer))
      .catch(report);
  }

  void connection.room.catch((error: unknown) => {
    report(error);
    if (active.get(id) !== connection) return;
    stopDevice(id);
    publishDevices();
    retryTimers.set(
      id,
      setTimeout(() => {
        retryTimers.delete(id);
        connectDevice(device);
      }, retryDelay),
    );
  });
}

async function checkPeerSync(
  connection: ActiveSync,
  peer: string,
  message: Extract<ControlMessage, { type: 'sync-check' | 'sync-checked' }>,
) {
  const link = connection.links.get(peer);
  if (!link) return;
  if (message.type === 'sync-check') {
    link.flush();
    const fingerprint = await link.fingerprint();
    if (!fingerprint || connection.links.get(peer) !== link) return;
    await (
      await connection.room
    ).send(
      {
        type: 'sync-checked',
        id: localDevice().id,
        nonce: message.nonce,
        fingerprint,
      },
      peer,
    );
  } else {
    const check = syncCheck;
    if (
      !check ||
      check.nonce !== message.nonce ||
      !check.acknowledgements.has(link)
    )
      return;
    check.acknowledgements.set(link, message.fingerprint);
    const fingerprint = await link.fingerprint();
    if (
      syncCheck === check &&
      connection.links.get(peer) === link &&
      fingerprint !== null &&
      [...check.acknowledgements.values()].every(
        (value) => value === fingerprint,
      )
    ) {
      check.finish(true);
    }
  }
}

export function syncNow(): Promise<boolean> {
  if (syncCheck) return Promise.resolve(false);
  const targets = [...active.values()].flatMap((connection) =>
    [...connection.links].map(([peer, link]) => ({ connection, peer, link })),
  );
  if (!targets.length) return Promise.resolve(false);
  const nonce = crypto.randomUUID();
  const id = localDevice().id;
  return new Promise((resolve) => {
    function finish(success: boolean) {
      clearInterval(retry);
      clearTimeout(timeout);
      syncCheck = undefined;
      resolve(success);
    }

    function probe() {
      for (const { connection, peer, link } of targets) {
        link.flush();
        void connection.room
          .then((room) => room.send({ type: 'sync-check', id, nonce }, peer))
          .catch(report);
      }
    }

    const retry = setInterval(probe, 500);
    const timeout = setTimeout(() => finish(false), 10_000);
    syncCheck = {
      nonce,
      acknowledgements: new Map(targets.map(({ link }) => [link, null])),
      finish,
    };
    probe();
  });
}

export function startDeviceSync() {
  if (started) return;
  started = true;
  window.addEventListener('storage', (event) => {
    if (
      event.storageArea !== localStorage ||
      (event.key !== peersKey && event.key !== null)
    )
      return;
    refreshDevices();
  });
  refreshDevices();
}

function refreshDevices() {
  try {
    applyPairedDevices(loadPairedDevices());
  } catch (error) {
    report(error);
  }
}

export function startInvitation() {
  cancelInvitation();
  if (!navigator.onLine) {
    useSyncStore.setState({ invitationError: 'offline' });
    return;
  }
  try {
    const me = localDevice();
    const code = createPairingCode();
    const invitation = { code, expiresAt: Date.now() + invitationLifetime };
    const session: PairSession = {
      room: joinPairingRoom(code, {
        onPeerJoin() {},
        onPeerLeave(peer) {
          if (session.candidate?.peer !== peer) return;
          session.candidate = undefined;
          session.accepted?.(false);
          if (host === session) useSyncStore.setState({ request: null });
        },
        onMessage(value, peer) {
          if (host !== session) return;
          if (!session.accepted && Date.now() >= invitation.expiresAt) {
            expireInvitation();
            return;
          }
          const message = parsePairMessage(value);
          if (message?.type === 'request') {
            if (message.identity.id === me.id || session.candidate) return;
            session.candidate = { identity: message.identity, peer };
            void sendPair(session, peer, { type: 'waiting', identity: me })
              .then(() => {
                if (host !== session || session.candidate?.peer !== peer)
                  return;
                useSyncStore.setState({
                  request: { id: peer, name: message.identity.name },
                });
              })
              .catch(report);
          } else if (session.candidate?.peer === peer) {
            if (message?.type === 'cancel') {
              session.candidate = undefined;
              session.accepted?.(false);
              useSyncStore.setState({ request: null });
            } else if (message?.type === 'accepted') {
              session.accepted?.(true);
            }
          }
        },
        onSyncMessage() {},
        onError: report,
      }),
      timeout: setTimeout(expireInvitation, invitationLifetime),
    };
    host = session;
    useSyncStore.setState({ invitation });
    void session.room.catch((error: unknown) => {
      report(error);
      if (host !== session) return;
      cancelInvitation();
      useSyncStore.setState({ invitationError: 'failed' });
    });
  } catch (error) {
    report(error);
    useSyncStore.setState({ invitationError: 'failed' });
  }
}

function expireInvitation() {
  cancelInvitation();
  useSyncStore.setState({ invitationError: 'expired' });
}

export function cancelInvitation() {
  const session = host;
  host = undefined;
  useSyncStore.setState({
    invitation: null,
    invitationError: null,
    request: null,
  });
  if (!session) return;
  if (!session.candidate) {
    closePairSession(session);
    return;
  }
  void sendPair(session, session.candidate.peer, { type: 'reject' })
    .catch(report)
    .finally(() => closePairSession(session));
}

export function rejectPairing(id: string) {
  const session = host;
  if (session?.candidate?.peer !== id) return;
  session.candidate = undefined;
  session.accepted?.(false);
  useSyncStore.setState({ request: null });
  void sendPair(session, id, { type: 'reject' }).catch(report);
}

export async function approvePairing(id: string): Promise<boolean> {
  const session = host;
  if (session?.candidate?.peer !== id || session.accepted) return false;
  const invitation = useSyncStore.getState().invitation;
  if (!invitation || Date.now() >= invitation.expiresAt) {
    expireInvitation();
    return false;
  }
  const candidate = session.candidate;
  const secret = createSyncSecret();

  try {
    const acknowledgement = new Promise<boolean>((resolve) => {
      session.accepted = resolve;
      clearTimeout(session.timeout);
      session.timeout = setTimeout(() => resolve(false), discoveryTimeout);
    });
    await sendPair(session, id, { type: 'approve', secret });
    if (!(await acknowledgement) || host !== session) return false;

    storeDevice({ ...candidate.identity, secret });
    await sendPair(session, id, { type: 'complete' });
    host = undefined;
    useSyncStore.setState({ invitation: null, request: null });
    return true;
  } catch (error) {
    report(error);
    if (
      devices.some(
        (device) =>
          device.id === candidate.identity.id && device.secret === secret,
      )
    ) {
      try {
        forgetDevice(candidate.identity.id);
        stopDevice(candidate.identity.id);
      } catch (cleanupError) {
        report(cleanupError);
      }
    }
    return false;
  } finally {
    if (host === session) {
      cancelInvitation();
      useSyncStore.setState({ invitationError: 'failed' });
    } else {
      closePairSession(session);
    }
  }
}

function finishGuest(session: PairSession, pairing: PairingStatus) {
  if (guest !== session) return;
  guest = undefined;
  useSyncStore.setState({ pairing });
  closePairSession(session);
}

export function enterPairingCode(value: string) {
  cancelPairing();
  const code = normalizePairingCode(value);
  if (!code || !navigator.onLine) {
    useSyncStore.setState({ pairing: code ? 'offline' : 'invalid-code' });
    return;
  }

  try {
    const me = localDevice();
    let connectionFailed = false;
    const session: PairSession = {
      room: joinPairingRoom(code, {
        onPeerJoin(peer) {
          void sendPair(session, peer, { type: 'request', identity: me }).catch(
            report,
          );
        },
        onPeerLeave(peer) {
          if (session.peer === peer) finishGuest(session, 'expired');
        },
        onMessage(value, peer) {
          if (guest !== session) return;
          const message = parsePairMessage(value);
          if (message?.type === 'waiting' && !session.candidate) {
            if (message.identity.id === me.id) return;
            session.candidate = { identity: message.identity, peer };
            session.peer = peer;
            clearTimeout(session.timeout);
            session.timeout = setTimeout(
              () => finishGuest(session, 'expired'),
              invitationLifetime,
            );
            useSyncStore.setState({ pairing: 'waiting' });
          } else if (peer === session.peer) {
            if (message?.type === 'reject') finishGuest(session, 'rejected');
            else if (message?.type === 'approve' && !session.secret) {
              session.secret = message.secret;
              void sendPair(session, peer, { type: 'accepted' }).catch(
                (error: unknown) => {
                  report(error);
                  finishGuest(session, 'failed');
                },
              );
            } else if (
              message?.type === 'complete' &&
              session.candidate &&
              session.secret
            ) {
              try {
                storeDevice({
                  ...session.candidate.identity,
                  secret: session.secret,
                });
                finishGuest(session, 'paired');
              } catch (error) {
                report(error);
                finishGuest(session, 'failed');
              }
            }
          }
        },
        onSyncMessage() {},
        onError(error) {
          if (error === 'peer-connect-failed' || error === 'relay-failed') {
            connectionFailed = true;
          }
          report(error);
        },
      }),
      timeout: setTimeout(
        () =>
          finishGuest(
            session,
            !navigator.onLine
              ? 'offline'
              : connectionFailed
                ? 'failed'
                : 'invalid-code',
          ),
        discoveryTimeout,
      ),
    };
    guest = session;
    useSyncStore.setState({ pairing: 'connecting' });
    void session.room.catch((error: unknown) => {
      report(error);
      finishGuest(session, navigator.onLine ? 'failed' : 'offline');
    });
  } catch (error) {
    report(error);
    useSyncStore.setState({ pairing: 'failed' });
  }
}

export function cancelPairing() {
  const session = guest;
  if (!session) {
    useSyncStore.setState({ pairing: 'idle' });
    return;
  }
  guest = undefined;
  useSyncStore.setState({ pairing: 'idle' });
  if (!session.peer) {
    closePairSession(session);
    return;
  }
  void sendPair(session, session.peer, { type: 'cancel' })
    .catch(report)
    .finally(() => closePairSession(session));
}

export function disconnectDevice(id: string) {
  const connection = active.get(id);
  try {
    forgetDevice(id);
  } catch (error) {
    report(error);
    return;
  }
  for (const link of connection?.links.values() ?? []) link.close();
  connection?.links.clear();
  if (!connection?.ready.size) {
    stopDevice(id);
    return;
  }
  void connection.room
    .then((room) =>
      Promise.allSettled(
        [...connection.ready].map((peer) =>
          room.send({ type: 'disconnect', id: localDevice().id }, peer),
        ),
      ),
    )
    .catch(report)
    .finally(() => {
      if (active.get(id) === connection) stopDevice(id);
    });
}
