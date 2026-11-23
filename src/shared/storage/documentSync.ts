import * as Automerge from '@automerge/automerge/slim';
import type { Doc } from '@automerge/automerge/slim';

export function sameHeads<T>(left: Doc<T>, right: Doc<T>) {
  const heads = Automerge.getHeads(left);
  const other = Automerge.getHeads(right);
  return (
    heads.length === other.length && heads.every((head, i) => head === other[i])
  );
}

export function createDocumentSync<T>(storage: {
  current: () => Doc<T>;
  apply: (doc: Doc<T>) => void;
}) {
  let state = Automerge.initSyncState();
  let pending: Doc<T> | undefined;

  function documentWithPending(current: Doc<T>) {
    if (!pending) return current;
    if (sameHeads(pending, current)) return pending;
    const copy = Automerge.clone(pending, Automerge.getActorId(current));
    return Automerge.merge(copy, current);
  }

  function apply(current: Doc<T>, next: Doc<T>) {
    const changed = !sameHeads(current, next);
    let nextPending: Doc<T> | undefined;
    if (Automerge.getMissingDeps(next, []).length > 0) {
      nextPending = changed
        ? Automerge.clone(next, Automerge.getActorId(current))
        : next;
    }
    if (changed) storage.apply(next);
    pending = nextPending;
  }

  return {
    isConfirmed() {
      return !pending && Automerge.hasOurChanges(storage.current(), state);
    },
    generate() {
      if (pending) {
        const current = storage.current();
        if (!sameHeads(pending, current)) {
          apply(current, documentWithPending(current));
        }
      }
      const [next, message] = Automerge.generateSyncMessage(
        documentWithPending(storage.current()),
        state,
      );
      state = next;
      return message;
    },
    receive(message: Uint8Array) {
      const current = storage.current();
      const base = documentWithPending(current);
      const copy = Automerge.clone(base, Automerge.getActorId(current));
      const [next, nextState] = Automerge.receiveSyncMessage(
        copy,
        state,
        message,
      );
      apply(current, next);
      state = nextState;
    },
  };
}
