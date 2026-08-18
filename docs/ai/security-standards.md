# BHALYAM Security & Hardening Standards

> **Threat Model:** Multiplayer Web Gaming Lounge • Realtime Socket.IO & REST APIs  
> **Core Principle:** *Never trust the client. Validate all inputs, sanitize all broadcasts, authenticate all seats cryptographically.*

---

## 1. Authentication & Seat Ownership

1. **Cryptographic Seat Tokens (`seatToken.ts`)**:
   - Every seat claimed in a room is signed with a server-side HMAC secret (`seatToken`).
   - The server verifies `seatToken` on every reconnection before restoring the player's seat and private hand state.
2. **Public vs Private State Isolation**:
   - Game engines must implement `getPublicState(state, forPlayerId)`.
   - Hidden information (other players' Rummy cards, Uno hands, Rock-Paper-Scissors secret moves) is filtered on the server and NEVER sent across the wire to opponents.

---

## 2. Input Validation & Broadcast Sanitization

1. **Closed-Set Validation for User Broadcasts**:
   - Anything a player submits that is re-broadcast to other players is a potential injection vector.
   - Avatars must pass through `sanitizeAvatar` to prevent directory traversal or remote image tracking.
   - Reactions and chat emojis must be validated against `ALLOWED_REACTIONS`.
2. **Payload Size & Rate Limiting**:
   - Restrict incoming Socket.IO payload sizes.
   - Rate-limit chat messages, room creation requests, and voice signaling packets to prevent DDoS or spam flooding.

---

## 3. Web & Client-Side Security Hygiene

1. **Zero Raw HTML Injection**:
   - `dangerouslySetInnerHTML` is strictly prohibited unless rendering static trusted SVG paths.
   - React's default text escaping must be utilized for all player display names, room codes, and chat messages.
2. **Storage Hygiene & Sensitive Data Redaction**:
   - Never store unencrypted passwords, access tokens, or recovery secrets in `localStorage`.
   - Client-side logging utilities (`logger`, `logConn`) must automatically redact sensitive keys (`password`, `accessToken`, `token`, `secret`).
3. **CORS & Origin Hardening**:
   - The Express + Socket.IO server must strictly enforce `CLIENT_ORIGIN` whitelist checks in production environments.
