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
      },
      fontFamily: {
        display: ['Fredoka', 'system-ui', 'sans-serif'],
        body:    ['Nunito', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "20px",
        "2xl": "28px",
        pill: "9999px",
      },
      boxShadow: {
        "rim-gold":    "inset 0 0 0 2px var(--rim-gold), 0 8px 28px rgba(0,0,0,0.45)",
        "lift-1":      "0 1px 2px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.2)",
        "lift-2":      "0 4px 12px rgba(0,0,0,0.35)",
        "lift-3":      "0 12px 32px rgba(0,0,0,0.45)",
        "glow-brand":  "0 0 24px rgba(16,185,129,0.45)",
        "glow-gold":   "0 0 24px rgba(245,158,11,0.55)",
        "glow-danger": "0 0 18px rgba(239,68,68,0.45)",
      },
      backgroundImage: {
        "felt": "radial-gradient(ellipse at center, #0f5f43 0%, #064e3b 55%, #022c22 100%)",
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
        30: "7.5rem",
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
        360: "360ms",
        600: "600ms",
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
