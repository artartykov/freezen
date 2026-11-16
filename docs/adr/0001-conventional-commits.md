# ADR-0001: Conventional Commits

- accepted - 2026-11-16

## Context

We need a consistent commit format that supports future changelog and release automation.

## Decision

We use Conventional Commits 1.0.0 with the following project constraints:

- A single line, at most 72 characters; no body or footers.
- Breaking changes use `!` and are explained in the description.

Enforced locally by the Husky `commit-msg` hook using commitlint. Rules are defined in `commitlint.config.cjs`.
