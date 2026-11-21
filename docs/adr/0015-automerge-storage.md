# ADR-0015: Automerge Storage and Recovery

- accepted - 2026-12-29

## Decision

- Use Automerge to merge offline changes.
- Store onboarding, view options, and the last visited page with Zustand `persist` in `localStorage`.
- Store tasks, projects, references, tags, and settings in one schema-versioned Automerge document. Persist the binary document with its change history.
- Keep the model, migrations, and queries in shared code. Use platform adapters to store the binary document in Tauri's app data directory or in one IndexedDB record in the browser.
- Save local and synced changes immediately, with one write in flight and the latest document queued. Save text fields on typing pause and on blur.
- On Android, keep `data.automerge` and `data.backup.automerge` in the private app data directory. Refresh the backup from the validated main file on startup and after each save. Replace each file atomically, main file first.
- If the main file is missing or corrupt, restore it automatically from a validated backup. Preserve any corrupt original. If the main file uses a newer schema or neither existing file is usable, preserve the files and show a load error.
- When the binary store is absent, import the existing versioned JSON once. On Android, use `data.backup.json` if `data.json` is missing or corrupt. Preserve the JSON and show a load error if its main document uses a newer schema or neither existing JSON file is usable. Keep the source JSON and verify the binary save before completing migration. Initialize a new document only when both the binary store and legacy data are absent.
