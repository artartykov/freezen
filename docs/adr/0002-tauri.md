# ADR-0002: Tauri

- accepted - 2026-11-16

## Context

FreeZen is an Android-first app, with web, Windows, and Linux as future targets. We want to reuse the UI across these platforms.

## Decision

Use Tauri 2 for Android and future Windows and Linux apps. Android requirements drive initial implementation and validation.

Keep the web frontend independent of Tauri APIs through platform adapters so it can also run in a browser.
