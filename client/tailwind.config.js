/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "var(--color-brand-50)",
          100: "var(--color-brand-100)",
          200: "var(--color-brand-200)",
          300: "var(--color-brand-300)",
          400: "var(--color-brand-400)",
          500: "var(--color-brand-500)",
          600: "var(--color-brand-600)",
          700: "var(--color-brand-700)",
          800: "var(--color-brand-800)",
          900: "var(--color-brand-900)",
          950: "var(--color-brand-950)",
        },
        gold: {
          400: "var(--color-gold-400)",
          500: "var(--color-gold-500)",
          600: "var(--color-gold-600)",
          700: "var(--color-gold-700)",
        },
        surface: {
          0: "var(--surface-0)",
          1: "var(--surface-1)",
          2: "var(--surface-2)",
          3: "var(--surface-3)",
        },
        ink: {
          hi:   "var(--text-hi)",
          mid:  "var(--text-mid)",
          lo:   "var(--text-lo)",
          mute: "var(--text-mute)",
        },
        player: {
          1: "var(--color-player-1)",
          2: "var(--color-player-2)",
          3: "var(--color-player-3)",
          4: "var(--color-player-4)",
          5: "var(--color-player-5)",
          6: "var(--color-player-6)",
        },
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger:  "var(--color-danger)",
        info:    "var(--color-info)",
        economy: {
          coin: "var(--economy-coin)",
          "coin-highlight": "var(--economy-coin-highlight)",
          "coin-shadow": "var(--economy-coin-shadow)",
          "wallet-surface": "var(--economy-wallet-surface)",
          "wallet-surface-elev": "var(--economy-wallet-surface-elev)",
          "pool-surface": "var(--economy-pool-surface)",
          credit: "var(--economy-credit)",
          "credit-bg": "var(--economy-credit-bg)",
          debit: "var(--economy-debit)",
          "debit-bg": "var(--economy-debit-bg)",
          escrow: "var(--economy-escrow)",
          "escrow-bg": "var(--economy-escrow-bg)",
          "world-bank": "var(--economy-world-bank)",
          "world-bank-bg": "var(--economy-world-bank-bg)",
          pending: "var(--economy-pending)",
          failed: "var(--economy-failed)",
          refunded: "var(--economy-refunded)",
        },

        /**
         * The half-steps the DLS was written against.
         *
         * `client/src/design-system/` uses `stone-750`, `stone-850`,
         * `zinc-750` and `zinc-850` in 25 declarations — every elevated card,
         * every modal, the bottom drawer, the shimmer bars in SkeletonLoader
         * and the `glassElevated` gradient. Tailwind's scale has no 750 or 850
         * step and neither did this file, so all 25 compiled to nothing.
         *
         * Two visible consequences, both in shipped UI:
         *   • `border border-stone-750` sets a border WIDTH with no colour, so
         *     preflight's `border-color: #e5e7eb` applied — a near-white
         *     hairline around near-black modals and cards.
         *   • `bg-stone-750` on the six SkeletonLoader shimmer bars painted
         *     nothing, so the "never render a blank loading state" primitive
         *     rendered blank bars.
         *
         * Values are the arithmetic midpoints of the neighbouring stock steps,
         * which is what a 750/850 step means.
         */
        stone: {
          750: "#363230",  // between stone-700 #44403c and stone-800 #292524
          850: "#221f1d",  // between stone-800 #292524 and stone-900 #1c1917
        },
        zinc: {
          750: "#333338",  // between zinc-700 #3f3f46 and zinc-800 #27272a
          850: "#1f1f22",  // between zinc-800 #27272a and zinc-900 #18181b
        },

        /**
         * ── The unified BHALYAM ramps (VISUAL-IDENTITY-RECOMMENDATION.md) ──
         *
         * WHY THESE EXIST. Token adoption sits at 5.2 % not because the rules
         * were ignored but because `--surface-*` / `--text-*` declare a COOL
         * SLATE ladder for a product that paints WARM CREAM. A developer who
         * reached for `bg-surface-1` shipped a grey card onto parchment, so
         * 2,919 arbitrary hexes were written instead. The tokens had to become
         * warm before "use the tokens" could ever work.
         *
         * WHY THESE VALUES. Six of the eleven anchors are the hexes the
         * codebase ALREADY uses most — sand-300 (#E6D4B5, 60 uses), sand-600
         * (74), sand-700 (98), sand-800 (93), chest-500 (#E85D04, 112),
         * inkblue-700 (#2B3550, 60). This is a rename that absorbs 1,554
         * near-duplicates, not a redesign that replaces the six.
         *
         * THE STRUCTURAL RULE. Every ramp separates its INK step from its FILL
         * step, and marks the midpoint graphics-only. `#E85D04` measures 3.50:1
         * behind white text and 3.85:1 behind dark text — it fails in BOTH
         * directions, which is why nine of twelve remaining contrast failures
         * are this one colour. A designer who cannot reach for a midpoint step
         * cannot ship a 3.5:1 button.
         *
         *   -300  ink on dark grounds      (>= 4.5:1 on sand-900/950)
         *   -500  GRAPHICS ONLY            (never text, never a text fill)
         *   -600  fill behind white text   (>= 4.5:1 vs #FFFFFF)
         *   -700  ink on light grounds     (>= 4.5:1 on sand-50/100/200)
         *   -800  ink on its own -100 tint
         *
         * Every ratio is computed by `node scripts/design-audit/palette.mjs`,
         * which prints failures rather than hiding them — gold-700 was proposed
         * and rejected there for measuring 4.06:1 on sand-200.
         *
         * Names describe what a colour IS, not what rank it holds: `chest`,
         * `lamp`, `inkblue`. `text-lamp-500` on body copy reads as wrong at a
         * glance in a way `text-secondary-500` never does.
         *
         * NOT YET ADOPTED AT SCALE. Declared here and used by the Phase 10
         * contrast fixes only. The cluster migration (589 uses of 114 values
         * collapsing to 4 tokens) is DESIGN-DEBT-REGISTER.md HIGH-01.
         */
        sand: {
          50:  "#FFFDF7",  // page ground, light
          100: "#FBF5E9",  // raised card
          200: "#F3E7D3",  // sunken well, track
          300: "#E6D4B5",  // decorative hairline ONLY — 1.43:1, fails the 3:1 non-text bar
          400: "#C9AE8A",  // disabled ink
          // Informational border, minimum. #A98C68 was the first proposal and
          // the checker rejected it: 3.11:1 on sand-50 but 2.91 on sand-100 and
          // 2.59 on sand-200, so it passed on the page and failed inside a card
          // — the worst kind of token, because the call site cannot see which
          // ground it landed on. #96795A clears 3:1 on all three (3.99 / 3.73 / 3.32).
          500: "#96795A",
          600: "#7A5B3E",  // muted ink — 6.08:1
          700: "#5C3717",  // secondary ink — 10.25:1
          800: "#4A2508",  // primary ink — 13.24:1
          900: "#2A1B0E",  // card, dark
          950: "#14100B",  // page ground, dark
        },
        chest: {
          50:  "#FFF3E8",
          100: "#FFE1C7",
          300: "#FDA35A",  // ink on dark — 9.53:1
          500: "#E85D04",  // GRAPHICS ONLY — 3.50 white / 3.85 dark, fails both
          600: "#C74E02",  // primary CTA fill — white ink 4.65:1
          700: "#A33F02",  // ink on light — 6.32:1
          800: "#7E3103",
        },
        lamp: {
          100: "#FFF4CC",
          300: "#F2CF63",  // ink on dark — 12.52:1
          500: "#E4B128",  // GRAPHICS ONLY — 1.94:1 on cream; never ink, border or focus ring
          600: "#B88A0F",
          800: "#6E5206",  // ink on light — 7.19:1
        },
        inkblue: {
          100: "#DCE4F2",
          500: "#3D4E75",
          700: "#2B3550",  // secondary action — white ink 12.15:1
          900: "#1A2033",
        },
        // Semantics ship as surface + border + ink + ICON. Never colour alone:
        // BHALYAM's brand IS warm gold, so `warning` cannot buy separation with
        // hue and must be a complete pattern (WCAG 1.4.1).
        ok:   { 100: "#D6F2E0", 300: "#6EE7A0", 500: "#16A34A", 700: "#116B39", 800: "#0C5730" },
        bad:  { 100: "#FCE0DE", 300: "#FCA5A0", 500: "#DC2626", 700: "#B02318", 800: "#8E1D14" },
        note: { 100: "#DBEBF7", 300: "#7DC5EE", 500: "#0284C7", 700: "#04628F", 800: "#044E72" },

        // ── BHALYAM treasure-chest palette ──────────────────────────────
        // Scoped under `bhalyam.*` so the in-game UI (brand/gold tokens
        // above) is never touched. The hero metaphor is a wooden treasure
        // chest with golden trim, so wood + gold are the structural anchors
        // and the ludo colours show up only inside game cards / accents.
        bhalyam: {
          gold: {
            DEFAULT: "#E4B128",   // primary gold — CTAs, hinges, trim
            light:   "#F4C430",   // highlight + ludo yellow
            dark:    "#B38918",   // pressed-state shadow
            ink:     "#7A5C0E",   // gold-on-cream text
          },
          wood: {
            DEFAULT: "#6D4323",   // wood brown — structural panels
            dark:    "#4A2C16",   // deep wood — bottom nav, footer
            light:   "#8A5A33",
            grain:   "#3a2010",   // grain stripe overlay
          },
          cream: {
            DEFAULT: "#F7E8C4",   // page bg — vintage cream
            soft:    "#FFF7E7",   // softer surface
            warm:    "#F2DFA8",
            edge:    "#D8C390",
          },
          orange: "#FF8F00",      // accent — daily rewards, badges
          maroon: "#7B1E2B",      // temple maroon — premium accents
          ludo: {
            red:    "#E53935",
            green:  "#43A047",
            blue:   "#1976D2",
            yellow: "#F4C430",
          },
        },
        // ── Rummy nostalgia accents (docs/rummy/roadmap.md Phase 0.1) ───
        // Scoped under `nostalgia.*` — separate from the in-game brand/gold
        // tokens above AND the landing-page `bhalyam.*` chest palette. This
        // is the family card-table accent set, consumed only inside
        // client/src/games/rummy/ (NotebookSheet, score sheet, declaration
        // moment). Nothing references these yet — Phase 0 ships with zero
        // visible change by design.
        // Driven by CSS variables so the whole set flips together for dark
        // mode. The `.nostalgia-paper` SURFACE already flipped (#F5E9C9 ->
        // #2A2114 in index.css) while the ink stayed dark sepia (#2E2419) —
        // near-black on near-black, which is why the Rummy scorecard was
        // unreadable in dark mode. Channel form keeps `/70`-style opacity
        // modifiers working (they are used ~25 times).
        nostalgia: {
          paper: {
            DEFAULT: "rgb(var(--nostalgia-paper) / <alpha-value>)",
            edge:    "rgb(var(--nostalgia-paper-edge) / <alpha-value>)",
          },
          pen: {
            DEFAULT: "rgb(var(--nostalgia-pen) / <alpha-value>)",
            red:     "rgb(var(--nostalgia-pen-red) / <alpha-value>)",
          },
          brass: "rgb(var(--nostalgia-brass) / <alpha-value>)",
        },
        // ── Hand Cricket notebook skin (client/src/games/handcricket) ────
        // The scrapbook/ruled-paper aesthetic shared by the team-select,
        // squad, toss and innings sheets. Consumed by components/paper/*.
        // Kept separate from nostalgia.* (rummy) so tuning one never shifts
        // the other.
        hc: {
          paper:    "#F5E9C4",   // page base
          "paper-l":"#FBF5E0",   // raised card fill
          "paper-d":"#EDE0C0",   // header / recessed strip
          ink:      "#1a2952",   // primary handwriting ink (navy)
          "ink-lt": "#4a5a82",   // secondary ink
          "ink-red":"#8B1A1A",   // red pen
          wood:     "#4a2c12",   // notebook cover / binding
          border:   "rgba(46,40,25,0.55)", // sketch stroke
          stamp:    "#166534",   // green "selected" stamp
          amber:    "#92400e",   // amber accent
          gold:     "#C5963A",   // legends / stars
        },
      },
      fontFamily: {
        // BHALYAM type system, chosen via ui-ux-pro-max skill:
        //   display → Righteous (Music/Entertainment pairing — bold, energetic)
        //   sans/body → Poppins (existing brand body voice)
        //   script → Caveat (handwritten nostalgia accent — "Bring your gang back")
        //   mono → JetBrains Mono (kept for room codes / chat timestamps)
        display: ['Righteous', 'system-ui', 'sans-serif'],
        sans:    ['Poppins', 'system-ui', 'sans-serif'],
        script:  ['Caveat', 'cursive'],
        body:    ['Poppins', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        kalam:   ['Kalam', 'cursive'],
        hand:    ['"Patrick Hand"', 'Kalam', 'cursive'],
        notebook: ['Kalam', '"Patrick Hand"', 'Caveat', 'cursive'],
        // Sketchy marker for Hand Cricket headings (loaded in index.html).
        sketch:  ['"Architects Daughter"', 'Kalam', 'cursive'],
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "20px",
        "2xl": "28px",
        /**
         * `3xl` has to be declared, not inherited.
         *
         * The six steps above override Tailwind's defaults; `3xl` did not, so
         * it stayed at the stock 1.5rem (24px) and the ladder ran
         * 4 → 6 → 10 → 14 → 20 → 28 → **24**. Every surface reaching for the
         * roundest corner in the system — modals, elevated cards, the DLS
         * `arenaHero` and `battlePassTrack` — rendered TIGHTER than an
         * ordinary `rounded-2xl` card sitting inside it. 105 usages, all
         * inverted.
         *
         * 32px keeps the gaps rising (2, 4, 4, 6, 8, 4) and is a radius the
         * design already reaches for by hand: `rounded-[32px]` appears six
         * times in the codebase and `rounded-[36px]` five more. Those arbitrary
         * values are what this step was supposed to be.
         */
        "3xl": "32px",
        pill: "9999px",
        // Organic "hand-cut" corners — asymmetric radii simulate a paper edge
        // that was physically torn or cut rather than drawn with a ruler.
        // Applied to HC panels and phase wrappers that don't use RoughFrame.
        sketch: "255px 15px 225px 15px / 15px 225px 15px 255px",
        "sketch-alt": "15px 225px 15px 255px / 225px 15px 255px 15px",
      },
      boxShadow: {
        /**
         * `shadow-xs` — 93 uses, none of which cast a shadow.
         *
         * Tailwind 3's box-shadow scale starts at `sm`; `xs` is a v4 name that
         * this codebase adopted early. Search fields, chips, filter pills and
         * game-card sub-surfaces all asked for the lightest lift in the system
         * and rendered flat, which is a large part of why the lounge reads as
         * one plane. The value is v4's own: the faintest step below `sm`.
         */
        xs:             "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        /**
         * `shadow-2xs` — 41 uses, none of which cast a shadow.
         *
         * Same root cause as `xs` above and missed in the same pass: it is a
         * Tailwind v4 name this codebase adopted early, and v3's scale has no
         * step below `sm`. It is the *most-used* dead class remaining — 41
         * surfaces across 13 files (AuthShell, AuthTrustSheet, AuthControls,
         * AuthLangToggle, AppSidebar, Chat, ParticipantRow, BhalyamHome,
         * AboutPage, PrivacyPolicyPage, SettingsPage, SignUpPage,
         * SchoolGangWaitingBanner) asking for the faintest possible lift and
         * rendering perfectly flat.
         *
         * Value is v4's own `2xs`. Declaring it is the fix; rewriting 41 call
         * sites to `shadow-xs` would change the intended depth as well.
         */
        "2xs":          "0 1px rgb(0 0 0 / 0.05)",
        "rim-gold":     "inset 0 0 0 2px var(--rim-gold), 0 8px 28px rgba(0,0,0,0.45)",
        "lift-1":       "0 1px 2px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.2)",
        "lift-2":       "0 4px 12px rgba(0,0,0,0.35)",
        "lift-3":       "0 12px 32px rgba(0,0,0,0.45)",
        "glow-brand":   "0 0 24px rgba(16,185,129,0.45)",
        "glow-gold":    "0 0 24px rgba(245,158,11,0.55)",
        "glow-danger":  "0 0 18px rgba(239,68,68,0.45)",
        // Torn-paper lift — grounds a floating paper fragment with a warm cast shadow.
        // Use as box-shadow (not filter: drop-shadow) on rectangular containers.
        "paper-lift":   "3px 5px 16px rgba(74,44,18,0.22), 0 1px 3px rgba(74,44,18,0.14)",
        // Binding cast — warm shadow bleeds from the spine onto the paper edge.
        "binding-cast": "inset 8px 0 20px rgba(50,20,5,0.20)",
      },
      backgroundImage: {
        "felt": "radial-gradient(ellipse at center, #0f5f43 0%, #064e3b 55%, #022c22 100%)",
        // Vibrant gradient accents from ui-ux-pro-max — used by hero
        // sections, CTAs, and section dividers. All anchored to the brand
        // orange #EA5A1F so they coexist with the paper/wood/gold base.
        "bhalyam-sunset": "linear-gradient(135deg, #EA5A1F 0%, #F4C430 100%)",
        "bhalyam-ember":  "linear-gradient(135deg, #E11D48 0%, #EA5A1F 60%, #F4C430 100%)",
        "bhalyam-festival": "linear-gradient(135deg, #7C3AED 0%, #E11D48 50%, #F97316 100%)",
        "bhalyam-mint":   "linear-gradient(135deg, #10B981 0%, #34D399 100%)",
        "bhalyam-royal":  "linear-gradient(135deg, #1E40AF 0%, #3B82F6 50%, #60A5FA 100%)",
        "bhalyam-gold-leaf": "linear-gradient(135deg, #F4C430 0%, #E4B128 45%, #B38918 100%)",
        // Subtle vintage paper grain — light parchment with brown speckle.
        "bhalyam-parchment": "radial-gradient(rgba(166, 124, 82, 0.10) 1px, transparent 1px), radial-gradient(rgba(255, 224, 178, 0.06) 1px, transparent 1px), linear-gradient(135deg, #FCF4DA 0%, #F2DFA8 100%)",
        // Rummy nostalgia accents — see `colors.nostalgia` above.
        "nostalgia-lamp": "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(255,179,71,0.35) 0%, rgba(255,179,71,0.08) 45%, transparent 75%)",
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
        30: "7.5rem",
        /**
         * Half-steps and the 13 step, because the product already writes them.
         *
         * Tailwind ships 0.5 / 1.5 / 2.5 / 3.5 and then stops, so `h-4.5`,
         * `w-4.5`, `left-5.5`, `gap-4.5`, `px-4.5` and `w-13` — 51 occurrences
         * across icon sizing, the Brick Tetris keypad and the auth shell —
         * compiled to nothing at all. An icon asked to be 18px inherited its
         * intrinsic size instead, and a keypad key asked to be 52px wide fell
         * back to its content width, which is how a 44px touch target quietly
         * stops being one.
         *
         * These are the sizes the code already asked for. Declaring them is
         * the fix; rewriting 51 call sites to nearby values is not.
         */
        4.5: "1.125rem",  // 18px — icon size used across auth + game chrome
        5.5: "1.375rem",  // 22px
        13:  "3.25rem",   // 52px — Brick Tetris keypad, Star Game chips
        26:  "6.5rem",    // 104px — Star Game hand-stack chip
      },
      transitionTimingFunction: {
        "out-quart":  "cubic-bezier(0.25, 1, 0.5, 1)",
        "in-out-arc": "cubic-bezier(0.65, 0, 0.35, 1)",
        spring:       "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      transitionDuration: {
        120: "120ms",
        180: "180ms",
        240: "240ms",
        // The DLS writes `duration-250` in SURFACES.cardInteractive and
        // MOTION_TOKENS.cardHover. It was in neither this list nor Tailwind's
        // stock scale, so the two tokens that define how a card responds to a
        // pointer had no duration and snapped instantly.
        250: "250ms",
        360: "360ms",
        600: "600ms",
      },

      /**
       * Press and hover scales the product already writes.
       *
       * Tailwind's stock scale jumps 95 → 100 → 105, so `active:scale-98`
       * (18 uses, including the PLAY NOW button on every game card),
       * `hover:scale-102` (6), `scale-97` (the DLS button press) and
       * `group-hover:scale-115` compiled to nothing. Twenty-six controls
       * declared tactile feedback and rendered none of it — the opposite of
       * UI/UX standards §1 Pillar 3.
       */
      scale: {
        97: "0.97",
        98: "0.98",
        102: "1.02",
        115: "1.15",
      },

      /**
       * `backdrop-blur-xs` — 32 uses across the auth shell, the trust sheet
       * and the waiting banner, none of which blurred anything. Tailwind 3's
       * blur scale starts at `sm` (4px); `xs` arrived in v4. 2px is the value
       * v4 gives it.
       */
      blur: {
        xs: "2px",
        // `backdrop-blur-2xs` — 1 use (`pages/AboutPage.tsx:14`, the paper tape
        // strip over the illustration). Dead for the same reason as `xs`.
        "2xs": "1px",
      },

      /**
       * Two escalation z-values the code already uses (`z-55`, `z-60`) and had
       * no definition for, so the elements meant to sit above a z-50 overlay
       * had no stacking context at all and fell back to source order.
       *
       * These are named against the existing 10-step ladder rather than added
       * as new arbitrary values — see DESIGN-DEBT-REGISTER.md DS-09 for the
       * wider z-index problem (25 distinct values including z-[46] and z-[59]),
       * which needs a real layer scale rather than two more numbers.
       */
      zIndex: {
        55: "55",
        58: "58",
        60: "60",
        70: "70",
      },
      keyframes: {
        cardFlip: {
          "0%":   { transform: "rotateY(0deg)" },
          "50%":  { transform: "rotateY(90deg)" },
          "100%": { transform: "rotateY(0deg)" },
        },
        diceRoll: {
          "0%":   { transform: "rotate(0) translateY(0)" },
          "40%":  { transform: "rotate(540deg) translateY(-12px)" },
          "100%": { transform: "rotate(720deg) translateY(0)" },
        },
        winBurst: {
          "0%":   { transform: "scale(0.6)", opacity: "0" },
          "40%":  { transform: "scale(1.1)", opacity: "1" },
          "100%": { transform: "scale(1)",   opacity: "1" },
        },
        shake: {
          "0%,100%": { transform: "translateX(0)" },
          "25%":     { transform: "translateX(-4px)" },
          "75%":     { transform: "translateX(4px)" },
        },
        glowPulse: {
          "0%,100%": { boxShadow: "0 0 0 rgba(245,158,11,0)" },
          "50%":     { boxShadow: "0 0 24px rgba(245,158,11,0.6)" },
        },
      },
      animation: {
        "card-flip":  "cardFlip 360ms ease-in-out",
        "dice-roll":  "diceRoll 600ms cubic-bezier(0.34,1.56,0.64,1)",
        "win-burst":  "winBurst 480ms cubic-bezier(0.34,1.56,0.64,1)",
        shake:        "shake 280ms ease-in-out",
        "glow-pulse": "glowPulse 1800ms ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
