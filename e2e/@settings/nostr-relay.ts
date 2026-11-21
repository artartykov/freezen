import { WebSocket, WebSocketServer } from 'ws';

type Subscription = { kinds?: number[]; '#x'?: string[] };
type NostrEvent = { id: string; kind: number; tags: string[][] };
type RelayMessage =
  | ['REQ', string, ...Subscription[]]
  | ['CLOSE', string]
  | ['EVENT', NostrEvent];

function matches(event: NostrEvent, filter: Subscription) {
  if (filter.kinds && !filter.kinds.includes(event.kind)) return false;
  const topics = filter['#x'];
  return (
    !topics ||
    event.tags.some(([key, value]) => key === 'x' && topics.includes(value))
  );
}

export async function startPairingRelay() {
  const server = new WebSocketServer({ host: '127.0.0.1', port: 0 });
  const subscriptions = new Map<WebSocket, Map<string, Subscription[]>>();

  server.on('connection', (socket) => {
    const active = new Map<string, Subscription[]>();
    subscriptions.set(socket, active);
    socket.on('close', () => subscriptions.delete(socket));
    socket.on('message', (wire) => {
      if (!Buffer.isBuffer(wire)) return;
      const message = JSON.parse(wire.toString('utf8')) as RelayMessage;

      switch (message[0]) {
        case 'REQ': {
          const [, id, ...filters] = message;
          active.set(id, filters);
          socket.send(JSON.stringify(['EOSE', id]));
          break;
        }
        case 'CLOSE': {
          active.delete(message[1]);
          break;
        }
        case 'EVENT': {
          const event = message[1];
          socket.send(JSON.stringify(['OK', event.id, true, '']));
          for (const [client, clientSubscriptions] of subscriptions) {
            if (client.readyState !== WebSocket.OPEN) continue;
            for (const [id, filters] of clientSubscriptions) {
              if (filters.some((filter) => matches(event, filter))) {
                client.send(JSON.stringify(['EVENT', id, event]));
              }
            }
          }
          break;
        }
      }
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Pairing relay has no TCP address');
  }
  return {
    url: `ws://127.0.0.1:${address.port}`,
    close() {
      for (const socket of server.clients) socket.terminate();
      return new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}
