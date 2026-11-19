# ADR-0014: AI Task Capture

- accepted - 2026-11-19
- withdrawn - 2026-11-19

## Decision

- Android only. Hide the AI section on other platforms.
- Keep the key in Android Keystore and send provider requests from Rust, so the frontend never reads it.
- Recognize speech with the Android system recognizer, which streams text while the user speaks. Post processing is one model conversation that adds, updates and removes tasks with tools as the text grows; pausing does not end it.
- Show the formed tasks for review before saving them.
- If post processing fails, save the recognized text as a task in the Inbox.
