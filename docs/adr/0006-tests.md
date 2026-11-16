# ADR-0006: Tests

- accepted - 2026-11-16

## Decision

- Use Vitest for TypeScript unit tests and `cargo test` for Rust unit tests.
- Write E2E scenarios in Gherkin:
  - `pnpm e2e` runs browser scenarios, including those tagged `@android`.
  - `pnpm e2e:android` runs a short compatibility suite on an Android SDK emulator, selecting features or scenarios tagged `@android`.
  - Both suites exclude scenarios tagged `@todo`.
- Group E2E files by area in `e2e/@<area>/`:
  - Store scenarios in `*.feature` files.
  - Keep browser steps in `*.steps.ts` and Android steps in `*.android-steps.ts` next to their feature files.
  - Store steps shared across areas in `e2e/common.steps.ts` and `e2e/common.android-steps.ts`.

Example structure:

```text
e2e/
  @onboarding/
    goes-through-onboarding.feature
    goes-through-onboarding.steps.ts
    goes-through-onboarding.android-steps.ts
  @tasks/
    creates-task.feature
    creates-task.steps.ts
  common.steps.ts
  common.android-steps.ts
```
