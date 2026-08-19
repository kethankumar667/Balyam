# COMPONENT-CONSISTENCY-REPORT.md — Shared Component Audit

> **Phase 3 of the BHALYAM Design Execution Audit.** Buttons, cards, inputs, modals, toasts, tabs, badges,
> avatars, chips, navigation — and the state primitives (loading / empty / error) that Platform Rule 5
> requires on every data-bound view.
>
> **Scope split.** Counts are given for **product chrome** (302 files) separately from **game boards**
> (325 files under `games/`, `animations/`, `features/brick*`). A Nokia game *should* have its own buttons;
> the lounge should not have eleven kinds. Mixing the two would inflate every number and excuse the real
> problem.
>
> **Method.** `scripts/design-audit/components.mjs`, `…/inputs.mjs`, plus compiled-CSS verification.
> Reproduce with the commands in §9.

---

## 0. Summary

| Primitive | Shared implementation exists? | Consumers of it | Hand-rolled instances | Verdict |
|---|---|---:|---:|---|
| **Button** | Yes — `design-system/dls/Buttons.tsx` (5 variants) | **0 product screens** | **683** `<button>` in 171 files | **BROKEN** |
| **Card** | Yes — `PremiumCard` + `SURFACES.*` | 14 | **524** matched containers, **96** distinct signatures | **BROKEN** |
| **Modal / overlay** | **No** | — | **82** overlays in **63** files | **MISSING** |
| **Input** | **No** | — | 38 in chrome, **22** distinct signatures | **MISSING** |
| **Toast** | **No** (3 unrelated ones) | — | 10+ files render their own | **MISSING** |
| **Tabs** | **No** | — | 8 tab strips, **1** with ARIA semantics | **MISSING + A11Y** |
| **Avatar** | Partial — `SeatAvatar`, `SelfAvatar` | 5 | 5 separate implementations | **DUPLICATED** |
| **Badge / chip** | **No** | — | 28 pill chips in 17 chrome files | **MISSING** |
| **Skeleton** | Yes — `SkeletonLoader` | **3** | **51** files hand-roll `animate-pulse` | **BROKEN** |
| **Empty state** | Yes — `EmptyStateIllustration` | **4** | 26 files hand-roll "No …" copy | **BROKEN** |
| **Error state** | Yes — `PremiumErrorState` | **0** | — | **UNUSED** |

**Nine of eleven primitives are either missing or exist and are unused.** This is the mechanism behind
every "inconsistent screen" complaint in `DESIGN-INVENTORY.md`: there is no shared object to be consistent
*with*.

---

## 1. Buttons

### 1.1 The library exists and nothing imports it

`client/src/design-system/dls/Buttons.tsx` exports `PrimaryButton`, `SecondaryButton`, `DangerButton`,
`TournamentCTAButton`, `RewardButton`. 32 references, in **three** files:

| File | Why it references them |
|---|---|
| `design-system/dls/Buttons.tsx` | it *is* the definition |
| `design-system/__tests__/dlsSystem.test.tsx` | asserts they exist |
| `pages/DesignSystemCatalogPage.tsx` | displays them in the catalogue |

**Product-screen consumers: zero.** Not the lounge, not the room, not auth, not settings, not a single
game. The button library is a museum exhibit with a test proving the glass case is intact.

A second, unrelated button system — `components/paper/PaperButton.tsx` — has 15 uses across two notebook
games. It is scoped and deliberate, and is not counted as drift.

### 1.2 What is shipped instead

**683 `<button>` elements across 171 files.** Classifying non-game buttons by (border-radius × font-weight)
alone — ignoring colour, padding, shadow, and press behaviour — yields **22 distinct signatures**:

| Uses | radius × weight |
|---:|---|
| 24 | `rounded-xl` · `font-bold` |
| 13 | `rounded-2xl` · `font-black` |
| 11 | `rounded-full` · `font-extrabold` |
| 10 | `rounded-full` · *(no weight declared)* |
| 9 | `rounded-none` · *(none)* |
| 8 | `rounded-lg` · `font-bold` |
| 7 | `rounded-2xl` · `font-extrabold` |
| 6 | `rounded-full` · `font-bold` |
| 5 | `rounded-2xl` · `font-bold` |
| 5 | `rounded-xl` · `font-extrabold` |
| 5 | `rounded-none` · `font-bold` |
| … | 11 more |

Four radii and five weights, freely combined. **A user cannot learn what a button looks like in this
product, because it does not look like anything in particular.**

### 1.3 Consequences that are not cosmetic

* **Press feedback is absent where it was intended.** `active:scale-98` appears 18 times, including the
  `PLAY NOW` control on every game card, and compiled to **nothing** until Phase 10. Twenty-six controls
  declared tactile feedback and rendered none — the direct opposite of `ui-ux-standards.md` §1 Pillar 3.
* **Destructive actions are not consistently marked.** `DangerButton` has no consumers, so "Leave room",
  "Delete account" and "Clear data" are each styled by hand. In the room header, **"Leave" is the most
  visually prominent control on the screen** (`DESIGN-INVENTORY.md` §5.2).
* **Touch-target compliance had to be re-litigated 107 times** because the rule lived in prose rather than
  in a button component (`responsive-audit-report.md` §3).

### 1.4 What good looks like — it is already here

`SPACING.touchTarget` in `design-system/dls/Spacing.ts` is a rule converted into a token, backed by a
measuring script, with the reasoning recorded in the comment. **That is the standard.** The button library
should have been built the same way and enforced the same way — by a gate that fails the build, not by a
document that asks nicely.

---

## 2. Cards

**96 distinct card-container signatures** across 524 matched elements in chrome, where a "signature" is only
(radius × border-width × shadow) — colour excluded.

| Uses | Signature |
|---:|---|
| 115 | `rounded-xl` · `border` · no shadow |
| 83 | `rounded-full` · `border` · no shadow |
| 36 | `rounded-2xl` · `border` · no shadow |
| 35 | `rounded-lg` · `border` · no shadow |
| 17 | `rounded-2xl` · `border` · `shadow-xs` |
| 15 | `rounded-2xl` · `border` · **`shadow-2xs`** |
| 12 | `rounded-full` · `border` · `shadow-2xs` |
| 12 | `rounded-full` · `border` · `shadow-xs` |
| … | 88 more, mostly 1–7 uses each |

**C-1 — `shadow-2xs` does not exist. 41 uses, zero CSS.** Phase 10 pass 1 declared `shadow-xs` (93 uses,
a Tailwind v4 name adopted early) but missed its smaller sibling. Verified against compiled output:

```
shadow-xs      1   ← emits
shadow-2xs     0   ← emits nothing
```

Forty-one card and chip surfaces across 13 files — including `AuthShell`, `AppSidebar`, `Chat`,
`ParticipantRow`, `BhalyamHome`, `AboutPage`, `SettingsPage` — ask for the faintest lift in the system and
render **perfectly flat**. `backdrop-blur-2xs` (1 use, `AboutPage.tsx:14`) is dead for the same reason.
*Both are fixed in this phase — see `BHALYAM-DESIGN-REMEDIATION-REPORT.md` §2.1.*

**C-2 — the long tail is the finding.** 88 of the 96 signatures are used fewer than 8 times. Cards are not
being composed from a system; they are being drawn one at a time.

**C-3 — `rounded-full` used as a *card* 83 times** means chips and cards share a shape vocabulary, so size
is the only remaining cue for "is this a container or a control".

---

## 3. Modals and overlays

**No modal primitive exists.** There are **82 `fixed inset-0 z-*` overlays across 63 files**, each
implementing its own backdrop, panel, dismissal and focus behaviour.

| Concentration | File |
|---:|---|
| 9 | `games/rummy/RummyBoardMobile.tsx` |
| 4 | `pages/SettingsPage.tsx` |
| 3 | `games/rummy/RummyBoardDesktop.tsx`, `games/uno/uno-stadium.tsx` |
| 2 | `GameRoomSheet`, `ludo-board-composites`, 2× `rotation-sync` |
| 1 | 56 further files |

### 3.1 Backdrops do not agree

| Property | Distinct values in use |
|---|---|
| `bg-black/N` | **15** — 80 %(23), 60 %(19), 30 %(16), 50 %(13), 40 %(13), 5 %, 70 %, 45 %, 20 %, 10 %, 75 %, 85 %, 55 %, 15 %, 90 % |
| `backdrop-blur-*` | **6** — `md`(42), `xs`(32), `sm`(26), `xl`(9), `lg`(3), `2xs`(1) |

A first-time visitor meets **two blocking modals back to back** — the DPDP consent sheet, then the welcome
modal. They dim the page by different amounts and blur it by different radii. Nothing about that is a
decision; it is two authors reaching for a plausible number.

Before Phase 10, `backdrop-blur-xs` and `-2xs` emitted nothing, so **33 of the 82 overlays had no blur at
all** despite asking for it.

### 3.2 The behavioural cost

Because each overlay is hand-built, each must independently re-implement: Escape-to-close, focus trapping,
focus restoration to the trigger, `aria-modal`/`role="dialog"`, background scroll locking, and click-outside
dismissal. `accessibility-report.md` §4 records focus trapping, Escape handling and focus restoration as
**NOT VERIFIED** across the product — with 63 separate implementations, "verified" would have to mean 63
verifications.

**This is the single highest-leverage component in the audit.** One `<Modal>` primitive would resolve a
design-consistency defect, an accessibility gap, and 63 files' worth of duplicated behaviour at once.

---

## 4. Inputs

38 text inputs and textareas in chrome. **22 distinct signatures** — radius × height × border × focus:

| Uses | Signature |
|---:|---|
| 7 | `rounded-2xl` · no height · no border colour · focus-styled |
| 4 | `rounded-none` · no height · no border colour · no focus class |
| 3 | `rounded-xl` · `border-stone-800` |
| 2 | `rounded-lg` · `border-zinc-700` |
| 2 | `rounded-lg` · `border-stone-800` |
| 2 | `rounded-xl` · `border-[#ECD9BA]` |
| … | 16 more, all 1 use each |

Five distinct heights appear: `min-h-[42px]`, `[44px]`, `[46px]`, `[52px]`, `h-[60vh]`. **Three of these
sit either side of the 44 px thumb-bar rule**, so whether a field is tappable depends on which file it was
written in.

Two colour worlds are visible even here: `border-stone-800` / `border-zinc-700` (dark esports) next to
`border-[#ECD9BA]` / `border-[#EEDBCA]` (warm cream). Same product, same control, opposite palettes.

**Focus:** 7 files declare no focus classes on an input. This is **not** a focus-visibility defect —
`index.css` applies a global `*:focus-visible { box-shadow: var(--ring) }`, and the rendered audit measured
**0 focus gaps over 368 keyboard stops**. It is an *inconsistency* finding: some fields get a ring plus a
border-colour change, others only the global ring, so focus looks different from field to field.

**Labelling:** 16 files contain an input with neither `aria-label` nor `id` in the tag. This is a heuristic —
a wrapping `<label>` would satisfy the requirement and is not detected — but it flags where to look. Note
that `Chat`, `Room`, `RoomNameEditor` and `AdminDashboardPage` are **not covered by the rendered axe pass**
(`accessibility-report.md` §6), so no evidence exists either way for them.

---

## 5. Badges, chips and tabs — one visual language for four meanings

### 5.1 The uppercase pill is doing every job

From `DESIGN-SYSTEM-AUDIT.md` §2.4: 605 `uppercase`, 316 `tracking-wide*`, 88.8 % of weights ≥ 700. Applied
to a `rounded-full` container with `px-2 py-0.5`, that produces the house pill — and the house pill is
currently used for:

* **status** ("LIVE FEED", "Guest", "🔥 3x Streak")
* **filter controls** (game categories, leaderboard metrics — *interactive*)
* **tabs** (Friends List / Party Headquarters — *navigational*)
* **eyebrows** ("OUR STORY", "QUICK MATCH" — *decorative headings*)

Four different interaction contracts wearing the same clothes. A user cannot tell from looking whether a
pill is tappable, and the only reliable signal — the cursor — does not exist on the platform 100 % of the
audited traffic is designed for.

### 5.2 Tabs have no tab semantics

Eight files hold tab state. **One uses ARIA tab roles.**

| File | `role="tab"` |
|---|---|
| `components/room/CommunicationPanel.tsx` | ✅ |
| `components/games/FilterBar.tsx` | ✅ (tablist + tab) |
| `pages/LeaderboardPage.tsx` | ❌ |
| `pages/TournamentsPage.tsx` | ❌ |
| `pages/SocialHubPage.tsx` | ❌ |
| `pages/ProfilePage.tsx` | ❌ |
| `pages/PrivacyPolicyPage.tsx` | ❌ |
| `features/rankings/RecentPlayersHub.tsx` | ❌ |

Six tab strips on primary product pages announce as a row of unrelated buttons. A screen-reader user gets
no "tab 2 of 4", no selected state, and arrow keys do nothing. This is a **design-system gap with an
accessibility consequence** — a shared `<Tabs>` primitive would fix all six at once, and no amount of
per-page remediation will stop the seventh from being written the same way.

`axe-core` does not flag this: a `<button>` that behaves like a tab is valid HTML. It is exactly the class
of defect automated tooling cannot see, which is why `accessibility-standards.md` §1.3 asks for manual
keyboard review.

---

## 6. Toasts

Three unrelated toast components exist — `games/ludo/Toast.tsx`, `games/uno/uno-action-toast.tsx`,
`components/ChatMessageToast.tsx` — and at least seven more files render their own floating notification
inline, including `pages/Room.tsx` (5), `pages/SettingsPage.tsx` (17), `pages/BhalyamHome.tsx` (5) and
`games/spacewar/SpaceWarBoardMobile.tsx` (13).

Consequences: no queueing (two events overlap), no consistent dismissal timing, no shared position, and no
`aria-live` policy — so whether a transient message is announced to a screen reader depends on which file
raised it.

---

## 7. Avatars

Five implementations: `components/profile/SeatAvatar.tsx`, `components/profile/SelfAvatar.tsx`,
`components/profile/AvatarPicker.tsx`, `games/ludo/Avatar.tsx`, `games/rummy/Avatar.tsx` — plus inline
letter-avatars in `AppHeader`, `PlayerList`, `ParticipantRow` and `uno-shared`.

The functional consequence is in `DESIGN-INVENTORY.md` §5.2: **bots and humans render near-identically** —
same brown letter-avatar, distinguished only by a 🤖 pill — because no single component owns the decision
of how a participant is depicted.

---

## 8. Loading, empty and error states — Platform Rule 5

The rule requires all three on every data-bound view.

| Primitive | Product consumers | Hand-rolled alternative |
|---|---:|---:|
| `SkeletonLoader` | **3** (`LeaderboardPage`, `ProfilePage`, `TournamentsPage`) | **51 files** using `animate-pulse` directly |
| `EmptyStateIllustration` | **4** (`AchievementsPanel`, `FriendsList`, `TournamentsPage`, catalogue) | 26 files with hand-written "No …" copy |
| `PremiumErrorState` | **0** | — |
| `GameCardSkeleton` | 2 | — |

**E-1 — `SkeletonLoader`'s shimmer bars painted nothing.** Its six bars used `bg-stone-750`, a step Tailwind
does not ship and the config did not declare. The primitive that exists *specifically* so the product never
shows a blank loading state was **rendering blank bars** until Phase 10 declared the half-steps.

**E-2 — `PremiumErrorState` has zero consumers.** Every error surface in the product is bespoke. There is no
single answer to "what does BHALYAM look like when something fails", which is the state where design
confidence matters most.

**Mitigating, and it counts:** there are **zero raw `"Loading…"` strings** in the codebase. Loading states
are hand-rolled, not absent. The 51 `animate-pulse` files are doing the right thing with the wrong tool.

---

## 9. Reproducing every number

```bash
node scripts/design-audit/components.mjs   # buttons, modals, toasts, tabs, avatars, chips
node scripts/design-audit/inputs.mjs       # input signatures, focus and labelling heuristics

# dead-class verification (all must print a non-zero count after remediation)
cd client && npx tailwindcss -i src/index.css -o /tmp/tw.css
for c in shadow-xs shadow-2xs backdrop-blur-xs backdrop-blur-2xs bg-stone-750 duration-250; do
  printf '%-20s %s\n' "$c" "$(grep -cF -- "$c" /tmp/tw.css)"
done
```

**Limits.** Signature counting reads static `className` strings; a class assembled at runtime from a
variable is invisible to it, so every "distinct signatures" figure is a **floor**. The labelling heuristic
in §4 does not resolve wrapping `<label>` elements and must be confirmed by hand. Game-board internals are
counted but deliberately excluded from the consistency verdicts.

---

## 10. Priority order for remediation

Ranked by (screens affected) × (defects resolved per unit of work):

| # | Action | Resolves |
|---:|---|---|
| 1 | Declare `shadow-2xs` + `backdrop-blur-2xs` | 42 surfaces rendering flat **today** — one-line fix |
| 2 | Build one `<Modal>` primitive | 82 overlays, 15 backdrops, 6 blurs, plus focus trap / Escape / restore across 63 files |
| 3 | Build one `<Tabs>` primitive | 6 pages with no tab semantics |
| 4 | Adopt `DangerButton` for destructive actions | "Leave" outweighing "Start Game" in the room header |
| 5 | Route the 51 `animate-pulse` sites through `SkeletonLoader` | Platform Rule 5 loading half |
| 6 | Give `PremiumErrorState` its first consumer | Platform Rule 5 error half |
| 7 | Collapse 22 input signatures to one `<Field>` | 5 heights, 2 palettes, inconsistent focus |

Items 1 is applied in this phase. Items 2–7 are logged in `DESIGN-DEBT-REGISTER.md` with the reasoning for
**not** attempting them here: each is a refactor across 40–80 files, which is a change of a different kind
from a design audit and needs to be reviewed as such.

---

*Next: `VISUAL-IDENTITY-RECOMMENDATION.md` — the palette these primitives should be built from.*
