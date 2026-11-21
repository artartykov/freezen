# ADR-0016: Device Sync

- accepted - 2026-11-21

## Decision

- Use Trystero to exchange changes over encrypted WebRTC data channels between Android and browser clients.
- Sync in both directions while FreeZen is open on both devices.
- Pair devices with a short-lived, single-use QR code. Either device can display it.
- During pairing, copy data to the empty device if only one device has data. If both have data, ask for confirmation before merging.
