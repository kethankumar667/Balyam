# BHALYAM Design System — Baseline Measurements

Companion to [DESIGN-SYSTEM-ARCHITECTURE.md](DESIGN-SYSTEM-ARCHITECTURE.md)
(read that first for what the numbers below mean in context — several look
different once the governance-vs-reality gap in its §1 is accounted for).
Machine-readable form: `design-system-baseline.json`.

**Read-only measurement pass. No implementation file was modified.** Every
number is reproducible with the command shown at its section header.

```bash
npm run design:tokens                      # §1 tokens, §3 typography detail, part of §4/§5
npm run design:components                  # §0 component inventory (buttons/modals/cards/tabs/inputs/avatars/toasts)
node scripts/design-audit/inventory.mjs    # §0 remainder (chips/badges/dropdowns/nav/selects), §2 typography signatures, §4/§5 icon+emoji detail, §6 shared-library adoption
npm run design:colors                      # colour fragmentation detail behind §1
npm run design:palette                     # contrast-matrix sanity check (24/24 steps pass their declared role)
npm run design:dead-classes                # 0 dead utility classes (817 checked)
```

Total source: **583** `.tsx`/`.ts` files under `client/src`.

---

## 0. Component inventory

| Category | Count | Notes |
|---|---:|---|
| **Buttons** — raw `<button>` tags | 706 | 325 with a statically-readable className, across 127 files |
| — distinct visual signatures (radius × weight) | 22 | see `DESIGN-SYSTEM-ARCHITECTURE.md` §1 for why this can't fall as `dls` adoption rises |
| **Modals / Dialogs** — `fixed inset-0` overlays | 79 | across 59 files. BHALYAM has no native `<dialog>` usage (0) — "modal" and "dialog" are the same implementation pattern here, not two categories |
| — with `role="dialog"` | 33 | |
| — with a real focus trap | 10 | all via the shared `<Modal>` built this session; 0 hand-rolled traps remain outside it |
| — with focus restoration on close | 10 | same 10; 0 elsewhere |
| — with Escape-to-close | 18 | 10 via `<Modal>`, 8 independent hand-rolled implementations still outside it (`InlineRoomRail`, `QrScannerModal`, `CommunicationPanel`, `ParticipantActionMenu`, `RoomNameEditor`, `CarromBoard{Desktop,Mobile}`, `hc-notebook`, `RummyBoardDesktop`, `BhalyamHome`) |
| **Inputs** — `<input>` elements | 54 | 47 in chrome, 7 in game surfaces |
| — `<textarea>` | 2 | |
| **Selects** — `<select>` elements | 4 | no custom-styled select/combobox component found; all 4 are native |
| **Cards** — chrome card containers (radius+border match) | 347 | |
| — distinct signatures (radius × border × shadow) | 61 | 51 of the 61 signatures are used fewer than 8 times each — a long tail of near-unique treatments |
| **Chips / Badges** — named components | 3 | `BoardPreviewPill.tsx`, `components/paper/PaperBadge.tsx`, `components/paper/TornChip.tsx` — three different names for the same UI concept, no shared primitive |
| — unnamed inline chip/badge shapes (`rounded-full` + small padding + ~10-11px text) | 6 | not counting the 717 `rounded-full` uses generally, which include avatars, icon buttons, and toggle tracks |
| **Tabs** — components with tab-like state (`activeTab`/`setActiveTab`) | 11 | only 3 use `role="tab"` — 8 of 11 tab-like UIs are not exposed to assistive tech as tabs |
| **Navigation** — named nav surfaces | 3 | `AppHeader.tsx`, `AppSidebar.tsx`, `navigation/navigationConfig.tsx` (the shared config both consume) |
| — `<nav>` elements | 5 | |
| **Tooltips** | **0** | zero `role="tooltip"` and zero `function *Tooltip()` found anywhere in the codebase |
| **Dropdowns / Menus** — named components | 4 | `ParticipantActionMenu.tsx`, two independent `MenuScreen.tsx` (brick-breakout, brick-tetris), `games/ludo/SettingsMenu.tsx` — four separate implementations, no shared dropdown/menu primitive |
| **Avatars** — implementations (`function *Avatar()`) | 10 | |
| **Toasts** | 5 | independent implementations |

## 1. Design tokens

```
npm run design:tokens
```

| Metric | Value |
|---|---:|
| Design-token classes (`surface-*`, `ink-*`, `brand-*`, `gold-*`, `bhalyam-*`, semantic) | 425 |
| Raw Tailwind palette classes (`slate-*`, `red-*`, `amber-*`, …) | 4,216 |
| Arbitrary hex classes (`bg-[#xxxxxx]`) | 2,808 |
| **Total colour-bearing classes** | **7,449** |
| **Token compliance** | **5.7%** |

**Semantic layer — declared vs. used.** `success`/`warning`/`danger`/`info`
tokens exist (`--color-success` etc., `index.css`) and are wired into
Tailwind. Consumers via the token utility (`bg-success`, `text-danger`,
etc.): **0, 0, 0, 0.** The same four *meanings*, expressed in raw palette
classes instead: green/emerald ("success") 410 times, red/rose ("danger")
304 times, amber/yellow ("warning") 1,300 times, blue/sky/cyan ("info") 102
times — **2,116 raw-palette occurrences of a meaning a dedicated token
already exists for and is never once used to express.**

**Surface / ink token usage**: `surface-*` 76 occurrences, `ink-*` 96 —
both real and both theme-aware (§3 of `DESIGN-SYSTEM-ARCHITECTURE.md`), but
small relative to the 4,216 raw-palette figure above.

**Palette family share** (raw Tailwind classes, largest families):
`amber-*` 1,472 · `stone-*` 605 · `zinc-*` 505 · `slate-*` 475 ·
`emerald-*` 447 · `rose-*` 230 · `bhalyam-*` 170 (the one namespace in
active, intentional use per `AGENTS.md` §8) · `ink-*` 96 · `surface-*` 76.

**A caveat on the 5.7% figure**: it counts Tailwind utility class names and
cannot see `bg-[var(--chrome-panel)]`-style arbitrary-value references to
the separate, working `--chrome-*` token set `AppHeader.tsx`/`AppSidebar.tsx`
use (`DESIGN-SYSTEM-ARCHITECTURE.md` §3). Real adoption of *some* token
system is higher than 5.7%; adoption of the utility-class tokens this
figure measures is exactly 5.7%.

**Elevation / shadow**: 609 raw Tailwind shadow classes. The two-step
"quiet" ladder (`shadow-xs`/`shadow-2xs`) is used 161 times; one-off
arbitrary shadows (`shadow-[…]`) appear 169 times across 134 *distinct*
values — effectively 134 one-of-a-kind shadows. A designed 3-step elevation
ladder (`shadow-lift-1/2/3`) exists and is used **7** times total.
`shadow-rim-gold` (also designed, declared) has **0** consumers.

**Stacking**: 29 distinct `z-index` values in use, from plain `z-10` (100
uses) down to single-use arbitrary values like `z-[300]`, `z-[90]`,
`z-[25]` — no documented z-index scale.

**Shape**: `rounded-full` (717), `rounded-xl` (492), `rounded-2xl` (439),
`rounded-lg` (213), `rounded-3xl` (132), `rounded-md` (66), plus 40
arbitrary `rounded-[…]` values (14 distinct) — a full, if uncoordinated,
spread across Tailwind's entire radius scale.

**Motion**: 1,038 `transition-*` utilities; 193 explicit `duration-*`
values across 12 distinct steps (`duration-200` dominant at 77 uses);
**1** named easing token in actual use despite a designed
`transitionTimingFunction` scale existing. 53 files import `framer-motion`,
of which only 25 guard `prefers-reduced-motion` — 28 do not, a direct gap
against `docs/ai/accessibility-standards.md` §3.2's explicit requirement.

**Dead classes**: `npm run design:dead-classes` — 817 distinct utility
classes checked, **0 emit no CSS.** (This was a live problem earlier in
this remediation effort — a `750`/`850` half-step gap in the Tailwind
config and a couple of missing custom values — and is now clean.)

## 2. Typography

```
node scripts/design-audit/inventory.mjs
```

| Metric | Value |
|---|---:|
| On-scale sizes (`text-xs` … `text-9xl`) | 1,721 |
| Arbitrary sizes (`text-[…]`) | 1,592 |
| — distinct arbitrary size values | 43 |
| — of which sub-pixel (e.g. `12.5px`) | 10 distinct values, **215 call sites across 32 files** (see below) |
| — of which below 12px | 1,013 |
| **Elements with a statically-readable text-size class** | 3,271 |
| **Distinct (size × weight × family) typography signatures** | **430** |

430 signatures is the single most fragmented metric measured in this pass —
roughly 7× the button-signature count (22) and 7× the card-signature count
(61). Top signatures by frequency: `text-xs · font-bold · (inherited
family)` (207), `text-xs · (no weight) · (inherited)` (150), `text-xs ·
font-black · (inherited)` (90), `text-[10px] · font-bold · (inherited)`
(88) — the top four alone account for 535 occurrences, but the tail is
long: hundreds of signatures used only a handful of times each.

**Sub-pixel sizes**, counted precisely (not the "10" shorthand above, which
is distinct *values*): `text-[12.5px]` (60), `text-[13.5px]` (50),
`text-[11.5px]` (48), `text-[10.5px]` (27), `text-[9.5px]` (8),
`text-[14.5px]` (8), `text-[8.5px]` (5), `text-[7.5px]` (5),
`text-[15.5px]` (4) — **215 total call sites, 32 files.**

**Font weight distribution**: `font-bold` 1,119 (44.2%) · `font-black` 801
(31.7%) · `font-extrabold` 324 (12.8%) · `font-semibold` 187 (7.4%) ·
`font-medium` 83 (3.3%) · `font-normal` 16 (0.6%). **88.7% of all weighted
text is ≥700** — this is a design choice (a bold, gaming-forward aesthetic
is clearly intentional, not an accident), reported as a fact, not a defect.

**Font families**: 11 distinct families loaded via one consolidated
`<link>` in `index.html` — Poppins (`font-sans`/`font-body`), Righteous
(`font-display`), Caveat (`font-script`), JetBrains Mono (`font-mono`),
Kalam / Patrick Hand / Architects Daughter (Hand Cricket notebook skin),
Playfair Display (Rummy wordmark only, `--rm-font-display`), Fredoka (Ludo
token face), Noto Sans Telugu (language switcher), Nunito (fallback behind
Poppins in several SVG text elements, not used as a primary face anywhere).

## 3. Contrast

```
npm run design:palette
```

24 palette steps checked across 7 ramps against the roles they're declared
for (light grounds `sand-50`/`sand-100`/`sand-200`, dark grounds
`sand-950`/`sand-900`): **all 24 pass**, and every graphics-only step is
confirmed measurably unusable for text (i.e. correctly excluded from text
use). This is the one dimension in this baseline with no fragmentation
finding — the ramp itself is internally consistent.

Separately, a live-rendered contrast pass (`client/scripts/design-audit/contrast.mjs`,
axe-adjacent, real Chromium against the production build across 12 routes ×
2 themes × 2 viewports) found 88 failing text/background node instances at
measurement time — pre-existing, itemised in `MODAL-SYSTEM-AUDIT.md` and
`UI-REMEDIATION-SUMMARY.md` from this session's remediation work, not
re-derived here since this pass is static-analysis only.

## 4. Icon systems

```
node scripts/design-audit/inventory.mjs   (cross-checked against design:tokens — both agree)
```

| System | File consumers |
|---|---:|
| `lucide-react` (external library) | 38 |
| `design-system/icons/*` (8 files: Achievement/Game/Navigation/Rank/Social/Status/Tournament/VoiceIcons) | 24 |
| `components/bhalyam/icons.tsx` (the location `AGENTS.md` §8 names as canonical) | 3 |
| Inline ad-hoc `function XIcon()`, unique per file | 96 occurrences / 23 files |
| Raw `<svg>` tags in source (all systems combined) | 282 |

Four systems for one job, ranked by consumer-file count: lucide-react (38)
> design-system/icons (24) > ad-hoc inline (23 files, 96 definitions) >
the AGENTS.md-designated location (3). See
`DESIGN-SYSTEM-ARCHITECTURE.md` §5 for what this means.

## 5. Emoji

Comment-stripped, cross-validated between `tokens.mjs` and
`inventory.mjs` (identical regex and methodology deliberately — see
`DESIGN-SYSTEM-ARCHITECTURE.md` §5's note on why two different emoji counts
for the same repo would be its own finding to fix).

| | Count |
|---|---:|
| Total emoji occurrences (comments excluded) | 1,251 |
| — inside `games/` (sanctioned per `AGENTS.md` §8) | 822 |
| — in chrome / everything else | 429 |
| — of the chrome ones, immediately preceded by `aria-hidden` (self-marked decorative) | 38 |
| Distinct emoji glyphs used as iconography | 223 |

**Functional vs. decorative was not exhaustively hand-classified** — see
`DESIGN-SYSTEM-ARCHITECTURE.md` §5 for the reasoning and the top file
concentrations (`AboutPage.tsx` 34, `SettingsPage.tsx` 34,
`PrivacyPolicyPage.tsx` 32, `data.ts` 28). Reported as measured; a
functional/decorative split needs a human reading each site against
`AGENTS.md` §8's actual wording ("no emoji as decorative icons in
**product chrome**"), which this pass flags candidates for rather than
adjudicates.

## 6. Architecture / shared-library adoption

```
node scripts/design-audit/inventory.mjs  +  npm run design:tokens
```

| Directory | Files | Real product consumers |
|---|---:|---|
| `design-system/dls/` | 8 | `SecondaryButton`: 1 (`SettingsPage.tsx`). `PrimaryButton`/`TournamentCTAButton`/`RewardButton`/`DangerButton`: 0. `SURFACES.*`: 5 files. `TYPOGRAPHY.*`: 1 file. `SPACING.*`: **0 files** (a token file with zero consumers). |
| `design-system/premium/` | 14 | `EmptyStateIllustration`: 2-3 files. `SkeletonLoader`: 1 file. `PremiumCard`/`PremiumStatCard`/`PremiumProgressCard`/`PremiumHeroCard`/`RewardRevealModal`/`PremiumErrorState`: **0 files each.** 49 files hand-roll `animate-pulse` loading states instead of using `SkeletonLoader`. |
| `design-system/icons/` | 9 | 24 files — the healthiest-adopted of the three named systems, still well behind `lucide-react`'s 38 |
| `components/bhalyam/` (9 files, incl. `icons.tsx`) | 9 | Home-grown chrome components in active use throughout the app (`GameRoomSheet`, `JoinRoomModal`, `data.ts` catalog, `icons.tsx`) — not one of the three "design-system/" directories, but the one most load-bearing for the actual shipped product |
| **Total files importing anything under `design-system/`** | — | **29 of 583** source files (5.0%) |

## 7. Dual-layout compliance (platform rule, unrelated to design-token work but part of `design:components`)

19 / 19 games have both `*BoardMobile.tsx` and `*BoardDesktop.tsx` — full
compliance with `AGENTS.md` §6's mandatory dual-layout rule. The one
dimension in this baseline that is already at 100%.
