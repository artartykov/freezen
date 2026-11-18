# Agent Guidelines

FreeZen is an Android-first GTD app built with Tauri 2, React, TypeScript, Vite, and Tailwind CSS 4. Read [CONTRIBUTING.md](CONTRIBUTING.md) for setup, scripts, and the full workflow. Read [`docs/adr/`](docs/adr/) for architecture decisions.

## Rules

- **Commits:** Write a single-line Conventional Commit of at most 72 characters. Do not add a body or footers, and do not add a `Co-Authored-By` trailer. The `commit-msg` hook rejects them.
- **PR titles:** PRs are squash-merged, so the title becomes the commit on `main`. It must be a valid commit header under the same rules. CI checks it in the `PR Title` workflow.
- **Branches:** Never commit to `main`. Branch as `<type>/<short-description>` and open a PR.
- **No code comments:** This applies to TypeScript and Rust. Scripts enforce it.
- **Structure:** Follow Feature-Sliced Design under `src/` with layer aliases (`@shared`, `@features`, ...). Validate with `pnpm steiger`.
- **Platform:** Never call Tauri APIs from UI code directly. Go through adapters in `src/shared/platform/` so the app keeps working in a browser.
- **i18n:** Add every user-facing string in both English and Russian.
- **ADRs:** Never edit an accepted ADR's decision. Add a new ADR, or append a `withdrawn` entry.
- **Package manager:** Use pnpm only.

## Before pushing

Run the checks that the `pre-push` hook and CI run:

```sh
pnpm typecheck && pnpm lint && pnpm steiger && pnpm format:check && pnpm react:doctor
pnpm test && pnpm e2e
```
