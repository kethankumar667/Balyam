# BHALYAM Design System — Architecture

Discovery pass. **No implementation code was changed to produce this
document** — every claim below is either a direct file/directory
observation or the output of a read-only script under
`scripts/design-audit/`, each named at the point it's used. Companion
documents: [DESIGN-SYSTEM-BASELINE.md](DESIGN-SYSTEM-BASELINE.md) (the full
measured numbers) and `design-system-baseline.json` (the same data,
machine-readable).

Governance loaded per `AGENTS.md` §0: `AGENTS.md` itself, and
`docs/ai/bhalyam-design-system.md`, `docs/ai/ui-ux-standards.md`,
`docs/ai/frontend-standards.md`, `docs/ai/accessibility-standards.md` from
the primary/secondary tiers most relevant to a design-system audit.

---

## 1. The headline finding: three governance documents describe a system that isn't the one shipping

This has to lead the report, not sit in a footnote, because it changes how
every number below should be read.

`docs/ai/ui-ux-standards.md` states as a first principle: *"Zero Ad-Hoc
Styling — Never invent arbitrary hex colors in component markup. All
surfaces, typography, borders, and shadows must be referenced from
`client/src/design-system/dls/` and `client/src/design-system/premium/`."*
`docs/ai/bhalyam-design-system.md` calls those two directories *"the
Reference Implementation"* and states the components in them *"MUST"* be
consumed everywhere. `docs/ai/frontend-standards.md` §3 lists
`design-system/dls, premium` as the mandatory 4th architectural layer every
component belongs to.

Measured reality (`design-system-baseline.json` §`sharedLibraryAdoption`):

| Component the docs mandate | Real product consumers (tests & catalogue page excluded) |
|---|---:|
| `PrimaryButton` | 0 |
| `SecondaryButton` | 1 |
| `TournamentCTAButton` | 0 |
| `RewardButton` | 0 |
| `DangerButton` | 0 |
| `PremiumCard` | 0 |
| `PremiumStatCard` | 0 |
| `PremiumProgressCard` | 0 |
| `PremiumHeroCard` | 0 |
| `RewardRevealModal` | 0 |
| `PremiumErrorState` | 0 |
| `SkeletonLoader` | 1 |
| `EmptyStateIllustration` | 2-3 *(measured twice, two different regex widths — both single digits)* |

Of thirteen components two governance documents name as mandatory, **eleven
have zero adoption in shipped product code**, and the other two have one
consumer each. `client/src/design-system/premium/` — the *"Reference
Implementation"* — is, by direct usage count, close to dead code. The colour
values the docs cite (`#070B14`, `#0E1526` as fixed "Surface 0" / "Surface
1") don't match what `surface-0`/`surface-1` actually resolve to either —
see §3.

**This is not a claim that the documents are worthless.** It is the finding
a baseline audit exists to produce: the *intended* system and the *shipped*
system have diverged, silently, and nothing in the repository currently
measures or flags that gap. Every adoption number in this report and in
`DESIGN-SYSTEM-BASELINE.md` should be read against this — "5.7% token
adoption" is not a system that's 5.7% of the way through a migration, it's a
system whose actual center of gravity is somewhere the governance docs don't
describe.

## 2. What actually exists: three parallel component/token systems, not one

```
client/src/design-system/
├── dls/            8 files  — Buttons, Surfaces, Spacing, Typography,
│                                VisualIdentity, DesignPrinciples, PageBlueprints
├── premium/        14 files — PremiumCard, PremiumStatCard, PremiumProgressCard,
│                                PremiumHeroCard, RewardRevealModal, SkeletonLoader,
│                                EmptyStateIllustration, PremiumErrorState,
│                                colors.ts, gradients.ts, glassmorphism.ts, shadows.ts,
│                                motionTokens.ts
└── icons/          9 files  — AchievementIcons, GameIcons, NavigationIcons,
                                 RankIcons, SocialIcons, StatusIcons,
                                 TournamentIcons, VoiceIcons
```

Three named "systems" (`dls`, `premium`, `icons`), each with its own token
files (`dls/VisualIdentity.ts` + `premium/colors.ts` + `premium/gradients.ts`
independently declare colour), and — separately from all three — the system
that actually drives the shipped product:

```
client/src/index.css        2,746 lines — CSS custom properties, both themes
client/tailwind.config.js     472 lines — theme.extend: colors (238 lines,
                                           by far the largest block),
                                           fontFamily, borderRadius,
                                           boxShadow, backgroundImage,
                                           spacing, scale, blur, zIndex,
                                           keyframes, animation
```

This third system is not named or referenced by any of the three governance
documents read for this audit, despite being what `AppHeader.tsx`,
`AppSidebar.tsx`, `Modal.tsx`, every migrated dialog, and effectively every
page-level component actually imports colour, spacing and radius from. It
is real, it is theme-aware (see §3), and it is the one worth building a
migration plan around — not `dls`/`premium`.

**A fourth, informal system exists too**: 96 one-off `function XIcon()`
components defined inline in 23 different files (QrIcon, CloseIcon,
DoorIcon, KeyholeIcon, ArrowRightIcon, and 91 more), each hand-drawing its
own SVG rather than importing from any of the three named icon locations.
See §5.

## 3. Token architecture — the real one

**Mechanism**: CSS custom properties in `client/src/index.css`, defined once
under bare `:root` (light) and redefined under a dark-mode selector guarded
by `darkMode: ["class", '[data-theme="dark"]']` in `tailwind.config.js`.
`client/src/lib/useTheme.ts` toggles the `data-theme` attribute; this is a
real, working, class-based dark mode — not the media-query-only kind
`AGENTS.md` explicitly forbids.

**Token families actually wired through to Tailwind utilities** (i.e.
usable as `bg-surface-1`, `text-ink-hi`, etc., not just as raw `var()`):

| Family | Utility prefix | Defined | Consumers (product files) |
|---|---|---:|---:|
| Surface scale | `surface-0`…`surface-3` | 4 steps × 2 themes | low — see `DESIGN-SYSTEM-BASELINE.md` §1 |
| Ink scale | `ink-hi`/`mid`/`lo`/`mute` | 4 steps × 2 themes | low |
| Semantic | `success`/`warning`/`danger`/`info` | 4 values, **1 theme only** (no dark override found) | **0** |
| Brand/gold | `brand-*`, `gold-*` | multi-step ramps | present, not separately isolated in this pass |
| BHALYAM palette | `bhalyam.*` (namespaced, per `AGENTS.md` §8) | large ramp: gold, wood, cream, orange, maroon, ludo.{red,green,blue,yellow} | in active use — this is the one namespace the docs and reality agree on |

**A separate, undocumented `--chrome-*` token set** exists (`--chrome-panel`,
`--chrome-ink`, `--chrome-ink-soft`, `--chrome-accent`, `--chrome-border`,
`--chrome-active-bg`, `--chrome-active-ink`, `--chrome-hairline`,
`--chrome-control`, `--chrome-control-hi`), consumed via
`bg-[var(--chrome-panel)]`-style arbitrary-value classes in
`AppHeader.tsx`/`AppSidebar.tsx`. Real, theme-aware, working — and reachable
only through arbitrary-value syntax, which is why it is invisible to a
naive "does this file use a design token" grep (see
`DESIGN-SYSTEM-BASELINE.md` §1 for why this means the true adoption picture
is somewhat better than the headline 5.7%, in ways the tooling has to be
told to look for explicitly).

## 4. Component layer inventory

Per `docs/ai/frontend-standards.md` §3's stated four-layer model, checked
against what's on disk:

| Layer | Docs' description | On disk |
|---|---|---|
| 1. Page Shells | `Room.tsx`, `BhalyamHome.tsx` | Present, `client/src/pages/` — largest files in the repo (`Room.tsx`, `BhalyamHome.tsx` both 1000+ lines) |
| 2. Feature Modules | `features/tournaments`, `features/social` | Present — `features/` also holds `onboarding`, `profile`, `rankings`, `brick-tetris`, `brick-breakout` |
| 3. Per-Game Boards | `*BoardMobile.tsx` / `*BoardDesktop.tsx` | Present, verified 19/19 games have both (`design:components` "Dual-layout compliance") |
| 4. Design System Primitives | `design-system/dls`, `premium` | Present on disk, near-zero adoption — §1 |

**A fifth layer the docs don't name exists and matters more than layer 4**:
shared non-game chrome components living directly under `components/` —
`Modal.tsx`, `AppHeader.tsx`, `AppSidebar.tsx`, `components/bhalyam/*`,
`components/room/*` — which is where real, working, theme-aware, adopted
UI actually lives. A migration plan built only around "adopt `dls`/`premium`
more" would be building toward the less-real of the two systems.

## 5. Icon systems — four, competing

| System | Consumers (files) |
|---|---:|
| `lucide-react` (external library) | 38 |
| `design-system/icons/*` (8 named files, AchievementIcons/GameIcons/etc.) | 24 |
| `components/bhalyam/icons.tsx` (the location `AGENTS.md` §8 names as canonical for new chrome icons) | 3 |
| Inline ad-hoc `function XIcon()`, one per file, no shared definition | 96 occurrences across 23 files |

The location `AGENTS.md` itself names as correct (`components/bhalyam/icons.tsx`)
is the **least**-used of the four. The most common pattern by file count
(lucide-react) is an external dependency the governance docs don't mention
choosing between at all.

**Emoji** (`design-system-baseline.json` §`emoji`, cross-checked against
`tokens.mjs`'s independent count — both agree): 1,251 total occurrences with
comments excluded, 822 inside `games/` (sanctioned by `AGENTS.md` §8's
"deliberately used inside playful in-game UI" carve-out) and 429 in
everything else. `AGENTS.md` §8's actual rule is narrower than "no emoji
outside games" — it says *"No emoji as decorative icons in **product
chrome**"*, which most naturally reads as navigation/controls/toolbars, not
prose copy on a content page. Of the 429: the two highest concentrations are
`AboutPage.tsx` (34) and `PrivacyPolicyPage.tsx` (32) — both long-form
written content, where an emoji is functioning as a bullet-point flourish in
a sentence, a materially different case from an unlabeled emoji standing in
for an icon on an interactive control. `SettingsPage.tsx` (34) and
`data.ts` (28, the game catalog — category glyphs) are worth a closer,
manual look before calling them violations one way or the other; a
structural signal is reported (38 of the 429 sit immediately after
`aria-hidden`, i.e. self-marked decorative by whoever wrote them) but intent
ultimately needs a human reading each site, which this pass didn't do
exhaustively. Reported as counted, not classified.

## 6. Typography architecture

**Font loading**: one `<link>` in `index.html` (per this session's earlier
Typography remediation — previously two separate blocking requests, now
one), 11 distinct families: Poppins (`sans`/`body`), Righteous (`display`),
Caveat (`script`), JetBrains Mono (`mono`), Kalam/Patrick Hand/Architects
Daughter (Hand Cricket notebook skin), Playfair Display (Rummy
`--rm-font-display` only), Fredoka (Ludo token face), Noto Sans Telugu
(language switcher), Nunito (fallback behind Poppins in several SVG text
elements — not a rendering font of its own).

**No typography component or scale enforcement mechanism exists.**
`docs/ai/ui-ux-standards.md` §3 prescribes a fixed scale ("Hero Title:
`text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight`",
etc.) but no component, hook, or lint rule enforces it — it is prose in a
markdown file with no code-level counterpart. Measured signature count:
**430 distinct (size × weight × family) combinations** — see
`DESIGN-SYSTEM-BASELINE.md` §2 for the full breakdown. This is, by a wide
margin, the least consolidated dimension measured in this pass — an order
of magnitude more fragmented than button (22) or card (61) signatures.

## 7. What a migration plan should actually target

Not a recommendation to act on (this pass is measurement-only, per the
request), but the one piece of architectural judgment worth stating
plainly given what §1-§6 found: **the real, adoptable foundation is the
`index.css` + `tailwind.config.js` token layer plus the shared chrome
components already built on it (`Modal.tsx`, `AppHeader.tsx`,
`AppSidebar.tsx`, the `--chrome-*` set)** — not `design-system/dls/` or
`design-system/premium/`, despite those being what the governance
documents currently point to. Any future plan that starts from "increase
`dls`/`premium` adoption" without first reconciling the documents with this
finding will be migrating the product toward the system that isn't the one
actually working.
