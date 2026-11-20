# Agent Guidelines

- At the start of a session, read all ADR files in [`docs/adr/`](docs/adr/) once, and follow their decisions.
- Prefer `node scripts/ts-query.mjs` for TypeScript navigation and diagnostics and `node scripts/rs-query.mjs` for Rust.
- Never commit to `main`. Branch as `<type>/<short-description>`.
- PRs are squash-merged, so the PR title becomes the commit on `main`. It must follow the commit rules: `<type>: <short-description>`.
- Do not add `Co-Authored-By` or other trailers to commits.
