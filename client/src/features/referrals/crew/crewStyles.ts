import type { CSSProperties } from "react";

/**
 * The Crew Quest page follows the app's theme. By night it is navy glass with cyan for the network; by day it is
 * warm paper with white panels and the same accents one shade deeper, so each keeps its contrast. Gold stays the
 * reward colour, purple the shared pack, emerald anything verified. The classes in these components pair a light
 * and a `dark:` value; the older referral pieces that read `--auth-*` (the friend chips, the "add a code" box) get
 * the matching set below, chosen by the page from the current theme. The light set is the app's own parchment set.
 */
export const AUTH_VARS: Record<"light" | "dark", CSSProperties> = {
  light: {
    "--auth-card": "#FFFBF2",
    "--auth-card-edge": "#E8D8BE",
    "--auth-ink": "#2A221B",
    "--auth-ink-soft": "#6D5540",
    "--auth-ink-mute": "#7E653F",
    "--auth-field": "#FDF6E7",
    "--auth-field-edge": "#E8D8BE",
    "--auth-rule": "#E5D4B4",
    "--auth-hairline": "rgba(74, 44, 18, 0.14)",
  } as CSSProperties,
  dark: {
    "--auth-card": "#0c1b30",
    "--auth-card-edge": "rgba(39, 215, 242, 0.25)",
    "--auth-ink": "#f8fafc",
    "--auth-ink-soft": "#b6c4d8",
    "--auth-ink-mute": "#8aa0ba",
    "--auth-field": "#12294a",
    "--auth-field-edge": "rgba(148, 163, 184, 0.32)",
    "--auth-rule": "rgba(148, 163, 184, 0.2)",
    "--auth-hairline": "rgba(255, 255, 255, 0.1)",
  } as CSSProperties,
};

const GLASS = "relative rounded-2xl border bg-white dark:bg-[#0c1b30]/90 p-4 shadow-[0_12px_28px_-20px_rgba(15,23,42,0.35)] dark:shadow-[0_16px_32px_-20px_rgba(0,0,0,0.85)] sm:p-5";
export const PANEL = `${GLASS} border-sky-200 dark:border-cyan-300/25`;
export const PANEL_PURPLE = `${GLASS} border-violet-300 bg-gradient-to-br from-violet-50 to-amber-50 dark:border-purple-400/40 dark:from-[#1a1140]/95 dark:to-[#0c1b30]/95`;

export const HEADING = "m-0 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-700 dark:text-[#dbe7f5]";
export const BODY = "text-slate-600 dark:text-[#b6c4d8]";
export const MUTED = "text-slate-600 dark:text-[#8aa0ba]";

const BUTTON = "inline-flex items-center justify-center gap-2 rounded-xl font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0c1b30] motion-reduce:transition-none";
export const GOLD_BUTTON = `${BUTTON} min-h-[52px] w-full bg-gradient-to-r from-[#ffb800] to-[#ffd76a] px-5 text-sm text-[#1a1203] shadow-[0_0_22px_rgba(255,184,0,0.35)] hover:brightness-105`;
export const GHOST_BUTTON = `${BUTTON} min-h-[44px] border border-sky-300 dark:border-cyan-300/35 bg-white dark:bg-white/5 px-4 text-xs text-slate-700 dark:text-[#dbe7f5] hover:bg-slate-100 dark:hover:bg-white/10`;
