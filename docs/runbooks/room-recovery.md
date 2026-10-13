# Room Recovery - Phase 1

Phase 1 covers authenticated refresh/reconnect and clear recovery failures. It does not add device handoff or a Player Safety Center. No SQL migration is required. Deploy the server before the client.

## Architecture

- **One join owner:** `Room` resolves authenticated credentials and owns the current join attempt. Recovery-banner Retry delegates to that owner rather than emitting a second join.
- **Seat token:** Issued privately in create/join ACKs, stored per room code in `mpg.seats`, and never broadcast. Route codes are normalized to uppercase.
- **Bounded recovery:** Each attempt has a 20-second timeout. Timeout or credential-resolution failure retains the saved seat for Retry. There is no automatic retry every 20 seconds.
- **Network return:** Disconnected/offline joins are not buffered. A connect event, or an online event with a connected socket and an un-emitted attempt, resumes recovery. Already-emitted joins are not duplicated by online events.
- **Fresh private state:** A successful join ACK must identify the expected room and accepted seat. Playing/finished rooms also require that ACK's recipient-specific game snapshot. Unlabelled broadcasts cannot unlock restoration; a lobby needs no game snapshot.
- **Stale callbacks:** Disconnect, route change, and unmount invalidate outstanding attempts. Old credential resolutions and ACKs cannot restore an abandoned attempt.
- **Server grace:** The existing server disconnect grace is 90 seconds in a multi-human lobby and 10 minutes during play or when the room has only one human, including solo-human lobbies. The server decides whether a seat is still reclaimable; the client timeout does not extend that grace.

## Deployment & Testing

Deploy the server first: the new client fails safely if a playing/finished room's join ACK lacks a private snapshot. The added ACK field is optional in shared types for older consumers.

### Test Commands
```bash
npm --prefix client test -- src/core/recovery src/lib/__tests__/socket.test.ts src/pages/__tests__/RoomFinalizationFlow.test.tsx src/components/room/__tests__/RoomNameEntryChamber.test.tsx src/features --pool=forks --maxWorkers=1 --minWorkers=1
npm --prefix server test -- src/admin/__tests__/adminSocketEnforcement.test.ts src/rooms/__tests__/reconnectSoloBots.test.ts src/games/ludo/__tests__/reconnect.test.ts
npm --prefix client run build
npm --prefix server run build
```

Local verification used Node 24 and a single fork worker. Production targets Node 22; that runtime still needs staging verification. Some default-worker runs exited without diagnostics, so the passing isolated fork run is the final client test evidence, not a claim that those exits were diagnosed.

### Manual Staging (Real Network)
1. Create/join a room; refresh a live hidden-information game and verify only the accepted seat's hand returns.
2. Take the client offline. Verify connection feedback appears, the old board is hidden, and attempted moves do not replay later.
3. Restore connectivity within the server grace window. Verify a single authenticated join restores the room and fresh private state.
4. Withhold the join ACK for 20 seconds. Verify the error offers Retry/Return to Lounge and Retry retains the saved seat.
5. Refresh an unavailable room as a guest whose name exists only on the saved seat. Verify the terminal error remains visible rather than silently offering a new seat.
6. Navigate away during recovery, then deliver a delayed ACK. Verify it cannot restore the abandoned room. Also test lowercase room links.

Synthetic browser checks exercised the real UI with mocked transport/API responses, including the 20-second timeout. They do not certify physical networks, live Supabase sessions, or production deployment. Complete those staging checks separately.

## Terminal Errors & Precedence

- A terminal join refusal clears the saved room session/seat and explains why the table cannot be restored.
- Guest name refusals retain the name-correction workflow rather than treating the table as unavailable.
- Missing private snapshots and incomplete ACKs fail safely without exposing stale game state.

## Socket Emissions

The singleton socket drops `game:move` before Socket.IO can buffer it when the socket is stale/disconnected, the browser is offline, or the room is not ready. Supplied action IDs are preserved; missing IDs are generated. Other event types retain their existing behavior.

Focus/visibility probes remain transport concerns, not independent room-join owners. Automatic transport recovery does not override an explicit server disconnect. Server authority and economy settlement are unchanged.

## Reliability Guarantees

Phase 1 does not add durable room storage or guarantee survival across a server process restart. Reclaim also depends on server authority, valid credentials, remaining seat grace, and the room still existing.
