# Architectural Decision Log: TV Spectator Stadium

This log documents key design, technical, and UX decisions made for the Bhalyam TV Spectator Stadium (`/tv/:code`).

---

## ADR-01: Dedicated 3D Live Stages vs Small Static Board Embeds

- **Context**: In earlier versions, TV mode rendered miniature static boards (e.g. standard 2D Ludo SVGs) that felt cramped, passive, and illegible from a 10-foot viewing distance.
- **Decision**: Replace miniature boards with full-screen, high-energy 3D live stages:
  - Ludo and Snakes & Ladders feature dynamic 3D rolling dice in the center stage.
  - UNO features stacked 3D decks with live discard card faces and reactive color rings.
  - Hand Cricket features an ESPN/Star Sports broadcast stage with batting/bowling split cards and 3D fireworks.
- **Consequences**: Dramatically elevates spectator excitement and clarity from across the room. Satisfies the core product tenet: "Zero Sleepy Screens."

---

## ADR-02: Zero-Leak Spectator Telemetry (Protecting Secret Hands)

- **Context**: Several Bhalyam games (Rummy, UNO, Word Building) involve hidden information. If the TV screen displays private player cards, players looking at the TV will have their strategy compromised.
- **Decision**: TV mode consumes public room state (`RoomPublicState`) and only renders public game telemetry:
  - Discard piles, draw deck counters, and play actions are public.
  - In-hand cards (e.g. 13 cards in Rummy, player hands in UNO) are strictly suppressed on the spectator screen.
  - Visual flair (e.g. `RummyDeclareFlourish`, `UnoActionToast`) alerts the room when plays are made without spoiling unplayed hands.
- **Consequences**: Competitive integrity is preserved. Players can keep their eyes on the TV without fearing peeking.

---

## ADR-03: Dynamic Adaptive Grid for Player Chips (Eliminating Player Cutoff)

- **Context**: When rooms expanded to 4, 6, or 8 players, player cards rendered in fixed rows or long flex containers, causing bottom chips to clip or scroll off-screen on fixed 1080p TV displays.
- **Decision**: Implement an adaptive CSS grid (`grid-cols-2`, `grid-cols-3`, `grid-cols-4`) based on `players.length`:
  - 2–4 players: Spacious 2-column or 4-column cards with large avatars.
  - 5–8 players: Compact 4-column cards that guarantee all players fit comfortably above the fold without any vertical scrolling.
- **Consequences**: Eliminates player cutoff entirely across all party sizes. Verified in happy-dom test suite.

---

## ADR-04: Host Skin Auto-Sync with Local Spectator Override

- **Context**: In games like Hand Cricket, hosts can configure distinct visual themes (Broadcast, Cricbuzz, Rerun, Classic). Spectators in the room may want to see the match in the host's selected style, or switch locally depending on preference.
- **Decision**: Implement a two-tier theme synchronization system:
  1. The TV listens to the host's theme (`gameState.skin` or `gameState.theme`) and updates the TV screen whenever the match begins or the host switches skins.
  2. A local 4-button mode toggler allows TV spectators to override the theme on the TV screen without affecting the players' mobile devices.
- **Consequences**: Provides total aesthetic consistency out of the box while empowering the lounge coordinator to customize the big-screen look.

---

## ADR-05: Strict Platform Iconography Compliance (No `Sparkles`)

- **Context**: Repository governance (`AGENTS.md`) strictly prohibits the use of `Sparkles` from `lucide-react`.
- **Decision**: All TV animations, celebration banners, and status badges exclusively use approved gaming iconography:
  - Victory / Podiums: `Crown`, `Trophy`, `Award`, `Star`
  - High Energy / Power: `Flame`, `Zap`, `Swords`
  - Warning / Urgency: `ShieldAlert`, `Radio`
- **Consequences**: Total compliance with repository rules and zero bundle pollution from disallowed icons.

---

## ADR-06: GPU Hardware Acceleration & Memory Management on Smart TV Browsers

- **Context**: Smart TV browsers (webOS, Tizen) have limited CPU horsepower and can easily drop frames or crash if particle systems leak memory over hours-long game sessions.
- **Decision**:
  - All burst overlays use CSS GPU-accelerated transforms (`translate3d`, `scale3d`, `opacity`).
  - Overlay components automatically self-terminate using clean `setTimeout` triggers (2500–3500ms) with unmount cleanup handlers.
  - Canvas particles are scoped to momentary bursts rather than indefinite animation loops.
- **Consequences**: TV screens run smoothly at 60 FPS without memory bloat even after dozens of consecutive games.

---

## ADR-07: Real-Time Phone-to-TV Crowd Interaction (Emotes, Throwables, and Soundboard)

- **Context**: Couch spectators wanted to interact with the TV directly from their phones rather than passively watching.
- **Decision**: Wire `room:reaction` and `room:sound` into the TV screen. When players send throwables (`🍅` tomato, `🩴` chappal, `🧨` cracker) or sound clips (Airhorn, Dhol, Ta-da), the TV screen renders physical parabolic trajectories with splatter FX, plays high-fidelity audio through the TV speakers, and triggers dynamic screen shakes.
- **Consequences**: Transforms passive TV watching into an interactive living-room party game show.

---

## ADR-08: Momentum Tug-of-War Engine & Post-Match Superlatives

- **Context**: Spectators needed instant visual clarity on who has the match advantage, and wanted post-game celebration beyond just announcing the 1st place winner.
- **Decision**:
  - Implement `TvMomentumBar`: renders dynamic Required Run Rate (RRR) needles, territory dominance bars (Dots & Boxes), and Home race trackers (Ludo).
  - Implement Superlative Accolade Cards on the Victory Podium (The Sniper, Speed Demon, Iron Shield, Heartbreak).
- **Consequences**: Sparks friendly couch rivalry and enriches the emotional payoff of every match.

