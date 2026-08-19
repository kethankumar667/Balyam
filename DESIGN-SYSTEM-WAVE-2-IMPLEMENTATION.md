# DESIGN SYSTEM WAVE 2 — Implementation Report

Wave 2 continues the design-system hardening initiative from the 4 completed
phases. This report is **implementation-only**: it activates the remaining
low-risk debt identified in the already-validated reports
(`ICON-CONSOLIDATION-REPORT.md`, `TOKEN-ADOPTION-REPORT.md`,
`TYPOGRAPHY-CONSISTENCY-REPORT.md`, `BUTTON-CONSOLIDATION-REPORT.md`,
`MODAL-CONSOLIDATION-REPORT.md`, `DESIGN-SYSTEM-ARCHITECTURE.md`,
`DESIGN-SYSTEM-BASELINE.md`, `design-system-baseline.json`). No baseline is
re-created, no measurement formula is redefined, no maturity/consistency
score is generated — that remains the original initiative owner's job.

---

## 1. Candidate backlog (prioritized)

Built from the remaining-debt sections of the authoritative reports. Each
candidate was triaged against the non-negotiable rules (low risk, measurable
gain, no gameplay impact, no redesign, no accessibility regression).

### Priority 1 — Icon consolidation (functional emoji → lucide-react, Bucket A)
The `ICON-CONSOLIDATION-REPORT.md` §4 inventory named ~100 further Bucket-A
sites (standalone rendered icon-role emoji in product chrome) concentrated in
room/voice chrome. These were the highest-confidence candidates: the glyph is
the whole content of an icon slot (`aria-hidden`-wrapped span inside a
button/heading), `lucide-react` is already the most-adopted icon system
(38 consumer files at phase-1 close), and swapping is a pure glyph
replacement — no layout, behavior, or accessibility change.

### Priority 2 — Token adoption (value-neutral dark-mode swaps)
`TOKEN-ADOPTION-REPORT.md` §6 proved the Tailwind opacity-suffix limitation
and the `.auth-shell` scope trap. The un-suffixed `dark:bg-[#131926]`
instances in room chrome are exact matches to `--surface-1 (dark)` —
verifiable value-neutral swaps (both resolve to `#131926` in dark mode).

### Priority 3 — Shared UI component adoption
No safe drop-in candidates exist. `SkeletonLoader` (1 consumer) vs 49
hand-rolled `animate-pulse` loaders differ in skeleton shape/content; forcing
adoption risks visual change. `EmptyStateIllustration`'s icon field is
Bucket-C (prop type change). **Deferred with reasons** — no implementation.

### Priority 4 — Typography normalization
No safe candidates remain. All sub-pixel sizes not already fixed are inside
the 11 excluded game files. Integer off-scale sizes have no on-scale
neighbour within 1px (Tailwind gaps 12→14→16), so forcing them is a visual
redesign. `TYPOGRAPHY.*` adoption was already rejected by
`TYPOGRAPHY-CONSISTENCY-REPORT.md` §3 for a colour-family conflict (dark
stone/zinc vs warm parchment). **Deferred with reasons** — no implementation.

---

## 2. Changes implemented

### Priority 1 — 26 functional emoji replaced across 11 files (all Bucket A)

| File | Emoji sites replaced | Replacement icon(s) |
|---|---|---|
| `components/VoicePanel.tsx` | `🎙` (heading), `🎙` (connect-mic button) | `Mic` (14, 16) |
| `components/room/CommunicationPanel.tsx` | `💬` (chat tab), `🎙` (voice tab), `💬` (mobile strip) | `MessageSquare`, `Mic` |
| `components/RoomCode.tsx` | `📋` (copy), `📷` (QR) | `Copy`, `QrCode` |
| `components/RoomNameEditor.tsx` | `✏️` ("Name this table" unset state) | `Pencil` |
| `components/room/RoomHeader.tsx` | `🚪` (Leave) | `LogOut` |
| `components/PlayerList.tsx` | `👥` (heading), `👥` (footer), `👑` (host), `✓` (ready), `🎯` (react) | `Users`, `Crown`, `Check`, `Target` |
| `components/room/ParticipantRow.tsx` | `👑` (host badge), `🤖` (bot badge), `✓` (ready) | `Crown`, `Bot`, `Check` |
| `components/room/ParticipantActionMenu.tsx` | `🗑️` (remove) | `Trash2` |
| `components/room/BotManagementDialog.tsx` | `🤖` (dialog header) | `Bot` |
| `components/room/RoomShareCard.tsx` | `🎟️` (header), `📷` (QR), `📸` (snapshot), `📋` (copy), `🔗` (share), `✓` (copied) | `Ticket`, `QrCode`, `Camera`, `Copy`, `Link2`, `Check` |
| `components/Chat.tsx` | `💬` (chat header) | `MessageSquare` |

### Priority 2 — 7 value-neutral dark-mode swaps across 4 files

| File | Swap |
|---|---|
| `components/VoicePanel.tsx` | `dark:bg-[#131926]` → `dark:bg-[var(--surface-1)]` |
| `components/room/CommunicationPanel.tsx` | `dark:bg-[#131926]` ×2 → `dark:bg-[var(--surface-1)]` |
| `components/PlayerList.tsx` | `dark:bg-[#131926]` → `dark:bg-[var(--surface-1)]` |
| `components/Chat.tsx` | `dark:bg-[#131926]` ×3 → `dark:bg-[var(--surface-1)]` |

Every swap is an exact, value-neutral token adoption: `--surface-1` resolves
to `#131926` in the dark theme (verified against `index.css` before editing),
so the rendered pixels are byte-identical.

---

## 3. Changes rejected / deferred (with reasons)

| Candidate | Why not implemented |
|---|---|
| `InlineRoomRail.tsx` 🎟️👥🎙️💬🙂📸 | File renders inside game board chrome (e.g. LudoBoard) — game-board UI is excluded by instruction |
| `RoomNameEditor.tsx` `✏️ {name}` (named state) | Pencil sits inline inside a Caveat script-font text run; an SVG would alter baseline alignment vs the emoji |
| `Chat.tsx` "Say hi to the table! 👋" | Bucket B — emoji embedded in a string, not an icon slot |
| `AudioSettings.tsx` 🔇/🔊 | Bucket B — emoji inside template-string labels |
| `GameRoomSheet.tsx` "🤖 AI opponents…", "⚡ Real-time…" | Bucket B — marketing copy, not icon-role glyphs |
| `BhalyamResultModal.tsx` 👑 | Bucket C — decorative artwork; 17 coincidental hex collisions already documented |
| `CoachHintButton.tsx` ✏️👀👥 | Bucket C — data-driven hints map; fixing changes a prop type |
| `CompactColorSelector.tsx` ✓ | Game-piece colour swatch control (game-adjacent) |
| `BoardPreviewPill.tsx` 👁 | Single-site straggler — needs per-site icon-size verification in a tiny pill |
| `Room.tsx` 🤖⚠👁 | Page shell mixes room + game chrome; high risk to untangle safely |
| `dark:bg-[#182234]` (VoicePanel, CommunicationPanel, PlayerList, Chat) | Matches `auth-field (dark)` — `.auth-shell`-scoped, unreachable from these components; an un-scoped `var()` would resolve to nothing |
| `dark:bg-[#1A2333]` (ParticipantActionMenu) | Matches `auth-note-bg (dark)` — `.auth-shell`-scoped, unreachable |
| `border-[#E8D8BE]` (RoomCode) | Matches `auth-card-edge`/`auth-field-edge` — `.auth-shell`-scoped, unreachable |
| `text-[#0F172A] dark:text-slate-100` (RoomHeader Leave) | `ink.hi` dark value is `#F8FAFC`, not `slate-100` — not value-neutral |
| Inline style `#e2e8f0`/`#0f172a` (InlineRoomRail) | Inline styles + game-embedded surface; token swap would change dark rendering |
| DLS `SkeletonLoader` adoption (49 loaders) | Shapes differ; forcing adoption is a visual change, not a drop-in |
| `EmptyStateIllustration` icon prop | Bucket-C prop-type change — needs its own verified pass |
| Remaining off-scale integer type sizes | No on-scale neighbour within 1px (Tailwind gaps) — would be a size change |
| `TYPOGRAPHY.*` adoption | Rejected by prior report — colour-family conflict (stone/zinc vs warm parchment) |

---

## 4. Risk analysis

| Dimension | Risk | Mitigation / result |
|---|---|---|
| Functionality | None | Emoji→SVG is rendering-only; no handlers, props, events, or state changed |
| Accessibility | None | Every replacement keeps `aria-hidden` (or adds it); all lucide icons are `aria-hidden="true"`; existing `aria-label`/`title` on interactive controls unchanged; icon size ≈ emoji size (`text-xs`-`text-sm` slots) |
| Responsiveness | None | `flex items-center` parents unchanged; icons sized 12–16px matching the emoji footprint they replaced |
| Theme | None | Icons inherit `currentColor` exactly as the emoji did; token swaps are value-neutral (`#131926` → `var(--surface-1)` resolves to `#131926`) |
| Bundled size | Negligible | lucide icons are tree-shaken ESM; +11 consumer files reusing already-installed library |
| Routing / API / tests | None | No route, socket, or shared-type touched; full suite green (below) |

---

## 5. Verification results

```bash
cd client && npm run typecheck          # clean (log: header only, no errors)
cd client && npm test                    # 64 files / 502 tests passed (0 failed)
cd client && npm run build               # clean, built in 14.97s, 15/15 routes prerendered
npm run design:tokens                    # see §6 deltas
```

Observed: the only build output warnings are pre-existing (chunk-size
advisory and PowerShell's `NativeCommandError` wrapper for normal node
stderr) — both present before this change; no typecheck errors, no test
failures, no new console warnings attributable to the edits.

---

## 6. Measured deltas (exact, attributable)

| Metric | Phase-1 close | Wave 2 after | Delta |
|---|---:|---:|---:|
| `lucide-react` consumer files | 38 | **49** | **+11** (the 11 files changed) |
| Emoji glyphs in product chrome | 417 | **391** | **−26** (exactly the 26 sites replaced) |
| Design-token classes (`var()` arbitrary) | 790 | **797** | **+7** (exactly the 7 swaps) |
| Arbitrary hex classes | 2,709 | **2,702** | **−7** |
| Token compliance | 15.0% | **15.1%** | +0.1pp |

The before numbers are directly from `design:tokens` output captured at the
end of `TOKEN-ADOPTION-REPORT.md`'s pass (790 var-token classes, 15.0%
compliance) and `ICON-CONSOLIDATION-REPORT.md` § "before/after"
(417 chrome emoji, 38 lucide files) — not re-derived, per instruction.

---

## 7. Remaining debt

- **~74 further Bucket-A/C emoji candidates** in chrome (Bucket B copy
  excluded by AGENTS.md §8 reading; Bucket C data-driven props need their own
  typed passes): `InlineRoomRail`, `RoomNameEditor` named-state, `Room.tsx`,
  `AudioSettings`, `GameRoomSheet`, `CoachHintButton`, `BoardPreviewPill`,
  `CompactColorSelector`, `BhalyamResultModal`, and the `PrivacyPolicyPage`
  section-nav icon list + `EmptyStateIllustration` icon prop.
- **Semantic tokens** (`success`/`warning`/`danger`/`info`) remain at 0
  consumers — blocked by the missing dark-mode overrides documented in
  `TOKEN-ADOPTION-REPORT.md` §6. Fixing that requires a token-architecture
  change (add dark values), which is outside this implementation's "no new
  token architecture" constraint.
- **`ROOM_COLORS` / `auth-shell`-scoped token reachability** — the
  `.auth-shell` scope trap remains: several exact-hex matches are
  unreachable from their components. A future pass could add root-scoped
  aliases, but that is a token-architecture decision.
- **Inline ad-hoc `function XIcon()`** (96 defs/23 files) and the
  `TournamentIcons` vs `RankIcons` crown dual-metaphor remain — both named in
  the prior reports as requiring design decisions, not implementation.