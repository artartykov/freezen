# Agent Guidelines

- At the start of a session, read all ADR files in [`docs/adr/`](docs/adr/) once, and follow their decisions.
- For TypeScript navigation and diagnostics, use `pnpm lsp-ts` first. Use `refs` for callers and references, `def` for definitions, `symbol` for symbol lookup, and `diag` for diagnostics in changed files. Use `rg` for literal text searches, or for symbol navigation if the LSP command fails or returns incomplete results.
- Prefer `pnpm lsp-rs` for Rust navigation and diagnostics.
- Never commit to `main`. Branch as `<type>/<short-description>`.
- PRs are squash-merged, so the PR title becomes the commit on `main`. It must follow the commit rules: `<type>: <short-description>`.
- Do not add `Co-Authored-By` or other trailers to commits.
