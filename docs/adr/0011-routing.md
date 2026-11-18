# ADR-0011: Routing

- accepted - 2026-11-18

## Decision

- Use TanStack Router with browser history and file-based routes in `src/app/routes`.
- Route files only map paths and params to pages from `@pages`.
- Open overlays through search params, so the back button closes them.
- Open the last visited page on startup.
