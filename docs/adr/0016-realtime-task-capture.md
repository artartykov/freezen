# ADR-0016: Realtime Task Capture

- accepted - 2026-11-20

## Context

Replaces [ADR-0015](./0015-ai-task-capture-providers.md). Of the recognizers and post processing models we tried, the OpenAI realtime model that hears the audio and forms the tasks itself responded fastest, so the other paths were removed.

## Decision

- Android only. Hide the AI section on other platforms.
- Use OpenAI only. Keep the key in Android Keystore and send provider requests from Rust, so the frontend never reads it.
- Capture tasks with `gpt-realtime-2.1-mini` over one Realtime WebSocket session per capture. The app records the microphone and streams the audio; the model hears it and changes the task list with one batch tool after every pause in speech. Pausing stops the microphone and keeps the session, so resuming is immediate.
- Show the formed tasks for review before saving them.
- If the model fails, save the recognized text as a task in the Inbox.
