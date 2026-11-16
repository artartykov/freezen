# ADR-0005: Linting, Formatting, and Comments

- accepted - 2026-11-16

## Decision

- Use ESLint for React and TypeScript checks, including type-aware rules.
- Use Prettier for formatting through `pnpm format`. Keep formatting rules out of ESLint.
- Run `pnpm format` through lint-staged in the Husky `pre-commit` hook to format staged files.
- Run `pnpm lint`, `pnpm steiger`, and `pnpm format:check` in the Husky `pre-push` hook. Block the push if any check fails.
- Do not write comments in code. Express intent through names and structure; keep explanations in documentation and tasks in the issue tracker.
