# Contributing to FreeZen

## Prerequisites

- Node.js 24 and pnpm 10.33.0. pnpm switches to the version in `packageManager` automatically.
- Rust stable, for `src-tauri/`.
- For Android: JDK 17, Android SDK platform 37, build-tools 37.0.0, and NDK 30.0.16248370 with `NDK_HOME` set.

```sh
pnpm install
pnpm dev          # web app at http://localhost:1420
pnpm android:dev  # Android app via Tauri
```

## Checks

| Command             | What it does                                     |
| ------------------- | ------------------------------------------------ |
| `pnpm typecheck`    | TypeScript type check                            |
| `pnpm lint`         | ESLint, Rust comment check, and Clippy           |
| `pnpm steiger`      | Feature-Sliced Design structure check            |
| `pnpm format:check` | Prettier and rustfmt check (`pnpm format` fixes) |
| `pnpm react:doctor` | React code health check                          |
| `pnpm test`         | Vitest unit tests                                |
| `pnpm test:rust`    | Rust unit tests                                  |
| `pnpm e2e`          | Browser E2E scenarios                            |
| `pnpm e2e:android`  | Android E2E scenarios on an emulator             |

Husky hooks run these for you:

- `pre-commit` formats staged files.
- `commit-msg` lints the commit message with commitlint.
- `pre-push` runs typecheck, lint, steiger, format check, and React Doctor, and blocks the push if any of them fail.

## Workflow

1. Branch from `main` as `<type>/<short-description>`, for example `feat/task-list` or `ci/apk-release`.
2. Commit following the [commit rules](#commits).
3. Open a pull request against `main`. Do not push to `main` directly.
4. Get CI green: `Quality` (Frontend, Rust, Browser E2E) and `PR Title`.
5. Squash-merge.

### Commits

We follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/) with project constraints ([ADR-0001](docs/adr/0001-conventional-commits.md)):

- Write a single line of at most 72 characters: `type(scope): description`.
- Do not add a body or footers, including `Co-Authored-By` trailers.
- Mark breaking changes with `!` (`feat!: ...`) and explain them in the description.

The rules live in `commitlint.config.cjs`.

### Pull request titles

PRs are squash-merged, so the PR title becomes the commit on `main`. It must follow the same commit rules. The `PR Title` workflow checks it with commitlint.

- You can rename a PR at any time before merging. The check reruns on edit.
- In the squash-merge dialog, keep the PR title as the commit message and leave the description empty. The check cannot see edits made there.

## Code conventions

Architecture and conventions are recorded as ADRs in [`docs/adr/`](docs/adr/). Read them before making structural changes. Key points:

- Use Tauri 2 for native targets and keep the web frontend independent of Tauri through platform adapters in `src/shared/platform/` ([ADR-0002](docs/adr/0002-tauri.md)).
- Organize the frontend with Feature-Sliced Design under `src/`, using the aliases `@app`, `@pages`, `@widgets`, `@features`, `@entities`, and `@shared` ([ADR-0004](docs/adr/0004-structure.md)).
- Do not write comments in code. Express intent through names and structure ([ADR-0005](docs/adr/0005-code-quality.md)).
- Keep tests in their places: Vitest and `cargo test` for unit tests, Gherkin E2E scenarios in `e2e/@<area>/` ([ADR-0006](docs/adr/0006-tests.md)).
- Ship every user-facing string in English and Russian ([ADR-0007](docs/adr/0007-i18n.md)).
- Style with Tailwind CSS 4 and define shared animations in `src/app/styles/animations.css` ([ADR-0008](docs/adr/0008-tailwind.md), [ADR-0009](docs/adr/0009-animations.md)).

### Architecture decisions

Record new decisions as a new ADR: `docs/adr/NNNN-title.md`. Do not rewrite accepted ADRs. To retire one, append a `withdrawn` entry with its date ([ADR-0000](docs/adr/0000-adr.md)).
