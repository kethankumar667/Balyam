# DESIGN-SYSTEM-AUDIT.md — Token-by-Token Audit

> **Phase 2 of the BHALYAM Design Execution Audit.** Colour, typography, spacing, elevation, shape.
>
> **Method.** Every number is produced by a script over `client/src` (349 `.tsx`, 278 `.ts`, 4,875 CSS lines)
> or by rendering in Chromium. Scripts are reproduced in §8 so each figure can be re-derived.
>
> Reads on: `DESIGN-BASELINE.md` (Phase 0) · feeds: `VISUAL-IDENTITY-RECOMMENDATION.md`,
> `DESIGN-DEBT-REGISTER.md`.
>
> Audit date **2026-08-19** · branch `refactor/modernization-architecture`.

---

## 0. The finding that explains every other finding

BHALYAM's token layer is **cool slate**. BHALYAM's product is **warm cream**.

| | Declared token | What the screen actually paints |
|---|---|---|
| Page ground, light | `--surface-0: #f8fafc` (slate-50, hue 210°) | `#FCF8EF` on `/`, `#FFFDF8` on `/about`, `#FFF9EE` in the room sheet (hue ~40°) |
| Card, light | `--surface-1: #ffffff` | `#FFF9EE`, `#FFF4E0`, `#FCF8EF`, `#FFF8E7`, … |
| Body ink | `--text-hi: #0f172a` (blue-black) | `#4A2508`, `#5C3717` (warm brown), 93 and 98 uses |
| Rim | `--rim-soft: rgba(15,23,42,.08)` (blue-grey) | `#EEDBCA`, `#E6D4B5`, `#ECD9BA` (tan) |

`body { background: var(--surface-0) }` is honoured — and then **318 hand-written warm hexes paint over it**
on every page a user actually visits.

This reframes the 5.2 % token-adoption figure in `DESIGN-BASELINE.md` §5. It is not developer laziness. **A
developer who used `bg-surface-1` on the lounge would have shipped a cool grey card onto warm parchment and
it would have looked broken.** The tokens were skipped because using them produces the wrong result.

Any remediation that only says "use the tokens" will fail for the same reason it has already failed 2,919
times. **The tokens have to become warm first.** That is what `VISUAL-IDENTITY-RECOMMENDATION.md` does.

---

## 1. Colours

### 1.1 Raw counts

| Measure | Value |
|---|---:|
| Distinct 6-digit hex literals in `client/src` (incl. CSS) | **1,560** |
| Occurrences of those literals | 6,093 |
| Arbitrary colour classes `-[#…]` in `client/src` (`.ts`/`.tsx`/`.css`) | **2,919** |
| Near-duplicate clusters (RGB distance < 12) | **237** |
| Colours living inside a near-duplicate cluster | **1,194 of 1,560 (76.5 %)** |
| Inline `style={{ … }}` objects | 1,616 across 154 files |

**76.5 % of the colours in this product are within a rounding error of another colour in the same product.**
That is the numeric definition of palette drift.

### 1.2 Duplicates and near-duplicates — the seven worst clusters

Distance is Euclidean in RGB; anything under ~12 is invisible side by side and indistinguishable when
separated by a page fold.

| # | Family | Distinct values | Total uses | Worst offenders |
|---:|---|---:|---:|---|
| 1 | **Navy-black** (dark ground) | **54** | 232 | `#0F172A`(54) `#131926`(30) `#101728`(12) `#141C2E`(12) `#0E1526`(11) … 49 more |
| 2 | **Cream / parchment** (light ground) | **39** | 231 | `#FFF9EE`(26) `#FCF8EF`(23) `#FFF9F0`(22) `#FFF8E7`(16) `#FAF4E6`(11) … |
| 3 | **Tan / card rim** | **34** | 217 | `#EEDBCA`(87) `#F2E3C6`(19) `#EEDCC2`(13) `#F2E4CB`(6) … |
| 4 | **Wheat / board tan** | **33** | 200 | `#E6D4B5`(60) `#ECD9BA`(45) `#E8D8BE`(38) `#E6D4B7`(16) … |
| 5 | **Warm white** | 11 | 267 | `#FFFFFF`(116) `#FFFDF8`(62) `#FFFDF6`(22) `#FFFDF5`(19) `#FFFDF7`(5) `#FFFDF9`(4) `#FFFDF4`(1) |
| 6 | **Slate panel** | **30** | 172 | `#1E293B`(48) `#16223B`(41) `#1E2738`(16) `#182234`(13) `#182238`(12) … |
| 7 | **Sand / cream-2** | **41** | 141 | `#FFF4E0`(21) `#FAF2DF`(13) `#FAF3E0`(8) `#FBF5E0`(8) `#FFF3E3`(8) … |

Cluster 5 is the most telling. There are **seven** values between `#FFFDF4` and `#FFFDF9` — a span of five
units on one channel, which no human eye resolves and no design decision motivated. They are the fossil
record of seven separate people (or seven separate sessions) each typing "a warm white".

Named-colour duplicates in the same spirit:

* `#E85D04` (112 uses) and `#EA580C` (17) — the brand orange, twice, 4 units apart.
* `#5C3717` (98) vs `#5C3D1E`, `#5C3B1E`, `#5C3A1A`, `#5C361E`, `#5A3418`, `#5A3B16`, `#5D3819`, `#5A3714` — the
  primary warm ink has **nine** spellings.
* `#4A2508` (93) vs `#422006`, `#4A1B0E`, `#452712`.
* `#7A5B3E` (74) vs `#7A5E45`, `#78593A`, `#7E653F`, `#7A5C3A`.

### 1.3 Conflicting colours — three collisions in the *declared* system

These are not drift. These are defects in the token file itself.

| # | Collision | Values | Consequence |
|---:|---|---|---|
| **C-1** | `--color-warning` **is** the brand accent | `--color-warning: #f59e0b` · `--color-gold-500: #f59e0b` · Tailwind `amber-500: #f59e0b` — **1,276 uses** | A warning state is *pixel-identical* to ordinary brand chrome. There is no colour in this system that means "caution" and only "caution". |
| **C-2** | Two greens, both semantic | `--color-brand-500: #10b981` (emerald) vs `--color-success: #22c55e` (green-500), ΔE ≈ 8 | The **brand** colour and the **success** colour are the same colour to a user. A brand-coloured card reads as a success state; a genuine success reads as decoration. |
| **C-3** | Cool token ladder on a warm product | §0 | Drives 2,919 arbitrary overrides. |

C-1 and C-2 together mean **the semantic layer cannot signal anything**, which is precisely why it is
unused (§1.5).

### 1.4 Inaccessible combinations — measured, not inferred

Ratios computed in Chromium with alpha compositing over the real painted ancestor.

**Like for like.** Both columns below are the *same* probe over the *same* 48 renders (12 routes × mobile +
desktop × light + dark), with emoji excluded and gradient/painted-sibling backgrounds skipped. An earlier
unfiltered run reported 141 failing nodes and 26 colour pairs; that run counted emoji glyphs, to which CSS
`color` does not apply, so it is not comparable and is not used here.

| | Before Phase 10 | After Phase 10 |
|---|---:|---:|
| Failing text nodes | **83** | **67** |
| Distinct failing colour pairs | **14** | **12** |
| Distinct failing text + colour pairs | **17** | **15** |

Phase 10 removed the two worst — white on `#25D366` (1.98:1) and white on `#10B981` (2.54:1), the two
primary CTAs on the lounge. The twelve colour pairs that survive, worst first:

| Ratio | Req | Foreground | Background | Where |
|---:|---:|---|---|---|
| **3.04** | 4.5 | `#EA580C` orange-600 | `#F5ECE0` | "🔥 3x Streak" chip — `/` |
| **3.13** | 4.5 | `#D97706` amber-600 | `#FFFDF8` | "OUR STORY" eyebrow — `/about` |
| **3.24** | 4.5 | `#E85D04` | `#FFF5E6` | "Overview" nav — `/privacy`, both themes |
| **3.33** | 4.5 | `#EA5A1F` | `#FFF8EE` | "🎯 Next Achievement" — `/` |
| **3.44** | 4.5 | `#E85D04` | `#FFFDF6` | "Know more →" ×2 — `/privacy`, both themes |
| **3.50** | 4.5 | `#FFFFFF` | `#E85D04` | "Subscribe" button — `/` |
| **3.58** | 4.5 | `#E54D0D` | `#FFF4E4` | "Game not found" — 404 |
| **3.77** | 4.5 | `#FFFFFF` | `#059669` | "LIVE FEED" badge — `/` |
| **3.77** | 4.5 | `#713F12` | `#D5A40C` | pull-quote — `/about` **dark** |
| **3.88** | 4.5 | `#8C7A6B` | `#FCF8EF` | "Last played 2 hours ago" — `/` |
| **4.08** | 4.5 | `#B45309` amber-700 | `#F9E5BF` | "Guest" pill — header, every page |
| **4.29** | 4.5 | `#8C6D4F` | `#FAF3E0` | "2026" footer — `/privacy` |

**The pattern is one colour used two ways.** `#E85D04` at 112 uses is the brand orange. As a *fill* behind
white text it gives 3.50:1; as *ink* on cream it gives 3.24:1. It fails in both directions because it sits
in the middle of the luminance range — the one place a colour can be neither a light nor a dark. Nine of the
twelve failures are this single colour or a near-duplicate of it (`#EA580C`, `#EA5A1F`, `#E54D0D`).

This is a **palette structure defect, not twelve styling mistakes.** A palette that offers exactly one
orange, sitting at the luminance midpoint, forces every designer to choose between failing as ink and
failing as fill. `VISUAL-IDENTITY-RECOMMENDATION.md` §2 resolves it by shipping the orange as a *ramp* with
a designated ink step and a designated fill step, so neither choice is available by accident.

### 1.5 Unused colours — the whole semantic layer

| Token | Declared | Uses in `client/src` |
|---|---|---:|
| `bg/text/border-success` | `#22c55e` | **0** |
| `bg/text/border-warning` | `#f59e0b` | **0** |
| `bg/text/border-danger` | `#ef4444` | **0** |
| `bg/text/border-info` | `#38bdf8` | **0** |
| `shadow-rim-gold` | designed | **0** |
| `--paper-ink`, `--paper-ink-soft`, `--auth-hairline`, `--auth-bad-bg`, `--auth-bad-edge`, `--auth-bad-ink`, `--room-inset`, `--room-inset-edge`, `--room-chip-hover` | 9 CSS vars | **0** (neither `var()`-referenced nor mapped to Tailwind) |

Meanwhile the *meanings* those tokens exist to carry are expressed 1,906 times in raw palette classes:

| Meaning | Raw classes carrying it |
|---|---:|
| success / positive | `green-*`, `emerald-*` — **382** |
| danger / negative | `red-*`, `rose-*` — **294** |
| warning / attention | `yellow-*`, `amber-*` — **1,141** |
| info / neutral | `blue-*`, `sky-*`, `cyan-*` — **89** |

**Four semantic tokens exist. Zero are used. 1,906 hand-picked substitutes are.** A semantic layer with no
consumers is not a design system feature; it is a comment.

### 1.6 Token-family adoption

| Family | Uses | Share of the 6,352 counted here |
|---|---:|---:|
| Arbitrary `-[#hex]` | 2,919 | 40.9 % |
| `amber-*` | 1,276 | 17.9 % |
| `stone-*` | 757 | 10.6 % |
| `zinc-*` | 523 | 7.3 % |
| `slate-*` | 476 | 6.7 % |
| `bhalyam-*` (brand palette) | 156 | 2.2 % |
| `text-ink-*` | 96 | 1.3 % |
| `bg-surface-*` | 75 | 1.1 % |
| `border-surface-rim` | 52 | 0.7 % |
| `brand-*` | 11 | 0.2 % |
| `gold-*` | 11 | 0.2 % |

`amber-*` at 1,276 is **the real brand token of this product** — 116× more used than `gold-*`, which is the
token that officially means the same thing.

### 1.7 Gradients — smaller than expected, and worth saying so

| | |
|---|---:|
| `bg-gradient-to-*` occurrences | **163** |
| Of those, with **inline hex** stops (`from-[#…]`) | 82 |
| Named gradient tokens in config (`bg-bhalyam-*`) | 7 |
| `PREMIUM_GRADIENTS` entries in the DLS | 13 |

Gradients were expected to be a major drift source and **are not**. 163 uses across 349 components is
restrained, and roughly half draw from named ramps. Half do use inline hex stops — which inherits the
1,560-value problem from §1.2 — but this is a hundred-line fix, not a thousand-line one, and it is ranked
accordingly in `DESIGN-DEBT-REGISTER.md` (MED-08, not HIGH).

---

## 2. Typography

### 2.1 Families

Eleven families across **two render-blocking stylesheets**, four of them requested twice
(`client/index.html` and `client/src/index.css:1`). Measured to actually render on ≥ 10 of 20 routes:
Nunito (20/20), Righteous (20/20), Poppins (13/20), JetBrains Mono (12/20), Caveat (10/20).

**T-1 — the body face is undecided.** `tailwind.config.js:166` declares `font-body: Poppins`;
`index.css:282` sets `body { font-family: 'Nunito' }`. Both render on the same page. Two humanist sans
faces inside one view is the most common single tell of an un-art-directed interface, and it is present on
13 of 20 routes.

**T-2 — JetBrains Mono is body copy on 12 routes.** `TYPOGRAPHY.ts` composes it into the DLS text roles,
so every `features/*` screen sets prose in a monospace face intended for code.

### 2.2 Scale

| | Occurrences |
|---|---:|
| On-scale (`text-xs` … `text-9xl`) | 1,605 |
| **Arbitrary** (`text-[10px]`, `text-[12.5px]`, …) | **1,564** |
| Distinct arbitrary sizes | **51** |

**49.4 % of font-size declarations are off-scale.** The distinct set includes `text-[9.5px]`,
`text-[10.5px]`, `text-[11.5px]`, `text-[12.5px]`, `text-[13.5px]` — half-pixel steps that no scale
motivates and no rendering engine distinguishes reliably at 1× DPR.

Anything under 12px is also a legibility problem independent of contrast: `text-[9.5px]` (the "Guest" pill,
on every page) is below the smallest size any accessibility guidance endorses.

### 2.3 Weight

| Weight | Uses | Share |
|---|---:|---:|
| `font-bold` 700 | 1,041 | 44.4 % |
| `font-black` 900 | 729 | 31.1 % |
| `font-extrabold` 800 | 347 | 14.8 % |
| `font-semibold` 600 | 171 | 7.3 % |
| `font-medium` 500 | 80 | 3.4 % |
| `font-normal` 400 | 16 | **0.7 %** |

**88.8 % of weight declarations are ≥ 700.** Emphasis is a *contrast* mechanism: it works only when
surrounded by non-emphasis. With 0.7 % regular text there is nothing for bold to be bolder than, which is
the mechanical reason BHALYAM's screens read as simultaneously loud and flat. It also interacts with §1.4:
heavy weight at 10–12 px is exactly the combination that makes low contrast unreadable rather than merely
sub-standard.

### 2.4 Line height and case

* `leading-*` appears **350** times — `leading-tight` 114, `leading-relaxed` 70. Tight leading on
  multi-line paragraph copy (`/about`, `/privacy`) compresses body text below comfortable reading, and
  those two pages are the ones carrying the most prose.
* `uppercase` appears **605** times against **316** `tracking-wide`/`-wider`. Uppercase + heavy weight +
  letterspacing + 10 px is the house style for *every* label in the product, which is why an eyebrow, a
  badge, a tab and a button are typographically indistinguishable — see
  `COMPONENT-CONSISTENCY-REPORT.md` §5.

---

## 3. Spacing

### 3.1 The scale is largely respected

This is the **best-behaved dimension in the system** and deserves saying plainly:

| | Occurrences |
|---|---:|
| On-scale padding/margin utilities | **4,120** |
| Arbitrary `p-[…]` / `m-[…]` | **32** (21 distinct) |
| Arbitrary `gap-[…]` | **7** (6 distinct) |

**Arbitrary spacing is 0.9 % of all spacing declarations.** Compare colour, where arbitrary values are
40.9 %. Twelve of the 32 are `max(…, env(safe-area-inset-*))` — genuinely correct, not drift.

### 3.2 What is left

| Value | Uses | Verdict |
|---|---:|---|
| `env(safe-area-inset-*)` wrappers | 12 | **Correct.** Keep. |
| `18px` | 4 | Should be the (now declared) `4.5` step. |
| `52px` | 1 | Should be the `13` step. |
| `2vh`, `8%`, `1.4vh`, `3vw`, `18%` | 5 | **Wrong.** Viewport-relative spacing does not hold across 320–1440 px; at 320 × 568 `gap-[2vh]` is 11 px and at 1440 × 900 it is 18 px, so the same layout is tighter on the device with less room. |

### 3.3 Density — measured as rhythm variance per page

Distinct `gap-*` / `space-y-*` steps written in each page component:

| Page | Distinct steps | Values (uses) | Verdict |
|---|---:|---|---|
| `/` lounge | **9** | 2(45) 1.5(18) 3(16) 4(9) 2.5(7) 5(5) 1(4) 8(2) 3.5(1) | Nine rhythms on one page. No vertical grid — the page never repeats a spacing decision long enough to become one. |
| `/about` | 9 | 1.5(9) 2(6) 6(4) 4(3) 7(2) 8(2) 2.5(2) 3.5(1) 0.5(1) | Nine too, **but the large steps carry the sections** (6, 7, 8 = 24–32 px), so the page still breathes |
| `/games` | 7 | 1.5, 2, 3, 3.5, 4, 5, 6 | Balanced |
| `/tournaments` | 4 | 2(2) 4(2) 6(1) 3(1) | Consistent |
| `/social` | **3** | 1.5(4) 2(3) 4(1) | **Crowded — the largest gap on the page is `gap-4` (16 px).** Nothing separates sections from items |
| `/leaderboard` | 3 | 2(2) 6(1) 4(1) | Consistent |

Two distinct failure modes, not one:

* `/` is **noisy** — nine competing rhythms, four of them (`1`, `1.5`, `2`, `2.5`) within 6 px of each other.
* `/social` is **airless** — disciplined, but the entire page lives between 6 px and 16 px, so section
  boundaries never read as boundaries.

Consistency alone is not the goal; `/social` is the most internally consistent page in this table and the
worst to look at.

---

## 4. Elevation

| | Value |
|---|---:|
| Designed ladder in config | `shadow-lift-1`, `-2`, `-3`, `rim-gold` |
| Uses of `lift-1/2/3` | **7** |
| Uses of `rim-gold` | **0** |
| Raw Tailwind `shadow-sm…2xl/inner` | 541 |
| `shadow-xs` (compiled to nothing before Phase 10) | 93 |
| **One-off `shadow-[…]`** | **168 occurrences, 132 distinct** |

**132 distinct shadows for a product with, at most, four elevation levels** (flat / raised card / sticky bar
/ modal). Sample of what "the same elevation" means today:

```
shadow-[0_4px_16px_rgba(74,44,22,0.08),inset_0_1px_2px_rgba(255,255,255,0.9)]
shadow-[0_4px_14px_rgba(74,44,22,0.10)]
shadow-[0_6px_20px_rgba(74,44,22,0.10)]
shadow-[0_8px_24px_rgba(74,44,22,0.12)]
shadow-[0_2px_10px_rgba(0,0,0,0.06)]
```

Five values, one intent, four different light sources. There is no elevation *hierarchy* because there is no
agreement on which of these is higher than which.

**E-1 — modals and cards do not agree on depth.** Backdrop treatments across the 82 overlays:
`bg-black/` at **15 distinct opacities** (80 % ×23, 60 % ×19, 30 % ×16, 50 % ×13, 40 % ×13, 5 %, 70 %, 45 %,
20 %, 10 %, 75 %, 85 %, 55 %, 15 %, 90 %) and **six** blur steps (`md` ×42, `xs` ×32, `sm` ×26, `xl` ×9,
`lg` ×3, `2xs` ×1). `backdrop-blur-xs` and `-2xs` compiled to nothing before Phase 10, so 33 of those
overlays had no blur at all.

Two modals opened one after another — the consent sheet then the welcome modal, which is exactly what a
first-time visitor sees — dim the page by **different amounts** and blur it by different radii.

---

## 5. Shape

| Radius | Uses |
|---|---:|
| `rounded-full` | 697 |
| `rounded-xl` (20 px) | 455 |
| `rounded-2xl` (28 px) | 391 |
| `rounded-lg` (14 px) | 231 |
| `rounded-3xl` (32 px, **was 24 px**) | 110 |
| `rounded-md` (10 px) | 65 |
| `rounded-pill` (9999 px) | 11 |
| Arbitrary `rounded-[…]` | 43 |

**S-1 — the ladder was non-monotonic (fixed in Phase 10).** The config overrode `xs sm md lg xl 2xl` but
not `3xl`, so the scale compiled `4 → 6 → 10 → 14 → 20 → 28 → **24**`. Every surface asking for the
roundest corner — modals, `SURFACES.cardElevated`, `arenaHero`, 110 call sites — rendered **tighter** than
an ordinary card nested inside it. Now 32 px.

**S-2 — `rounded-pill` is an exact alias of `rounded-full`.** Two names, one value (9999 px), 708 combined
uses. Nothing distinguishes when to use which, so both appear on sibling elements.

**S-3 — shape does not encode meaning.** A control's radius today predicts nothing about what it is:
buttons appear at `lg`, `xl`, `2xl` and `full`; chips at `full`, `pill` and `xl`; cards at `xl`, `2xl`,
`3xl` and `[26px]`/`[32px]`/`[36px]`. See `COMPONENT-CONSISTENCY-REPORT.md` §2 for the 22 distinct button
signatures this produces.

---

## 6. Motion

| | |
|---|---:|
| `transition-*` uses | **1,013** |
| `duration-*` uses | 186 |
| Distinct duration values | **12** — `200`(71) `300`(38) `150`(37) `500`(16) `100`(5) `700`(5) `180`(4) `75`(3) `1000`(3) `250`(2) `360`(1) `240`(1) |
| Designed easing tokens declared in config | 4 |
| **Uses of those easing tokens** | **1** |
| `MOTION_TOKENS` references | 6 — all inside `design-system/` and its own test |

**M-1 — 1,013 transitions, 186 durations.** 82 % of transitions run at Tailwind's default 150 ms because no
duration was specified. Motion is not designed here; it is inherited.

**M-2 — the three easing curves the config defines are used once, between them.** `ease-out-quart`,
`ease-in-out-arc` and `ease-spring` were authored deliberately. **Exactly one call site uses one of them**
(`ease-out-quart`, once); the other two have never been used. Everything else eases linearly or on the browser default.

**M-3 — `MOTION_TOKENS` has zero product consumers.** Its six references are the file that declares it, the
DLS card that reads it, and the test that asserts on it. `duration-250` — used by
`SURFACES.cardInteractive` and `MOTION_TOKENS.cardHover`, the two tokens that define how a card answers a
pointer — did not compile at all until Phase 10, so both **snapped instantly**.

The three durations that carry 78 % of the traffic (`200`, `300`, `150`) are close enough to be a scale
already. This is the cheapest dimension in the audit to fix.

`prefers-reduced-motion` is handled globally at `index.css:361`. That is correct and is one of the few
system-level behaviours applied uniformly.

---

## 7. Scorecard — Phase 2

| Dimension | Score /10 | The single number behind it |
|---|---:|---|
| Colour discipline | **1** | 1,560 hex literals; 76.5 % inside a near-duplicate cluster |
| Semantic colour | **0** | 4 tokens, 0 uses, 1,906 hand-picked substitutes |
| Colour accessibility | **4** | 26 → 12 measured failures; all 12 trace to one mid-luminance orange |
| Typography discipline | **2** | 49.4 % off-scale; 88.8 % ≥ 700 weight; two body faces |
| Spacing discipline | **7** | 39 arbitrary values total — genuinely good |
| Elevation discipline | **1** | 132 bespoke shadows vs a 3-step ladder used 7 times; `rim-gold` unused |
| Shape discipline | **4** | Ladder was inverted; `pill` duplicates `full`; radius carries no meaning |
| Motion discipline | **2** | 912 transition utilities, 3 easing tokens used **once between them**; the DLS hover token did not compile |
| Token integrity (compiles) | **8** | 154 dead declarations → **0** after Phase 10 |
| Token correctness (right values) | **2** | The ladder is cool; the product is warm; warning == brand |

**Design-system maturity, Phase 2 assessment: 3 / 10.**

Up from the Phase 0 baseline of 2/10 solely because the system now *compiles*. Adoption, correctness and
semantics are unchanged — and adoption cannot move until §0 is fixed.

---

## 8. Reproducing every number

```bash
# colour clusters, hex inventory
node scripts/design-audit/colors.mjs

# token declaration vs adoption, spacing, shadows, radius
node scripts/design-audit/tokens.mjs

# component duplication and style variance
node scripts/design-audit/components.mjs

# dead utility classes (must print 0)
cd client && npx tailwindcss -i src/index.css -o /tmp/tw.css
for c in bg-stone-750 shadow-xs backdrop-blur-xs active:scale-98 duration-250 w-13; do
  printf '%-22s %s\n' "$c" "$(grep -c -- "$c" /tmp/tw.css)"
done

# rendered contrast, both themes, 12 routes
node client/.audit-contrast.mjs
```

**Known limits.** The contrast probe skips any element whose nearest painted ancestor uses a
`background-image`, and any element overlapped by an absolutely-positioned sibling. Both skips prevent false
positives at the cost of false negatives — **the true failure count is higher than 12, not lower.** Emoji
are excluded because CSS `color` does not apply to colour glyphs.

The cluster analysis reads source literals only; it does not see colours produced at runtime by
`PREMIUM_RANK_COLORS`-style lookup tables, so 1,560 is a floor.

---

*Next: `COMPONENT-CONSISTENCY-REPORT.md` — what the tokens above become once they are assembled into
buttons, cards, modals and chips.*
