---
title: "Connect 4 — User Experience & Game Feel Specification"
status: "final"
version: "2.0.0"
date: "2026-09-21"
game: "connect4"
---

# Connect 4 — User Experience & Interaction Specification (`EXPERIENCE.md`)

## 1. Foundation & Ergonomics
- **Dual Form-Factor Architecture**:
  - **Desktop (>= 1024px)**: Cinematic 16:9 widescreen arena. Left HUD features match intelligence and live remaining token racks; Center features the elevated 3D tournament board on an authentic pedestal; Right features integrated live chat and spectator gallery.
  - **Mobile (< 768px)**: Portrait orientation with maximum board presence. Thumb-friendly drop zone covering the entire column width, safe-area notch compliance, floating player battle pods with countdown rings.
- **Accessibility Floor**:
  - Minimum 44x44px touch targets.
  - Complete keyboard navigation (`1`-`7` direct drop, `ArrowLeft`/`ArrowRight` column targeting, `Space`/`Enter` drop).
  - ARIA grid roles with live polite turn and win announcements.

---

## 2. Information Architecture & HUD Hierarchy

```
┌────────────────────────────────────────────────────────────────────────┐
│ TOP BAR: Exit Match | Room Code Chip | Theme Switcher | Audio | Help   │
├────────────────────────────────────────────────────────────────────────┤
│ BATTLE PODIUM 1 (P1 Avatar + Clock)      BATTLE PODIUM 2 (P2 Avatar)   │
│ [Token Rack: 18 Discs Left]              [Token Rack: 19 Discs Left]   │
├────────────────────────────────────────────────────────────────────────┤
│                       THREAT DETECTION BEACON                          │
│               "DOUBLE THREAT: Column 3 & 6 Open" (if active)           │
├────────────────────────────────────────────────────────────────────────┤
│                       3D TOURNAMENT APPARATUS                          │
│               [Floating Ghost Disc & Column Guide Rail]                │
│                     7 x 6 Depth-Beveled Grid                           │
│                      [Base Pedestal & Stand]                           │
├────────────────────────────────────────────────────────────────────────┤
│ EMOTE / REACTION BAR: 🔥 Fire | 🧠 Big Brain | 😱 Gasp | 👑 King       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Game Feel & Kinetic Juice
1. **The Drop Sensation**:
   - Dropping a chip initiates dynamic gravitational acceleration ($g = 9.8\text{ m/s}^2$).
   - Upon impact with the base slot or existing chips, the chip compresses vertically by 8% and bounces back up by 12px before settling.
   - For bottom-row impacts (Row 5), a subtle 1.5px board micro-shake fires along with a heavy acoustic thud.
2. **Acoustic Soundscapes by Theme**:
   - **Royal Parlour**: Rich acoustic hardwood clacks and ambient brass resonance.
   - **Cyber-Arcade**: High-frequency synthetic laser chirps and glass snap.
   - **Championship Lounge**: Heavy metallic coin clinks and solid vault thuds.
3. **Double-Threat Tactical Beacon**:
   - When a player achieves an open-ended 3-in-a-row (a winning fork), a subtle tactical warning pulse alerts both players, creating immediate dramatic tension.
4. **Victory Climax & Rematch Negotiation**:
   - Connecting 4 triggers an electric glowing laser across the winning line.
   - Non-winning pieces dim to 40% opacity.
   - Celebratory golden confetti bursts from the winning token positions.
   - Seamless rematch request loop with instant board reset.
