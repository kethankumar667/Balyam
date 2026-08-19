# DESIGN SYSTEM WAVE 2 — Implementation Plan (working doc)

This file tracks the Wave 2 implementation effort. It is a working document, not a deliverable.

## Authoritative inputs (already read in full)

- DESIGN-SYSTEM-ARCHITECTURE.md
- DESIGN-SYSTEM-BASELINE.md + design-system-baseline.json
- BUTTON-CONSOLIDATION-REPORT.md
- MODAL-CONSOLIDATION-REPORT.md
- TOKEN-ADOPTION-REPORT.md
- TYPOGRAPHY-CONSISTENCY-REPORT.md
- ICON-CONSOLIDATION-REPORT.md

## Backlog — to implement (all low-risk, measurable, no gameplay impact)

### Priority 1 — Functional emoji → lucide-react (Bucket A, standalone icon-role glyphs)
Surface named in ICON-CONSOLIDATION-REPORT §4. Each file gains a lucide import (measurable: +consumer files; emoji count drops in chrome).

| File | Emoji site(s) | Lucide icon |
|---|---|---|
| components/VoicePanel.tsx | 🎙 heading, 🎙 connect-mic button | Mic (size 14) |
| components/room/CommunicationPanel.tsx | 💬 chat tab, 🎙 voice tab, 💬 mobile strip | MessageSquare, Mic |
| components/RoomCode.tsx | 📋 copy, 📷 QR | Copy, QrCode |
| components/RoomNameEditor.tsx | ✏️ "Name this table" (L63 only) | Pencil (size 14) |
| components/room/RoomHeader.tsx | 🚪 Leave | LogOut (size 14) |
| components/PlayerList.tsx | 👥 heading, 👥 footer, 👑 host, ✓ ready, 🎯 react | Users, Crown, Check, Target |
| components/room/ParticipantRow.tsx | 👑 host badge, 🤖 bot badge, ✓ ready | Crown, Bot, Check |
| components/room/ParticipantActionMenu.tsx | 🗑️ Remove | Trash2 |
| components/room/BotManagementDialog.tsx | 🤖 header | Bot (size 20) |
| components/room/RoomShareCard.tsx | 📋 copy, 📷 QR, 🔗 share, ✓ copied | Copy, QrCode, Link2, Check |

### Priority 2 — Token adoption (exact, value-neutral dark-mode swaps)
`dark:bg-[#131926]` → `dark:bg-[var(--surface-1)]` — verified `--surface-1: #131926` in the dark block of index.css.

| File | Occurrences |
|---|---|
| components/VoicePanel.tsx | 1 |
| components/room/CommunicationPanel.tsx | 2 |
| components/PlayerList.tsx | 1 |
| components/Chat.tsx | 3 |

## Backlog — rejected / deferred, with reasons

### Icons (deferred)
- InlineRoomRail.tsx (🎟️👥🎙️💬🙂📸) — file renders inside game board chrome (LudoBoard); game-board UI excluded.
- RoomNameEditor.tsx L79 (`✏️ {name}`) — pencil sits inline inside a Caveat script-font text run; SVG would alter baseline alignment.
- Chat.tsx "Say hi to the table! 👋" — embedded in a string (Bucket B, copy, not an icon slot).
- AudioSettings.tsx 🔇/🔊 — embedded in template-string labels (Bucket B).
- GameRoomSheet.tsx "🤖 AI opponents · 📵…", "⚡ Real-time match · 🤖…" — Bucket B copy.
- BhalyamResultModal.tsx 👑 — Bucket C decorative artwork, already documented as coincidental in TOKEN report.
- CoachHintButton.tsx (✏️👀👥) — data-driven hints map (Bucket C, prop type change required).
- CompactColorSelector.tsx ✓ — on a game-piece color swatch (game-adjacent control).
- BoardPreviewPill.tsx 👁 — single-site straggler; pending per-site verification for icon size in tiny pill.
- Room.tsx 🤖⚠👁 — page shell mixes room + game chrome; high risk to untangle.

### Tokens (deferred, per TOKEN-ADOPTION-REPORT §6 reasons)
- `dark:bg-[#182234]` (VoicePanel ×2, CommunicationPanel, PlayerList ×2, Chat) — matches `auth-field (dark)` which is `.auth-shell`-scoped; component does not render inside `.auth-shell` → var() would resolve to nothing.
- `dark:bg-[#1A2333]` (ParticipantActionMenu) — matches `auth-note-bg (dark)` also `.auth-shell`-scoped; unreachable.
- `border-[#E8D8BE]` (RoomCode L36) — matches `auth-card-edge`/`auth-field-edge`, `.auth-shell`-scoped; unreachable.
- `text-[#0F172A] dark:text-slate-100` (RoomHeader) — `ink.hi` dark value (#F8FAFC) ≠ current dark value (slate-100 #f1f5f9); not value-neutral.
- InlineRoomRail inline-style `#e2e8f0` / `#0f172a` — inline styles + game-embedded; dark flip would change rendering.

### Priority 3 — Shared component adoption
- No safe drop-in candidates identified. SkeletonLoader (1 consumer) vs 49 hand-rolled animate-pulse loaders vary in shape/skeleton content; forcing adoption risks visual change. EmptyStateIllustration icon prop is Bucket C (prop type change). Deferred with reasons.

### Priority 4 — Typography
- No safe candidates remain. All remaining sub-pixel sizes are inside the 11 game files (excluded). Integer off-scale sizes have no on-scale neighbor within 1px (Tailwind scale gaps 12→14→16). TYPOGRAPHY.* adoption rejected for colour-family conflict with token work (stone/zinc vs warm parchment). Deferred with reasons.

## Verification plan
- cd client && npm run typecheck
- cd client && npm test
- cd client && npm run build
- node scripts/design-audit/inventory.mjs (icon + emoji deltas)
- npm run design:tokens (token delta)

## Implementation progress (Wave 2)
All Priority 1 + Priority 2 edits applied across 11 files:

| File | Change |
|---|---|
| VoicePanel.tsx | Mic import; 🎙×2 → Mic; dark:bg-[#131926] → var(--surface-1) |
| room/CommunicationPanel.tsx | MessageSquare/Mic import; 💬×2, 🎙 → icons; dark:bg-[#131926] ×2 → var(--surface-1) |
| RoomCode.tsx | Copy/QrCode import; 📋, 📷 → icons |
| RoomNameEditor.tsx | Pencil import; ✏️ (unset state) → icon (named-state ✏️ deferred) |
| room/RoomHeader.tsx | LogOut import; 🚪 → icon |
| PlayerList.tsx | Users/Crown/Check/Target import; 👥×2, 👑, ✓, 🎯 → icons; dark:bg-[#131926] → var(--surface-1) |
| room/ParticipantRow.tsx | Crown/Bot/Check import; 👑, 🤖, ✓ → icons |
| room/ParticipantActionMenu.tsx | Trash2 import; 🗑️ → icon |
| room/BotManagementDialog.tsx | Bot import; 🤖 → icon |
| room/RoomShareCard.tsx | Ticket/QrCode/Camera/Copy/Link2/Check import; 🎟️, 📷, 📸, 📋, 🔗, ✓ → icons |
| Chat.tsx | MessageSquare import; 💬 → icon; dark:bg-[#131926] ×3 → var(--surface-1) |

Verification in progress: typecheck running.
