# ADR-0013: Agent Task Workflow

- accepted - 2026-11-19

## Decision

Track tasks in GitHub Issues. Before the first agent run, verify that the repository owner applied `needs-triage`. Keep one workflow label per approved open issue and replace it at each transition.

- `needs-triage` — The owner applies this label to admit an issue. Automation reapplies it when all blocking questions are answered.
- `needs-info` — The triage agent sets this label and posts all questions that block progress.
- `ready-for-agent` — The triage agent sets this label when the expected result is clear and verifiable and no questions remain.
- `in-progress` — The agent sets this label when it starts work on a `ready-for-agent` issue.

Use GitHub's `Closed` state for completed work. Close issues delivered through a pull request when it merges.
