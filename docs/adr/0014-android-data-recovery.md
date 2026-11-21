# ADR-0014: Android Data Recovery

- accepted - 2026-11-20
- withdrawn - 2026-12-29

Superseded by [ADR-0015](./0015-automerge-storage.md).

## Decision

- Keep `data.backup.json` beside `data.json` in Android's private app data directory. Refresh it from a validated main file on startup and after each save. Replace both files atomically, main file first.
- If the main file is missing or corrupt, restore it automatically from a validated backup without requiring user attention or action. Preserve any corrupt original.
- If the main file uses a newer document version or neither file is usable, preserve both files and show a load error. Initialize a new document only when both files are absent.
