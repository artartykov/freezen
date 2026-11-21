# ADR-0010: Data Storage

- accepted - 2026-11-18
- withdrawn - 2026-12-29

Superseded by [ADR-0015](./0015-automerge-storage.md).

## Decision

Onboarding, view options, the last visited page, etc. — anything that is safe to lose:

- Store with Zustand `persist` in `localStorage`.

Tasks, projects, references, tags, settings, etc. — anything the user would not want to lose:

- Store as one versioned JSON document.
- Platform adapters only load and save it:
  - Tauri: a file in the app data directory, written atomically.
  - Browser: one IndexedDB record.
- Keep the model, migrations, and queries in shared code.
- Save changes immediately, one save at a time, latest state wins.
- Save text fields on typing pause and on blur.
