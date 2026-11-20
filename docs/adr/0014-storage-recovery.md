# ADR-0014: Storage recovery

- accepted - 2026-11-20

## Decision

This replaces the text save timing in [ADR-0010](./0010-data-storage.md).

Apply text edits immediately to the in-memory document. Keep the save queue
serialized and coalesce changes made during an active save. Journal the latest
unsaved document synchronously before scheduling the primary write, so a
reload can recover edits that never reached the primary store.

Compare the current primary document with the previously loaded or saved
document before replacing it. Keep rejected changes available for recovery.
Restore a journal only against its original base, and allow users to copy its
contents when the base has changed.

Keep in-progress creation drafts across same-tab navigation and reload.
Clear a draft after explicit discard or transfer to the document save queue.
