# VISUAL-IDENTITY-RECOMMENDATION.md — One BHALYAM Palette

> **Phase 4 of the BHALYAM Design Execution Audit.** A single design language to replace the three that
> currently ship side by side.
>
> **Every ratio in this document is computed**, not estimated. `node scripts/design-audit/palette.mjs`
> prints the full matrix; nothing enters this file without passing through it. Where a value fails, the
> failure is printed rather than the value quietly changed.
>
> Brief: *gaming · fun · premium · modern · Indian-audience friendly · accessible · warm and memorable.*

---

## 1. The premise: this is a rename, not a redesign

`DESIGN-SYSTEM-AUDIT.md` §0 established that token adoption sits at 5.2 % because **the tokens are the wrong
colours** — a cool slate ladder declared for a warm cream product. Any recommendation that keeps the cool
ladder and asks harder will fail the way it has already failed 2,919 times.

So the neutral ramp below is not invented. **It is built from the values this codebase already uses most:**

| Proposed token | Hex | Where it comes from |
|---|---|---|
| `sand-300` | `#E6D4B5` | already the most-used tan — **60 uses** |
| `sand-600` | `#7A5B3E` | already **74 uses** |
| `sand-700` | `#5C3717` | already **98 uses** |
| `sand-800` | `#4A2508` | already **93 uses** |
| `orange-500` | `#E85D04` | already the brand orange — **112 uses** |
| `gold-500` | `#E4B128` | already `bhalyam.gold` |
| `blue-700` | `#2B3550` | already **60 uses** |

Six of the eleven anchor colours are what the product already paints. The work is **absorbing the 1,554
near-duplicates around them**, not replacing the six. That is why this is achievable and why the previous
palette was not.

**Worlds that stay.** The Game Boy DMG arcade, the notebook games (Hand Cricket, RPS, Star Game), the Ludo
print board, the UNO stadium and the Rummy felt are **legitimate sub-brands** sanctioned by `AGENTS.md` §8.
This palette governs *product chrome* — lounge, room, auth, meta-game, settings, support. It does not
govern a board.

---

## 2. The structural fix: ink steps and fill steps are different steps

`DESIGN-SYSTEM-AUDIT.md` §1.4 found that **nine of twelve remaining contrast failures are one colour**:
`#E85D04` and its near-duplicates. Measured:

```
orange-500 #E85D04   white ink 3.50 FAIL   dark ink 3.85 FAIL   -> NEITHER
```

`#E85D04` sits at the luminance midpoint, so it fails as a fill *and* as ink. The palette below fixes this
by construction — **every colour ships as a ramp with a designated ink step and a designated fill step**, and
the midpoint step is marked graphics-only:

| Role | Step | Rule |
|---|---|---|
| **Ink** on light grounds | `-700` / `-800` | ≥ 4.5:1 on `sand-50`, `sand-100` **and** `sand-200` |
| **Fill** behind white text | `-600` / `-700` | ≥ 4.5:1 against `#FFFFFF` |
| **Graphics only** | `-500` | Illustration, board art, large decorative shapes. **Never text, never a text fill.** |
| **Ink** on dark grounds | `-300` | ≥ 4.5:1 on `sand-950` and `sand-900` |

A designer who cannot reach for a midpoint step cannot ship a 3.5:1 button.

---

## 3. The palette

### 3.1 Neutral — warm parchment (the ramp that absorbs 106 near-duplicates)

| Token | Hex | Tailwind | Role | Contrast |
|---|---|---|---|---|
| `sand-50` | `#FFFDF7` | `bg-sand-50` | **Page ground, light** | — |
| `sand-100` | `#FBF5E9` | `bg-sand-100` | Raised card | — |
| `sand-200` | `#F3E7D3` | `bg-sand-200` | Sunken well, track, input rest | — |
| `sand-300` | `#E6D4B5` | `border-sand-300` | **Decorative hairline only** | 1.43:1 on `sand-50` — *fails 3:1, so never an informational border* |
| `sand-400` | `#C9AE8A` | `text-sand-400` | Disabled ink | 2.08:1 — disabled text is exempt under 1.4.3 |
| `sand-500` | `#A98C68` | `border-sand-500` | **Informational border, minimum** | **3.11:1** on `sand-50` ✅ |
| `sand-600` | `#7A5B3E` | `text-sand-600` | Muted ink | **6.08 / 5.70 / 5.06** ✅ |
| `sand-700` | `#5C3717` | `text-sand-700` | Secondary ink | **10.25 / 9.60 / 8.53** ✅ |
| `sand-800` | `#4A2508` | `text-sand-800` | **Primary ink** | **13.24 / 12.40 / 11.02** ✅ |
| `sand-900` | `#2A1B0E` | `bg-sand-900` | Card, dark | — |
| `sand-950` | `#14100B` | `bg-sand-950` | **Page ground, dark** | — |

Ratios are against `sand-50` / `sand-100` / `sand-200` respectively. **This one ramp replaces 106 distinct
hex values** — clusters 2 (39 creams), 3 (34 tans) and 7 (41 sands) from `DESIGN-SYSTEM-AUDIT.md` §1.2.

**Note the two border tokens.** `sand-300` is what the product uses today and measures 1.43:1 — fine as a
decorative rule, **not** acceptable where a border is the only thing marking a control's edge. `sand-500`
exists so that case has an answer. This distinction does not exist in the codebase today, which is why
input edges are inconsistently visible.

### 3.2 Primary — Chest Orange

| Token | Hex | Role | Measured |
|---|---|---|---|
| `orange-50` | `#FFF3E8` | Status/brand surface tint | with `orange-800` ink: **8.26:1** ✅ |
| `orange-100` | `#FFE1C7` | Hover tint | — |
| `orange-300` | `#FDA35A` | **Ink on dark** | **9.53** on `sand-950`, **8.37** on `sand-900` ✅ |
| `orange-500` | `#E85D04` | **Graphics only** | white 3.50 ✗ · dark 3.85 ✗ — **never a text fill** |
| `orange-600` | `#C74E02` | **Primary CTA fill** | white ink **4.65:1** ✅ |
| `orange-700` | `#A33F02` | **Ink on light** | **6.32 / 5.92 / 5.26** ✅ · white ink 6.42 ✅ |
| `orange-800` | `#7E3103` | Ink on tinted surface | — |

The brand orange survives untouched at `-500`, where it does what it is good at — illustration, board art,
the treasure-chest identity. It simply stops being asked to carry 11 px text.

### 3.3 Secondary — Lamp Gold

| Token | Hex | Role | Measured |
|---|---|---|---|
| `gold-100` | `#FFF4CC` | Warning/premium surface | with `gold-800`: **6.64:1** ✅ |
| `gold-300` | `#F2CF63` | **Ink on dark** | **12.52 / 11.00** ✅ |
| `gold-500` | `#E4B128` | **Graphics only** | 1.94:1 on cream — **never ink, never a border, never a focus ring** |
| `gold-600` | `#B88A0F` | Large decorative | white 3.14 ✗ · dark 4.28 ✗ — not a text fill |
| `gold-800` | `#6E5206` | **Ink on light** | **7.19 / 6.73 / 5.98** ✅ |

**`gold-700` was proposed and rejected.** At `#8F6A08` it measures 4.06:1 on `sand-200` — a pass on two
grounds and a fail on the third. A token that is conditionally accessible is worse than no token, because
the condition is invisible at the call site. `gold-800` clears all three.

### 3.4 Accent — Ink Blue

| Token | Hex | Role | Measured |
|---|---|---|---|
| `blue-100` | `#DCE4F2` | Info surface | — |
| `blue-500` | `#3D4E75` | Illustration | — |
| `blue-700` | `#2B3550` | **Secondary action fill / ink** | white ink **12.15:1** ✅ · as ink **11.95:1** ✅ |
| `blue-900` | `#1A2033` | Deep panel | — |

The one cool colour in an otherwise warm system. It exists because an all-warm palette flattens — every
element competes at the same temperature. It is already the "Join Room" button's colour, so it arrives with
a job.

**Usage warning, from `DESIGN-INVENTORY.md` §5.1:** `blue-700` at 12:1 on cream is visually *heavier* than
the gold primary CTA beside it, which is exactly why "Join Room" currently out-shouts "Create Room". Ink
blue must be reserved for the **secondary** action and must not exceed the primary in area.

### 3.5 Semantics

Each ships as **surface + border + ink + icon**, never colour alone (WCAG 1.4.1).

| Role | Surface | Ink (light) | Ink (dark) | Fill | Measured |
|---|---|---|---|---|---|
| **Success** | `green-100 #D6F2E0` | `green-800 #0C5730` | `green-300 #6EE7A0` | `green-700 #116B39` | surface **7.28** ✅ · fill+white **6.59** ✅ · dark ink **12.27** ✅ |
| **Warning** | `gold-100 #FFF4CC` | `gold-800 #6E5206` | `gold-300 #F2CF63` | — | surface **6.64** ✅ · dark ink **12.52** ✅ |
| **Error** | `red-100 #FCE0DE` | `red-800 #8E1D14` | `red-300 #FCA5A0` | `red-700 #B02318` | surface **7.22** ✅ · fill+white **6.78** ✅ · dark ink **9.95** ✅ |
| **Info** | `sky-100 #DBEBF7` | `sky-800 #044E72` | `sky-300 #7DC5EE` | `sky-700 #04628F` | surface **7.37** ✅ · fill+white **6.67** ✅ · dark ink **10.01** ✅ |

#### The warning problem, stated honestly

`DESIGN-SYSTEM-AUDIT.md` §1.3 C-1 found `--color-warning` is pixel-identical to the brand accent. **This
palette does not fully solve that, and pretending otherwise would be dishonest.**

BHALYAM's brand *is* warm gold-orange. The warm band (hue 20°–55°) is brand territory. Inventing a fifth
warm hue for "warning" would produce a colour that is neither clearly brand nor clearly cautionary and
would make the palette worse, not better.

The resolution is to stop asking hue to do the work alone:

* Warning renders as a **complete pattern** — `bg-gold-100` + `border-gold-500` + `text-gold-800` + a
  warning glyph + a text label — which is unmistakably not a gold CTA even though the hue matches.
* Warning **never** appears as gold text on a plain ground, because that is indistinguishable from brand
  emphasis.
* This is already required by WCAG 1.4.1 and `accessibility-standards.md` §3.1, so it costs nothing new.

The two greens (C-2) *are* fully resolved: `brand` is no longer green at all, so `green-*` means success and
nothing else.

### 3.6 Player seats

Unchanged. The eight seat colours (Crimson · Emerald · RoyalBlue · Gold · Violet · Magenta · Orange ·
Bronze) are a **functional** palette — they identify people, must stay maximally separable, and are
duplicated across `board-layout.ts` and `print-board.ts`. They are outside this palette by design and must
stay synchronised between those two files.

---

## 4. Tailwind mapping

```js
// client/tailwind.config.js — extend.colors
sand:   { 50:"#FFFDF7",100:"#FBF5E9",200:"#F3E7D3",300:"#E6D4B5",400:"#C9AE8A",
          500:"#A98C68",600:"#7A5B3E",700:"#5C3717",800:"#4A2508",900:"#2A1B0E",950:"#14100B" },
chest:  { 50:"#FFF3E8",100:"#FFE1C7",300:"#FDA35A",500:"#E85D04",600:"#C74E02",
          700:"#A33F02",800:"#7E3103" },
lamp:   { 100:"#FFF4CC",300:"#F2CF63",500:"#E4B128",600:"#B88A0F",800:"#6E5206" },
inkblue:{ 100:"#DCE4F2",500:"#3D4E75",700:"#2B3550",900:"#1A2033" },
ok:     { 100:"#D6F2E0",300:"#6EE7A0",500:"#16A34A",700:"#116B39",800:"#0C5730" },
bad:    { 100:"#FCE0DE",300:"#FCA5A0",500:"#DC2626",700:"#B02318",800:"#8E1D14" },
note:   { 100:"#DBEBF7",300:"#7DC5EE",500:"#0284C7",700:"#04628F",800:"#044E72" },
```

Names are deliberately **not** `primary`/`secondary`. Those words describe a colour's *rank*, which changes;
`chest`, `lamp` and `inkblue` describe what the colour *is*, which does not. It also makes a mis-import
obvious in review: `text-lamp-500` on body copy reads as wrong at a glance in a way `text-secondary-500`
never does.

### 4.1 Semantic aliases on top

```js
surface:  { page:"var(--sand-50)", card:"var(--sand-100)", sunken:"var(--sand-200)" },
ink:      { hi:"var(--sand-800)", mid:"var(--sand-700)", lo:"var(--sand-600)", disabled:"var(--sand-400)" },
rim:      { hair:"var(--sand-300)", edge:"var(--sand-500)" },
```

Driven by CSS custom properties so `[data-theme="dark"]` remaps them in one place — the mechanism
`index.css` already implements correctly and which `DESIGN-BASELINE.md` §9 rates 8/10. **The theme system is
not the problem and must not be rebuilt.**

---

## 5. Usage guidance

| Situation | Use | Never |
|---|---|---|
| Body copy, light | `text-ink-hi` (`sand-800`) | any `-500` step |
| Muted / meta copy | `text-ink-lo` (`sand-600`) — 6.08:1 | `sand-400`, `sand-500` |
| Primary CTA | `bg-chest-600` + `text-white` — 4.65:1 | `bg-chest-500` + white — **3.50:1** |
| Secondary CTA | `bg-inkblue-700` + `text-white` | anything with more visual weight than the primary |
| Tertiary / text button | `text-chest-700` — 6.32:1 | `text-chest-500` — 3.44:1 |
| Card edge (decorative) | `border-rim-hair` (`sand-300`) | — |
| Input / control edge | `border-rim-edge` (`sand-500`) — 3.11:1 | `sand-300` — 1.43:1 |
| Focus ring | `sand-800` or `chest-700` | `gold-500` — 1.94:1 on cream |
| Status message | surface + border + ink + **icon + label** | colour alone |
| Illustration, board art, hero graphics | `-500` steps freely | — |
| Small text on gold | — | **anything.** `gold-500` carries no accessible ink |

### 5.1 Migration order — highest value first

| # | Action | Absorbs | Effort |
|---:|---|---|---|
| 1 | Declare the ramps; alias `surface`/`ink`/`rim` | — | 1 file |
| 2 | Map the 39-value cream cluster → `sand-50/100/200` | 231 uses | mechanical, scriptable |
| 3 | Map the 34-value tan cluster → `sand-300` | 217 uses | mechanical |
| 4 | Map the 41-value sand cluster → `sand-100/200` | 141 uses | mechanical |
| 5 | Map the 30-value slate + 54-value navy clusters → `sand-900/950` + `inkblue-*` | 404 uses | needs judgement — some are game boards |
| 6 | Replace `#E85D04` as *ink or fill* with `chest-700` / `chest-600` | fixes 9 of 12 contrast failures | targeted |
| 7 | Give `success`/`warning`/`danger`/`info` their first consumers | 1,906 raw classes | ongoing |

Steps 2–4 are **589 uses of 114 distinct values collapsing to 4 tokens** and are safely scriptable, because
every value in each cluster is within RGB distance 12 of the target — below the threshold of visible change.

---

## 6. What this does *not* claim

* **Not applied.** This is a specification. `BHALYAM-DESIGN-REMEDIATION-REPORT.md` records what was actually
  changed in Phase 10, which is far less than this.
* **Ratios are mathematical, not rendered.** They assume opaque colours composited on the stated ground.
  Any element with alpha, a gradient, or a texture behind it must be re-measured in the browser —
  `client/.audit-contrast.mjs` does that.
* **The warning collision is mitigated, not eliminated** (§3.5).
* **Dark theme is specified but under-evidenced.** The `-300` ink steps are computed against `sand-950` and
  `sand-900`; no dark-theme screen has been rendered with this palette.
* **No claim about brand appeal.** "Warm, memorable, Indian-audience friendly" is a design judgement, not a
  measurement. What is measured here is *consistency* and *accessibility*. Whether the result is
  **liked** requires users, and this audit spoke to none.

---

## 7. Reproducing

```bash
node scripts/design-audit/palette.mjs
```

Prints every ink×ground pair, every fill×ink pair, the tinted status surfaces, non-text (border/focus)
contrast, the dark-theme matrix, and a regression check that re-maps today's twelve known failures through
the proposed tokens. **Failures print as `FAIL` and are left in the output**, including the two that drove
design changes here (`gold-700`, `orange-500` as a fill).

---

*Next: `DESIGN-DEBT-REGISTER.md` — everything found across Phases 5–8, ranked.*
