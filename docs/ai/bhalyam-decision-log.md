# BHALYAM Architectural Decision Log (ADRs)

> **Document Type:** Institutional Architecture Memory & Decision History  
> **Purpose:** Preserve the context, trade-offs, and rationale behind foundational system decisions so future contributors and AI agents never reverse load-bearing designs.

---

## ADR 001: In-Memory `RoomManager` Over External Cache (Redis)
- **Status:** Accepted (2026)
- **Context:** Multiplayer room lifecycle requires microsecond turn latency, timer ticking, and bot scheduling.
- **Decision:** Hold all active room instances in-memory within Node.js `RoomManager` singleton rather than using Redis or external caches.
- **Rationale:**
  - Game rounds last 3–15 minutes. In-memory data structures provide <1ms state access without network hops or serialization overhead.
  - Reconnection resilience is achieved via 90-second grace periods and HMAC `seatToken`s.
  - Radically simplifies deployment (zero external infrastructure requirements).

---

## ADR 002: Zustand Over Redux for Global Client State
- **Status:** Accepted (2026)
- **Context:** Client requires global state for room metadata, socket status, and active player data while avoiding boilerplates.
- **Decision:** Standardize on a single `useRoomStore` (Zustand) and `useAuthStore`.
- **Rationale:**
  - Zustand provides minimal boilerplate, atomic selectors, and zero context-provider nesting.
  - Allows fine-grained component subscriptions that prevent unnecessary re-renders across game boards.

---

## ADR 003: Mandatory Dual-Layout Architecture (§6) Over CSS Stretching
- **Status:** Accepted (2026)
- **Context:** Mobile gaming requires bottom sheets, touch-first card grouping, and portrait thumb zones; desktop requires wide boards, persistent chat rails, and keyboard shortcuts.
- **Decision:** Mandate `<Game>BoardMobile.tsx` and `<Game>BoardDesktop.tsx` for every game.
- **Rationale:**
  - Mobile viewports (320px–430px) and desktop viewports (1024px+) require distinct interaction models. Pure CSS media queries produce cramped mobile boards or barren desktop boards. Dedicated layout shells ensure optimal ergonomics per device tier.

---

## ADR 004: Cryptographic HMAC `seatToken`s for Seat Ownership
- **Status:** Accepted (2026)
- **Context:** Players occasionally drop connection, refresh tabs, or switch between Wi-Fi and mobile data.
- **Decision:** Issue a server-signed HMAC `seatToken` upon room join/create.
- **Rationale:**
  - Prevents seat spoofing where an attacker rejoins using a victim's `playerId`.
  - Enables instant, secure state restoration and hidden card retrieval upon reconnection without server-side database lookups.

---

## ADR 005: 100% Server-Authoritative Game Logic
- **Status:** Accepted (2026)
- **Context:** Multiplayer games are vulnerable to client-side memory inspection, manipulated dice rolls, and invalid card plays.
- **Decision:** The server is the sole authority for all game state transitions.
- **Rationale:**
  - Prevents cheating and desynchronization bugs entirely.
  - Enables effortless bot integration (`applyAutoMove`) using the exact same validation algorithms.

---

## ADR 006: Standardized Design Language System (DLS) Over Ad-Hoc Tailwind
- **Status:** Accepted (2026)
- **Context:** Ad-hoc styling caused visual drift between older retro screens and newer competitive features.
- **Decision:** Centralize all surfaces, buttons, cards, typography, and glowing auras in `client/src/design-system/dls/` and `premium/`.
- **Rationale:**
  - Enforces uniform dark gaming depth, radiant glowing auras, and guaranteed WCAG 2.1 AA accessibility across every screen.
