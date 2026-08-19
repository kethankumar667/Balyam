# DESIGN-BASELINE.md — BHALYAM Design Baseline Discovery

> **Phase 0 of the BHALYAM Design Execution Audit.**
> Scope: visual design, product experience, design-system maturity, brand consistency, polish.
> Explicitly **not** security, persistence, test coverage or infrastructure. Functional correctness is assumed.
>
> **Method.** Every number below was measured, not estimated. Class-usage counts come from `grep` over
> `client/src`; "does this class render" was answered by compiling `client/tailwind.config.js` with the real
> Tailwind CLI and searching the emitted stylesheet; screens were rendered in headless Chromium (Playwright)
> at 390 / 768 / 1440 px in both themes. Where a measurement has a known blind spot, the blind spot is stated.
>
> Audit date: **2026-08-19** · Branch: `refactor/modernization-architecture` · Commit at start: `a2c20fa`

---

## 0. The headline

BHALYAM does not have *a* design system. It has **two**, plus a documentation layer describing a **third**
that exists nowhere in the code. They disagree about the product's background colour, its typeface, its
elevation model and whether the product is light or dark.

| | System A — "the token layer" | System B — "the DLS" | System C — "the docs" |
|---|---|---|---|
| Lives in | `client/src/index.css` + `client/tailwind.config.js` | `client/src/design-system/` | `docs/ai/bhalyam-design-system.md`, `docs/ai/ui-ux-standards.md` |
| Base surface | `#F8FAFC` light → dark override | `stone-900` / `zinc-900` (near-black, **both** themes) | `#070B14` "Deep Obsidian" (navy-black) |
| Brand accent | `--color-gold-500 #F59E0B`, `bhalyam.gold #E4B128` | `amber-500 #F59E0B` | `#F59E0B` |
| Theme model | Light-first, `[data-theme="dark"]` override | **Dark-only** — the `dark:` value equals the base value | Dark-only |
| Governed by | `AGENTS.md` §8 | Platform Rule 4, UI/UX Standards §1 | itself |
| Adoption | 371 class uses (5%) | 25 of 349 `.tsx` files (7%) | 0 — the palette it names is not in the code |

`AGENTS.md` §8 says design tokens live in `index.css` and `tailwind.config.js`.
`docs/ai/bhalyam-platform-rules.md` Rule 4 says *"All UI colors, typography scales, surface paddings,
button variants, and glowing auras **must** be imported from `client/src/design-system/dls/` and
`client/src/design-system/premium/`."*

Those two mandates are mutually exclusive, and the codebase obeys neither: **95% of colour declarations
use neither system.**

---

## 1. What was read

### 1.1 Governance documents (mandatory loading order, `AGENTS.md` §0)

| # | Document | Read | Design-relevant content |
|---|---|---|---|
| 1 | `docs/ai/bhalyam-domain-knowledge.md` | ✅ | Audience, catalogue taxonomy, 4 game domains |
| 2 | `docs/ai/bhalyam-product-vision.md` | ✅ | 5 Product Tenets — Tenets 1, 2 and 5 are load-bearing for this audit |
| 3 | `docs/ai/bhalyam-platform-rules.md` | ✅ | Laws 3, 4, 5, 6 are design laws |
| 4 | `docs/ai/bhalyam-design-system.md` | ✅ | Token catalogue — **describes a palette not present in the code** |
| 5 | `docs/ai/bhalyam-game-framework.md` | ✅ | 12 mandatory game capabilities |
| 6 | `docs/ai/bhalyam-decision-log.md` | ✅ | ADRs |
| 7 | `docs/ai/antigravity.md` | ✅ | 11-phase thinking framework, multi-persona review |
| 8 | `docs/ai/frontend-standards.md` | ✅ | React 18, dual layouts |
| 9 | `docs/ai/architecture-principles.md` | ✅ | — |
| 10 | `docs/ai/ui-ux-standards.md` | ✅ | 5 Visual Pillars, type scale, 44px rule, state handling, motion |
| 11 | `docs/ai/accessibility-standards.md` | ✅ | WCAG 2.1 AA, focus rings, focus trapping, reduced motion |
| 12–17 | performance / security / testing / review / playbook / prompting | ✅ | Out of audit scope, read for context |
| — | `AGENTS.md` (564 lines) | ✅ | §6 Game Layout Standards, §8 Styling Rules, §13 Accessibility, §16 AI Rules |

**Finding B-01 — the governance layer contradicts itself.** `AGENTS.md` §8 and
`docs/ai/bhalyam-design-system.md` describe different design systems with different base palettes. An
engineer who reads the mandatory documents in the mandated order is told to use the DLS (doc 4, doc 3 Rule 4)
and then told to use the CSS-variable tokens (`AGENTS.md` §8). There is no reconciliation note anywhere.

**Finding B-02 — the documented palette does not exist.** `docs/ai/bhalyam-design-system.md` §1.1 and
`docs/ai/ui-ux-standards.md` §2 specify `#070B14` (Deep Obsidian), `#0E1526` (Elevated Slate) and
`#141C30` (Surface Dark) — a **navy-black** family. The DLS implementation
(`client/src/design-system/dls/VisualIdentity.ts`) uses `#0C0A09` and the stone scale — a **warm neutral-black**
family. Neither `#070B14`, `#0E1526` nor `#141C30` appears anywhere in `client/src`.

**Finding B-03 — `AGENTS.md` §3's project structure is stale.** It lists 9 game folders; there are 21.
It omits `client/src/design-system/`, `features/`, `core/`, `navigation/`, `reliability/`, `seo/`,
`i18n/`, `animations/` entirely — that is where roughly half the design surface now lives. An agent
following §3 to find "the shared UI" will not find the design system.

---

## 2. Scale of the surface under audit

| Measure | Value |
|---|---|
| Client source lines (`.ts` + `.tsx`) | **126,792** |
| Server source lines | 40,683 |
| `.tsx` files | **349** |
| `.ts` files | 278 |
| Stylesheet lines (`.css`) | 4,875 (`index.css` alone: 2,743) |
| Routes registered in `App.tsx` | **43** (30 distinct destinations, 13 aliases) |
| Games with a board | 19 |
| `<button>` elements written by hand | **683** |
| Files containing `style={{ … }}` | 154 (1,616 occurrences) |

This is a large product. The audit's conclusions are about *consistency across* that surface, not about
whether any single screen is well made — several are.

---

## 3. Design token inventory

### 3.1 System A — CSS custom properties (`client/src/index.css`)

Declared on `:root`, overridden under `[data-theme="dark"]`. Surfaced to Tailwind through
`client/tailwind.config.js` as `brand.*`, `gold.*`, `surface.0–3`, `ink.hi|mid|lo|mute`, `player.1–6`,
`success`, `warning`, `danger`, `info`.

| Group | Tokens | Light values |
|---|---|---|
| Brand (felt emerald) | `--color-brand-50…950` | `#ecfdf5` → `#022c22` |
| Secondary (arcade gold) | `--color-gold-400…700` | `#fbbf24` → `#b45309` |
| Surface ladder | `--surface-0…3` | `#f8fafc`, `#ffffff`, `#f1f5f9`, `#e2e8f0` |
| Text ladder | `--text-hi/mid/lo/mute` | `#0f172a`, `#334155`, `#475569`, `#5a6779` |
| Player seats | `--color-player-1…6` | red / blue / purple / amber / teal / pink |
| Semantic | `--color-success/warning/danger/info` | `#22c55e`, `#f59e0b`, `#ef4444`, `#38bdf8` |
| Rims | `--rim-gold`, `--rim-soft` | `#d4a574`, `rgba(15,23,42,.08)` |

This layer is **well built**. `--text-mute` carries a comment recording that it was moved from `#64748b`
(4.30:1) to `#5a6779` (5.19:1) *at the token* so every consumer inherited the fix. That is exactly how a
token system is supposed to behave. It is also, as §5 shows, almost entirely unused.

### 3.2 System A′ — the `bhalyam.*` brand palette (`tailwind.config.js`)

The "treasure-chest" identity: `bhalyam.gold #E4B128`, `bhalyam.wood #6D4323`, `bhalyam.cream #F7E8C4`,
`bhalyam.orange #FF8F00`, `bhalyam.maroon #7B1E2B`, plus `bhalyam.ludo.{red,green,blue,yellow}` and seven
`bg-bhalyam-*` gradients. Well documented in-file, with rationale.

Two further scoped palettes live beside it: `nostalgia.*` (Rummy paper/pen/brass, CSS-variable driven so it
flips for dark) and `hc.*` (Hand Cricket notebook, 11 hard-coded hex values). Both are deliberate and both
carry comments explaining why they are separate. This is the *good* kind of scoping.

### 3.3 System B — the DLS (`client/src/design-system/`)

35 files, 2,337 lines.

```
dls/       VisualIdentity.ts  Typography.ts  Spacing.ts  Surfaces.ts  Buttons.tsx
           DesignPrinciples.ts  PageBlueprints.tsx  index.ts
premium/   colors.ts  gradients.ts  shadows.ts  motionTokens.ts  glassmorphism.ts
           PremiumCard  PremiumStatCard  PremiumProgressCard  PremiumHeroCard
           RewardRevealModal  SkeletonLoader  EmptyStateIllustration  PremiumErrorState
icons/     8 icon families + index
__tests__/ 4 suites
```

Token content: `VISUAL_IDENTITY` (9 colours, 4 auras, 5 radii aliases), `TYPOGRAPHY` (12 composed class
strings), `SPACING` (9-step scale + 7 layout patterns + 3 touch-target tokens), `SURFACES` (9 composed
surfaces), `PREMIUM_RANK_COLORS` (7 tiers × 7 fields), `PREMIUM_RARITY_COLORS` (5), `TOURNAMENT_COLORS` (4),
`PREMIUM_GRADIENTS` (13), `PREMIUM_SHADOWS` (10), `MOTION_TOKENS` (8), `GLASSMORPHISM` (5).

**The `SPACING.touchTarget` block is the best piece of design-system thinking in the repository.** Its
comment records that a browser-measured audit found 60 controls under the WCAG 2.2 24px floor and 47 more
under the product's own 44px bar, diagnoses the cause correctly — *"the rule lived in a document and not in
the design system… A rule you have to remember is a rule that gets missed"* — and converts the rule into a
token backed by a measuring script. Every other token in this folder should have been built the same way.

**Finding B-04 — the DLS is dark-only and therefore breaks the product's default theme.** Every surface
token is written `bg-stone-900/80 dark:bg-zinc-900/80` — the unprefixed (light-theme) value is *also*
near-black. `TYPOGRAPHY` pins `text-stone-100 dark:text-zinc-100` — near-white ink in both themes.

`client/src/lib/useTheme.ts` sets `DEFAULT_THEME = "light"`, with a comment stating the reason:
*"BHALYAM's identity is warm cream paper and gold. First impressions are the one moment the app does not get
to explain itself, so it opens in the palette it was designed in."*

So every screen built on the DLS renders **near-black cards with near-white monospace text, floating on
cream parchment**, for every first-time visitor. This is not a theoretical concern — it is what
`/social`, `/tournaments`, `/leaderboard`, `/profile`, `/design-system` and the two onboarding modals
actually look like today. Screenshots are in `DESIGN-INVENTORY.md`.

---

## 4. What compiles — and what does not

The Tailwind config was compiled with the real CLI and every utility class referenced in `client/src` was
checked against the emitted stylesheet.

**154 utility declarations across the codebase emitted no CSS at all.** They are not typos the reader can
see; they look correct and simply do nothing.

| Class | Uses | Consequence |
|---|---|---|
| `shadow-xs` | 93 | No shadow. Tailwind 3 has no `xs` step (it is a v4 name). Search field, chips, filter pills, card sub-surfaces all render flat. |
| `backdrop-blur-xs` | 32 | No blur. Auth shell, trust sheet, waiting banner lose their glass. |
| `h-4.5` / `w-4.5` | 40 | No size. Icons fall back to intrinsic dimensions. |
| `active:scale-98` | 18 | **No press feedback** — includes the `PLAY NOW` button on every game card. |
| `py-0.2` | 14 | No padding. (A typo for `py-0.5`.) |
| `border-stone-750` / `-850`, `border-zinc-750` / `-850` | 18 | Border **width** set with no colour, so Tailwind preflight's `border-color: #e5e7eb` applies — a **near-white hairline around near-black modals and cards**. |
| `bg-stone-750` | 6 | **The six shimmer bars in `SkeletonLoader` paint nothing.** The primitive that exists so the product never renders a blank loading state, renders blank bars. |
| `w-13` | 7 | No width. Brick Tetris keypad keys fall back to content width — a 44px touch target that is not one. |
| `hover:scale-102` | 6 | No hover response. |
| `duration-250` | 2 | `SURFACES.cardInteractive` and `MOTION_TOKENS.cardHover` — the two tokens defining how a card answers a pointer — have no duration. |
| `z-55`, `z-60` | 3 | No stacking context; falls back to source order. |
| `scale-97`, `scale-115`, `gap-4.5`, `px-4.5`, `left-5.5`, `from-stone-850`, `bg-stone-850` | 6 | Assorted. |

Eleven of these sit inside `client/src/design-system/` itself. **The design system does not compile.**

Verification method, so this can be re-run:

```bash
cd client && npx tailwindcss -i src/index.css -o /tmp/tw.css
grep -c "bg-stone-750" /tmp/tw.css      # 0 before the fix
grep -c "border-stone-800" /tmp/tw.css  # 5 — control, proving the search works
```

**Finding B-05 — the shape scale is non-monotonic.** The config overrides `xs sm md lg xl 2xl` but not
`3xl`, so the ladder compiled as `4 → 6 → 10 → 14 → 20 → 28 → **24**` px. Every surface reaching for the
roundest corner in the system — `SURFACES.cardElevated`, `SURFACES.modalHero`, `arenaHero`,
`battlePassTrack`, and 105 call sites — rendered **tighter** than an ordinary `rounded-2xl` card sitting
inside it. Modals looked sharper-cornered than their own contents.

*(Both B-05 and the 154 dead declarations were fixed in Phase 10 — see
`BHALYAM-DESIGN-REMEDIATION-REPORT.md`. They are recorded here as the baseline.)*

---

## 5. Token adoption — the number that matters

Every colour-bearing utility class in `client/src/**/*.tsx` was classified.

| Class family | Occurrences | Share |
|---|---:|---:|
| **Design tokens** (`ink-*`, `surface-*`, `brand-*`, `gold-*`, `bhalyam-*`, `success`/`warning`/`danger`/`info`) | **371** | **5.2 %** |
| Raw Tailwind palette (`stone-800`, `amber-500`, `slate-900`, …) | 3,981 | 55.8 % |
| Arbitrary hex (`bg-[#E85D04]`, `text-[#4A2508]`, …) | 2,779 | 39.0 % |
| **Total** | **7,131** | |

Alongside those class-based colours: **1,469 distinct 6-digit hex literals** across **6,093 occurrences** in
`.ts`/`.tsx` source, plus 1,616 inline `style={{ … }}` objects in 154 files.

`docs/ai/ui-ux-standards.md` §1.1 opens with: *"Never invent arbitrary hex colors (e.g. `#382914`,
`#992211`) in component markup."* The codebase contains 1,469 of them.

### 5.1 DLS component adoption

| Primitive | Non-DLS consumers |
|---|---:|
| `PrimaryButton` / `SecondaryButton` / `DangerButton` / `TournamentCTAButton` / `RewardButton` | **1** — and that one is `pages/DesignSystemCatalogPage.tsx`, the catalogue page itself |
| `SURFACES.*` | 14 |
| `TYPOGRAPHY.*` | 4 |
| `SPACING.*` | 2 |
| `SkeletonLoader` | 3 |
| `EmptyStateIllustration` | 4 |
| `PremiumErrorState` | **0** |
| Any `design-system` import | 25 of 349 `.tsx` files (7.2 %) |

**Finding B-06 — no production screen uses the design system's buttons.** All 25 consumers are in
`features/` (profile, rankings, social, tournaments, onboarding) plus five `pages/`. The core product —
`BhalyamHome`, `Room`, `GameRoomSheet`, `Chat`, `SettingsPage`, all 19 game boards, the whole auth flow —
imports none of it. The DLS is a parallel library used only by the newest meta-game layer.

**Finding B-07 — Platform Rule 5 (Triple State Guarantee) is unenforced.** `PremiumErrorState` has zero
consumers; `SkeletonLoader` has three; `EmptyStateIllustration` has four. The rule requires all three on
*every* data-bound view. Mitigating: there are **zero** raw `"Loading…"` strings, so loading states are
hand-rolled rather than absent.

---

## 6. Typography inventory

### 6.1 Fonts actually loaded

Eleven families, requested by **two separate render-blocking stylesheets**:

* `client/index.html` → Poppins, **Righteous**, Caveat, Kalam, Patrick Hand, Architects Daughter, Playfair Display
* `client/src/index.css` line 1 `@import` → Fredoka, Kalam, Patrick Hand, Nunito, JetBrains Mono, Poppins, Noto Sans Telugu, Caveat

Poppins, Caveat, Kalam and Patrick Hand are requested **twice**, from two different documents.

### 6.2 Fonts actually rendered (measured in Chromium, 20 routes)

| Family | Routes where it renders |
|---|---:|
| **Nunito** | 20 / 20 |
| **Righteous** | 20 / 20 |
| Poppins | 13 / 20 |
| JetBrains Mono | 12 / 20 |
| Caveat | 10 / 20 |

**Finding B-08 — the body typeface is undecided.** `tailwind.config.js` declares `font-sans` and
`font-body` as **Poppins**; `index.css` line 282 sets `body { font-family: 'Nunito', … }`. Both render, on
the same pages, at similar weights. Nunito is the default; Poppins appears wherever someone wrote
`font-sans`. Two humanist sans faces mixed within a single view is the single most common tell of an
un-art-directed interface.

### 6.3 Scale compliance

| | Occurrences |
|---|---:|
| Tailwind scale steps (`text-xs` … `text-9xl`) | 1,605 |
| **Arbitrary sizes** (`text-[10px]`, `text-[12.5px]`, …) | **1,564** |
| Distinct arbitrary sizes | **51**, including `text-[9.5px]`, `text-[10.5px]`, `text-[11.5px]`, `text-[12.5px]`, `text-[13.5px]` |

**49.4 % of all font-size declarations are off-scale.** `docs/ai/ui-ux-standards.md` §3 defines a
seven-step type scale; `TYPOGRAPHY.ts` defines twelve composed roles used in four files.

### 6.4 Weight distribution

| Weight | Occurrences |
|---|---:|
| `font-bold` (700) | 1,041 |
| `font-black` (900) | 729 |
| `font-extrabold` (800) | 347 |
| `font-semibold` (600) | 171 |
| `font-medium` (500) | 80 |
| `font-normal` (400) | 16 |

**88.8 % of weight declarations are 700 or heavier; 0.7 % are regular.** When everything is bold, nothing
is emphasised. This is the mechanical reason the product's screens feel loud and flat at the same time.

---

## 7. Layout, elevation, shape and depth

### 7.1 Shape

| Radius | Uses |
|---|---:|
| `rounded-full` | 694 |
| `rounded-xl` (20 px) | 453 |
| `rounded-2xl` (28 px) | 386 |
| `rounded-lg` (14 px) | 230 |
| `rounded-3xl` | 105 |
| `rounded-md` (10 px) | 65 |
| `rounded-sm` / `rounded-xs` | 22 |
| `rounded-pill` | 11 — **exact duplicate of `rounded-full` (9999 px)** |
| Arbitrary (`rounded-[26px]`, `[32px]`, `[36px]`, `[22%]`, `[1.5vh]`, …) | 14 distinct |

### 7.2 Elevation

| | Occurrences |
|---|---:|
| Raw Tailwind (`shadow-sm/md/lg/xl/2xl/inner`) | 541 |
| `shadow-xs` (**compiled to nothing**) | 93 |
| Designed ladder `shadow-lift-1/2/3` | **7** |
| Distinct one-off `shadow-[…]` values | **113** |

There is a designed three-step elevation ladder in the config. It is used seven times. There are 113
bespoke shadows.

### 7.3 Stacking

25 distinct z-index values, including `z-[46]`, `z-[55]`, `z-[58]`, `z-[59]`, `z-[65]`, `z-[71]`, `z-[90]`,
`z-[120]`, `z-[200]`, `z-[300]`. Values like 58, 59 and 46 are the signature of "I need to sit just above
that other thing" — there is no layer scale, only an escalation history.

### 7.4 Spacing

80 distinct arbitrary spacing values. Several are legitimate and well-reasoned
(`pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]` appears three times and is exactly right); others
(`p-[18%]`, `gap-[2vh]`, `py-[1.4vh]`, `px-[3vw]`) are viewport-relative spacing that will not hold across
the 320–1440 px range the platform commits to.

`index.css` contains **137 `!important` declarations**. That is a cascade the design system has lost
control of.

---

## 8. Icon systems

Four, in parallel:

| System | Files / scope | Consumers |
|---|---|---:|
| `client/src/design-system/icons/` | 8 families (Achievement, Game, Navigation, Rank, Social, Status, Tournament, Voice) | 18 |
| `client/src/components/bhalyam/icons.tsx` | brand stroke icons | 7 |
| `lucide-react` | npm | 30 |
| **Emoji glyphs** | **219 distinct** | 387 occurrences in product chrome, 790 in games |

`AGENTS.md` §8 states: *"No emoji as decorative icons in product chrome… For new neutral UI chrome, prefer
SVGs in `components/bhalyam/icons.tsx`."* The in-room shell — the most-used screen in the product — is
labelled entirely with emoji: ✏️ Name this table · 🚪 Leave · 📷 QR · 📸 Snapshot · 📋 Copy Code ·
🔗 Share · ⚙️ · 💬 Chat · 🎙 Voice · ⚡ I'm Ready · ▶ Start Game · ✈ Send.

Emoji render from the platform's own font, so BHALYAM's iconography is a **different set of pictures on
Windows, Android and iOS**. An icon system that changes per device is not an icon system.

---

## 9. Theme system

`client/src/lib/useTheme.ts` — `data-theme` attribute on `<html>`, stored under `bhalyam.theme`, stamped
before React mounts (`main.tsx`) to avoid a flash. Default **light**, deliberately, with the rationale in a
comment. This is correctly built.

The problem is not the mechanism. It is that the DLS, `features/*` and every `stone-*`/`zinc-*` class
ignore it.

---

## 10. Explicit vs implicit design system

**Explicit** (documented, named, intended):
`index.css` custom properties · `tailwind.config.js` `brand`/`gold`/`surface`/`ink`/`player`/`bhalyam`/
`nostalgia`/`hc` · `design-system/dls` + `premium` · `docs/ai/ui-ux-standards.md` type scale and pillars.

**Implicit** (what the product is actually built out of):

1. **Warm cream + gold "chest"** — the lounge, `/games`, `/about`, `/privacy`, auth, room lobby.
   `#FFFDF8`, `#F7E8C4`, `#E85D04`, `#EA5A1F`, `#E4B128`, `#4A2508`. Best-executed world in the product.
2. **Stone/amber "esports"** — the DLS, `features/*`, `/social`, `/tournaments`, `/leaderboard`,
   onboarding. `#0C0A09`, stone-900, `#F59E0B`, JetBrains Mono body copy.
3. **Navy slate** — the shared `GameTutorial` modal and several room dialogs. `#16223B`, `#2B3550`, `#0F172A`.
4. **Notebook / ruled paper** — Hand Cricket, RPS, Star Game. `#F5E9C4`, `#1a2952`, Kalam / Patrick Hand /
   Architects Daughter.
5. **Game Boy DMG green** — the Nokia retro arcade. `#0F380F`, `#306230`, `#8BAC0F`, `#9BBC0F`.
6. **Per-game boards** — Ludo gold/print, UNO stadium, Rummy felt, each with its own wordmark and chrome.

Worlds 4, 5 and 6 are **legitimate**: a retro Nokia game *should* look like a Nokia game, and `AGENTS.md`
sanctions playful in-game treatment. Worlds 1, 2 and 3 are **not** — they are three answers to the same
question ("what does a BHALYAM page look like?") shipping side by side, and the seam between world 1 and
world 2 is visible on five production screens.

---

## 11. Areas bypassing tokens entirely

Ranked by arbitrary-hex density:

| Area | Signature colours | Note |
|---|---|---|
| `games/handcricket/*` (9,457 lines) | `#5C3717`, `#4A2508`, `#EEDBCA`, `#7A5B3E` | Self-contained notebook skin; scoped via `hc.*` — acceptable |
| `pages/BhalyamHome.tsx` (2,563 lines) | `#E85D04`, `#EA5A1F`, `#25D366`, `#10B981` | The landing page. Should be the most token-compliant file; is among the least |
| `games/uno/*` | `#00F0FF`, stadium palette | In-game — acceptable |
| `features/brick-*` | `#306230`, `#8BAC0F`, `#0F380F` | DMG palette — deliberate |
| `components/auth/*`, `pages/auth/*` | `#FFFDF8`, `#E6D4B5`, `#2B3550` | Chrome. Should use tokens |
| `components/room/*` | `#EA5A1F`, mixed | Chrome. Should use tokens |

---

## 12. Baseline scorecard

| Dimension | Score /10 | Evidence |
|---|---:|---|
| Token architecture (design) | 7 | `index.css` ladder is well made; `SPACING.touchTarget` is exemplary |
| Token adoption | **1** | 5.2 % |
| Token integrity (does it compile) | **3** | 154 dead declarations, 11 inside the DLS; non-monotonic radius scale |
| Documentation accuracy | **2** | Documented palette absent from code; two mandates contradict; `AGENTS.md` §3 stale |
| Component library adoption | **1** | `PrimaryButton` used by the catalogue page only |
| Typography discipline | **2** | 51 arbitrary sizes, 49 % off-scale, 89 % ≥700 weight, two body faces |
| Colour discipline | **1** | 1,469 distinct hex literals |
| Elevation discipline | **2** | 113 one-off shadows vs a 3-step ladder used 7 times |
| Shape discipline | **4** | Ladder was inverted at the top; `rounded-pill` duplicates `rounded-full` |
| Theme system design | 8 | Correctly built, correctly defaulted, correctly commented |
| Theme system observance | **2** | DLS + `features/*` are dark-only; light is the default |
| Responsive architecture | **9** | 19/19 games ship real dual layouts; zero horizontal overflow at 390/768/1440 |

**Baseline design-system maturity: 2 / 10** — *"Documented, partially implemented, not adopted, partially
non-functional."*

---

## 13. What is genuinely good

Stated plainly, because the rest of this audit is critical and the reader should be able to trust that the
criticism is calibrated.

1. **Dual layouts: 19 of 19 games** ship `<Game>BoardMobile.tsx` *and* `<Game>BoardDesktop.tsx`. Platform
   Rule 3 is the only design law in the repository with 100 % compliance. That is unusual and hard-won.
2. **Zero horizontal overflow** at 390, 768 and 1440 px across 20 audited routes. Zero console errors on
   every route captured.
3. **Zero raw `"Loading…"` strings.**
4. **`SPACING.touchTarget`** — a rule converted into a token and backed by a measuring script, with the
   reasoning recorded. This is the standard the rest of the system should be held to.
5. **The `--text-mute` fix** — a contrast failure repaired at the token so every consumer inherited it.
6. **The illustration library** — game-card renders, the "Rainy Evening" / "Sunday Afternoon" mood scenes,
   the auth-screen artwork. Genuinely distinctive, genuinely Indian, genuinely nostalgic. The strongest
   brand asset the product owns.
7. **The Ludo board** — flat print design, glossy chips, big tactile dice. Reads as a real game.
8. **The room-code card** — dashed ticket border, letter-spaced code, tap-to-copy. Confident and specific.
9. **i18n plumbing** — 6 Indian locales at 100 % of the declared catalogue, plural rules via
   `Intl.PluralRules`, translated keys typed as `Partial<typeof en>` so a typo is a compile error.
   (The catalogue is only 33 keys — see `DESIGN-DEBT-REGISTER.md` UX-11 — but the machinery is right.)

---

## 14. Method, limits and reproducibility

**Tooling.** Tailwind CLI 3 (`npx tailwindcss -i src/index.css -o …`) for compiled-CSS verification;
Playwright/Chromium for rendering, screenshots and DOM measurement; `axe-core` 4 for automated WCAG rules;
a purpose-written compositing contrast probe for text-on-surface ratios.

**Known limits of the contrast probe.** It walks ancestor `background-color`s and composites alpha, so it
resolves translucent-over-solid correctly. It **skips** any element whose nearest painted ancestor uses a
`background-image` (gradient or texture), and it **skips** elements whose background is painted by an
absolutely-positioned sibling. Both skips avoid false positives at the cost of false negatives — the real
failure count is **higher** than the 17 reported in `DESIGN-SYSTEM-AUDIT.md` §2.6, not lower. Emoji are
excluded, because CSS `color` does not apply to colour glyphs and a ratio computed from it is meaningless.

**Known limit of the axe pass.** `axe-core` reports `color-contrast` as *incomplete* rather than *violation*
when it cannot resolve a background — which is precisely the translucent-over-texture case that produces the
worst failures on `/social` and `/tournaments`. The axe numbers in this audit therefore understate contrast
debt and are reported alongside the direct measurements, not instead of them.

**Not audited.** Real devices (Chromium at CSS viewport sizes only — no WebKit, no Gecko, no hardware);
iOS Safari address-bar behaviour; Android keyboard insets; screen-reader announcement quality; motion
performance on mid-range Android; anything behind authentication (`/profile`, `/settings`, `/admin` — all
redirect for guests).

---

*Next: `DESIGN-INVENTORY.md` — every reachable screen, captured and rated.*
