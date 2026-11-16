# ADR-0004: Project Structure

- accepted - 2026-11-16

## Decision

- Use Feature-Sliced Design (FSD) for the frontend, with `src/` as the source root.
- Add layers and slices as needed.
- Validate the structure with Steiger through `pnpm steiger`.
- Use TypeScript path aliases for FSD layers: `@app`, `@pages`, `@widgets`, `@features`, `@entities`, and `@shared`.
