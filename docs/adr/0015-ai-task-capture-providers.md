# ADR-0015: AI Task Capture Providers

- accepted - 2026-11-19

## Context

Replaces [ADR-0014](./0014-ai-task-capture.md). The Android system recognizer was not accurate enough, and OpenRouter accepts audio only as whole files, so recognition lagged behind speech.

## Decision

- Android only. Hide the AI section on other platforms.
- Support OpenRouter and OpenAI as providers. Keep one key per provider in Android Keystore and send provider requests from Rust, so the frontend never reads a key.
- Offer three recognizers:
  - The Android system recognizer.
  - OpenAI `gpt-live-transcribe`, streamed over the Realtime WebSocket while the user speaks.
  - OpenAI `gpt-realtime-mini`, which hears the audio and forms the tasks itself with the same tools, so post processing is not used.
- Post processing is one model conversation that adds, updates and removes tasks with tools as the text grows; pausing does not end it. The model is chosen together with its provider.
- Show the formed tasks for review before saving them.
- If post processing fails, save the recognized text as a task in the Inbox.
