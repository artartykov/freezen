# ADR-0016: Device Sync

- accepted - 2026-11-21

## Decision

- Use Trystero to exchange changes over encrypted WebRTC data channels between Android and browser clients.
- Sync in both directions while FreeZen is open on both devices.
- Pair devices with a short-lived, single-use eight-character alphanumeric code. Either device can show the code as text and as a QR code. Enter the code on the other device.
- Confirm pairing on the device that showed the code before exchanging data. After confirmation, populate an empty device from the other device or automatically merge their existing data.
