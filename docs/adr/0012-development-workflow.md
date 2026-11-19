# ADR-0012: Development Workflow

- accepted - 2026-11-19

## Decision

Use behavior-driven development (BDD) for behavior changes.

1. Before implementation, agree on examples as acceptance criteria and write or update Gherkin scenarios in `e2e/`.
2. Before fixing a bug, verify that its regression scenario fails for the expected reason.
3. Run affected scenarios in the browser and reference them in the PR. Tag key Android compatibility scenarios with `@android` ([ADR-0006](./0006-tests.md)).

For refactors, reuse existing scenarios and cover important gaps first.
