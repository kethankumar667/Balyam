# Icon Consolidation — Report

Inventories every icon library, SVG system, and emoji occurrence in product
chrome; replaces functional emoji and one confirmed inconsistent-icon
pattern with the existing shared icon systems (`design-system/icons/*`,
`lucide-react`). Gameplay icons, trophies, achievements, and game-specific
symbols were not touched — enforced by the same `isGameSurface()` boundary
`TYPOGRAPHY-CONSISTENCY-REPORT.md` used, not a separate judgement call per
file. `RoomCodeShare.tsx` was excluded as AGENTS.md §8 names it by name as a
sanctioned emoji exception, alongside in-game UI.

## Before / after

| Metric | Before¹ | After | Command |
|---|---:|---:|---|
| Files importing `lucide-react` | 30 | 38² | `node scripts/design-audit/inventory.mjs` |
| Files importing `design-system/icons/*` | 18 | **25** | same |
| Files importing `components/bhalyam/icons` | 3 | 3 | same |
| Inline ad-hoc `function XIcon()` (own, one-off) | 96 / 23 files | 96 / 23 files | same |
| Raw `<svg>` tags (all systems) | 271 | 282² | same |
| Total emoji occurrences | 1,223 | 1,239² | same |
| — in game surfaces (sanctioned) | 817 | 822² | same |
| — in chrome | 406 | **417**² | same |
| — of the chrome ones, already `aria-hidden` | 37 | 38² | same |

¹ Measured at `a2c20fa`, same whole-session framing as the other three
reports from this engagement. ² **This spans the whole uncommitted session
(Tasks A–D), not just this pass** — the button/modal/token work before this
task added `lucide-react` imports and small text elements of its own. This
task's own, directly attributable contribution is measured separately in
§1–§2 below, against an immediate before/after this pass itself ran (429
chrome emoji → 417, exactly −12; 24 `design-system/icons` files → 25,
exactly +1) — those two numbers are the ones this report's actual edits are
responsible for; the table above is whole-session context, not this pass's
receipt.

## 1. Full chrome inventory, classified — the foundation the replacements below are drawn from

422 chrome emoji occurrences across every non-game file were listed with
file, line, and surrounding context (a one-time read-only script, not
committed — same rationale as `TYPOGRAPHY-CONSISTENCY-REPORT.md`'s sub-pixel
fixer: a mutation/listing utility isn't a lasting audit tool). Sorted into
three buckets by what AGENTS.md §8 actually says ("No emoji as decorative
icons in product chrome... emojis are deliberately used inside playful
in-game UI... leave those alone"):

| Bucket | What it is | Count | This pass |
|---|---|---:|---|
| **A — standalone rendered icon-role glyph** (bare `<span>✓</span>`, `aria-hidden`-wrapped, or the sole JSX content of a button) | The emoji *is* a UI icon in a real icon slot | ~110 | 6 replaced (§2); rest inventoried, not migrated (§4) |
| **B — embedded in a string** (toast messages, chat quick-replies, badge/theme label text, `showToast("✓ Copied…")`) | Decorative flourish inside copy, not a rendered icon component | ~260 | Left alone — see below |
| **C — data-driven `icon:`/`badge:` field feeding a shared component** (`PrivacyPolicyPage.tsx`'s section-nav list, `EmptyStateIllustration.tsx`, rank-medal badges) | Functional, but fixing it changes a prop's type, not just a swap | ~50 | Rank-medal subset fixed (§2); rest inventoried (§4) |

**Bucket B was deliberately not touched, and that's a reading of AGENTS.md's
own wording, not a scope shortcut.** The rule bans emoji *as decorative
icons*; `"✓ Copied Profile ID"` inside a toast string, `"Nice move! 👏"` in a
chat quick-reply, `badge: "🔥 School Favourite"` in a game-catalogue label
are copy, not icons — there is no rendered icon element to replace them
with, and restructuring every toast/badge/quick-reply to carry a separate
icon component alongside its text would be a UI restructuring, not an icon
swap, well outside this task's scope. Reported as classified-and-excluded,
not silently absent from the numbers.

## 2. What was actually replaced

### Rank-medal inconsistency (Bucket C) — the concrete "inconsistent application icons" this task asked for

Three real, rendered product surfaces each independently invented their own
representation of "1st / 2nd / 3rd place," and disagreed with each other —
`LeaderboardTable.tsx` and `SeasonLeaderboard.tsx` used `🥇🥈🥉` (medal
emoji), `TournamentHistory.tsx` used `👑` for 1st (a crown, a different
metaphor) alongside `🥈🥉` for 2nd/3rd. A correct, already-built, already
shared component for exactly this — `GoldRankIcon`/`SilverRankIcon`/
`BronzeRankIcon` in `design-system/icons/RankIcons.tsx` (full custom SVG,
gradient-filled shield badges, part of the canonical `design-system/icons`
export) — existed with **zero real consumers** before this pass (confirmed
by grep, not assumed). All three now render the same shared icon:

| File | Before | After |
|---|---|---|
| `features/rankings/LeaderboardTable.tsx` | `<span className="text-xl">🥇/🥈/🥉</span>` | `<GoldRankIcon size={22}/>` etc. |
| `features/tournaments/SeasonLeaderboard.tsx` | `<span className="text-2xl">🥇/🥈/🥉</span>` | `<GoldRankIcon size={26}/>` etc. |
| `features/tournaments/TournamentHistory.tsx` | `"👑 1st Place (Champion)"` (text prefix) | `<GoldRankIcon size={14}/> 1st Place (Champion)` (icon + text, `inline-flex` restructured) |

All three are real, rendered, tested product surfaces (`TournamentsPage.tsx`
renders `TournamentHistory`/`SeasonLeaderboard`, `LeaderboardPage.tsx`
renders `LeaderboardTable`; each has an existing test file) — not dead code.

**`design-system/premium/colors.ts`'s `TOURNAMENT_COLORS.badge` fields**
(`"👑 1st"`, `"🥈 2nd"`, `"🥉 3rd"`, `"🎖️ Top 8"`) were found to have the
identical inconsistency and were **not** fixed: `grep`-confirmed **zero
files import `premium/colors`** anywhere in the codebase outside the file
itself — dead code, matching `DESIGN-SYSTEM-BASELINE.md`'s existing finding
that `design-system/premium/` is the least-adopted of the three shared
directories. Fixing an unused export doesn't change what ships; flagged
here rather than spent effort on.

**`TournamentHistory.tsx`'s `item.badge || "🎖️"` fallback (L64) was also
left alone** — `item.badge` is dynamic, per-tournament data (an admin- or
config-supplied emoji), not a hardcoded UI choice; only its *fallback*
default is hardcoded, and changing just the fallback while the real field
stays an arbitrary emoji string would be inconsistent in the opposite
direction (sometimes a real icon, sometimes whatever data supplied) —
correctly left as dynamic content, not a UI-chrome icon.

### Close-button icon (Bucket A)

`pages/SettingsPage.tsx` — three `leftIcon={<span aria-hidden>✕</span>}`
(Edit Display Name / Change Password / Erase Everything dialog close
buttons) replaced with `leftIcon={<X className="w-4 h-4" aria-hidden />}`.
`X` was **already imported** in this file (line 35, unused for this
purpose) — zero new import overhead, the cleanest possible instance of this
fix. `Check` is also already imported and already used correctly elsewhere
in the same file (the Dark Mode selected-state badge) — confirmed as
precedent, not introduced fresh.

## 3. Icon-system architecture — what the inventory actually shows

Four systems, ranked by real consumer-file count, before and after:

| System | Before | After |
|---|---:|---:|
| `lucide-react` (external) | 30 | 38 |
| `design-system/icons/*` (8 files: Achievement/Game/Navigation/Rank/Social/Status/Tournament/Voice) | 18 | **25** |
| Inline ad-hoc `function XIcon()`, unique per file | 96 defs / 23 files | unchanged |
| `components/bhalyam/icons.tsx` (the location AGENTS.md §8 names as canonical for *new* chrome icons) | 3 | 3 |

`lucide-react` remains the most-adopted system by a wide margin, and this
pass's one new consumer went to `design-system/icons` instead (the rank
medals) specifically because a purpose-built, on-brand component already
existed there — reaching for `lucide-react`'s generic `Medal`/`Award` glyph
would have been *a third* visual treatment for the same concept, not a
consolidation. `components/bhalyam/icons.tsx` — the actual canonical
location AGENTS.md §8 names — stays the least-adopted of the four; this
pass didn't add to it because none of the two fixes made in §2 were "new
neutral UI chrome" in the sense that rule targets (one adopted an existing
specialized component, one reused an existing import).

**A second internal inconsistency, found and not fixed**: `design-system/
icons/TournamentIcons.tsx` separately exports `ChampionCrownIcon` and
`RunnerUpMedalIcon` — a *second*, crown-based rank metaphor sitting
alongside `RankIcons.tsx`'s shield-based one, inside the same shared
library. Not resolved in this pass (deciding which of two already-designed,
already-exported systems is canonical is a design decision this task's
scope doesn't include); named so a future pass doesn't have to
re-discover it from scratch.

## 4. What was inventoried but not replaced — Bucket A and C remainder

Roughly 100 further Bucket-A sites (standalone rendered icon-role emoji, the
same shape as the `SettingsPage.tsx` fix in §2) exist across files this pass
didn't reach, concentrated in: `Room.tsx` (🤖/⚠/👁, 5 sites), room/voice
chrome (`VoicePanel.tsx`, `CommunicationPanel.tsx`, `RoomShareCard.tsx`,
`RoomCode.tsx`, `RoomNameEditor.tsx`, `RoomHeader.tsx` — 🎙/💬/📋/🔗/✏️/🚪,
~14 sites across 6 files), `PlayerList.tsx`/`ParticipantRow.tsx`/
`ParticipantActionMenu.tsx` (👑/🤖/✓/🗑️, 5 sites), and single-site
occurrences in a dozen more files (`CompactColorSelector.tsx`,
`RecoveryBanner.tsx`, `AchievementRevealModal.tsx`, `GettingStartedCard.tsx`,
`BotManagementDialog.tsx`, `GameOverScreen.tsx`, `SchoolGangWaitingBanner.tsx`).
Each was captured with file/line/glyph in this pass's inventory (§1) and is
a real Bucket-A candidate, not a maybe — not migrated here because each
needs the same individual verification given to the sites in §2 (does the
file already import an icon system, is the glyph genuinely the button's
whole content or part of a larger string, what size/aria treatment matches
the surrounding markup) at a volume this pass's scope didn't extend to.
Reported precisely so a follow-up pass has the list rather than needing to
re-derive it.

`PrivacyPolicyPage.tsx`'s section-nav list (`icon: "📖"` etc., 10 sites,
L223-234) and `design-system/premium/EmptyStateIllustration.tsx`'s `icon:
"🎮"/"🏆"/"👥"/"🏟️"/"⚡"` (5 sites, a real shared component) are Bucket-C
candidates left unmigrated for the same reason — fixing them means changing
a prop's type from `string` to an icon-component reference and updating
every render call site, not a single-line swap, and deserves its own
verified pass rather than being rushed inside this one.

## 5. Verification

```bash
cd client && npm run typecheck   # clean
cd client && npm run build       # clean, 15/15 routes prerendered
cd client && npm test            # 64 files / 502 tests passing, no regressions
node scripts/design-audit/inventory.mjs   # icon-system + emoji tables above
grep -rln "TOURNAMENT_COLORS\|premium/colors" client/src --include="*.tsx" --include="*.ts"
  # → only colors.ts itself, confirming it's genuinely unconsumed before skipping it
```

## 6. Status

**One confirmed inconsistent-icon pattern (rank medals) resolved across
every real consumer of it, using an existing shared component that had zero
prior adoption** — not a new component, not a partial fix (`colors.ts`'s
copy of the same badges was checked and correctly left, since it's dead
code). One clean Bucket-A fix reusing an already-imported icon. Both
verified against the actual before/after this pass produced (429→417 chrome
emoji, 24→25 `design-system/icons` consumers), not the noisier whole-session
numbers. A full, file-and-line-precise inventory of the ~150 remaining
functional-icon candidates (Bucket A + C) is recorded in §4 rather than
attempted at lower rigor to inflate a count — the same trade-off this
engagement has made every time real per-site verification would otherwise
have to be skipped to hit a bigger number.
