# ADR-0009: UI Animations

- accepted - 2026-11-18

## Decision

- Define shared animations in `src/app/styles/animations.css`, following [ADR-0008](./0008-tailwind.md).
- Inside `@theme`, place each `--animate-<name>` declaration directly above its `@keyframes`.
- Apply animations with Tailwind utilities and respect `prefers-reduced-motion`.
