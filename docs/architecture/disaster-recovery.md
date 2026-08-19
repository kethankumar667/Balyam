# BHALYAM Disaster Recovery Specification (RTO & RPO)

## 1. System Resilience Boundaries & Targets

| Target Metric | SLA Specification | Technical Rationale |
| :--- | :--- | :--- |
| **Recovery Time Objective (RTO)** | **< 15 seconds** | Time required for a newly booted server container to initialize Socket.IO, load word dictionaries, mount operational registries, and accept websocket traffic. |
| **Recovery Point Objective (RPO)** | **0 seconds (Accounts)**<br>**In-Flight Match (In-Memory)** | User accounts and profiles persist in Supabase (Postgres). In-memory active game rooms survive client disconnects for up to 90 seconds (grace period) via server-signed `seatToken`s. If the physical Node.js process crashes, active rooms reset with a fresh `BOOT_ID` notifying clients to start a clean match. |

---

## 2. Platform Disaster Recovery Matrix

```
┌─────────────────────────┬───────────────────────────┬─────────────────────────┬──────────────────────────┐
│ Component               │ Storage Tier              │ Failure Mode            │ Recovery Strategy        │
├─────────────────────────┼───────────────────────────┼─────────────────────────┼──────────────────────────┤
│ User Accounts & Profiles│ Supabase (Postgres)       │ Node process restart    │ Persistent DB session    │
│ Active Multiplayer Room │ In-Memory (RoomManager)   │ WiFi/Mobile network drop│ 90s seatToken reconnect  │
│ Server Domain Timeline  │ ServerEventStore          │ Process crash           │ Local event store re-init│
│ Voice Mesh WebRTC       │ P2P Peer Mesh             │ Signalling drop         │ Auto ICE renegotiate     │
│ Operational Metrics     │ MetricsRegistry (RingBuf) │ Process reboot          │ Fresh metric baseline    │
└─────────────────────────┴───────────────────────────┴─────────────────────────┴──────────────────────────┘
```

---

## 3. Disconnect vs Process Restart Behavior

1. **Client Disconnect / WiFi Switch (Network partition)**:
   - Server marks seat as `awayUntil = Date.now() + 90_000`.
   - `RoomLifecycleState` transitions from `IN_PROGRESS` to `RECOVERING`.
   - Auto-play takeover arms after 2 unplayed turns to prevent stalling.
   - When client reconnects, it supplies `(playerId, seatToken)`.
   - Server verifies cryptographic HMAC signature (`seatToken`), reclaims seat, restores hand/board state, transitions room to `IN_PROGRESS`.
2. **Server Process Restart (Crash / Redeploy)**:
   - Process generates new `BOOT_ID`.
   - On reconnect, clients compare `BOOT_ID`. If mismatched, client knows prior in-memory match was dropped, purges stale local seat tokens, and prompts clean lobby navigation without freezing.
