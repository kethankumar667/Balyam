export function dailySeed(date: string): number {
  return Array.from(date).reduce((seed, char) => Math.imul(seed ^ char.charCodeAt(0), 16777619), 2166136261) >>> 0;
}
import type { Challenge, PieceType } from "../types";

export const MODES: { id: Challenge; title: string; detail: string; badge: string; color: string }[] = [
  { id: "marathon", title: "Marathon", detail: "Build your rhythm. Clear rows as the pace rises.", badge: "Endless", color: "#22d3ee" },
  { id: "sprint", title: "40-line Sprint", detail: "Forty lines. One clock. Find your fastest finish.", badge: "Time trial", color: "#a78bfa" },
  { id: "attack", title: "Score Attack", detail: "Make every drop count in a two-minute run.", badge: "02:00", color: "#fb7185" },
  { id: "daily", title: "Daily Circuit", detail: "Today's UTC seed. Clear 40 lines; replay to improve.", badge: "Daily seed", color: "#fbbf24" },
  { id: "practice", title: "Free Play", detail: "Choose your speed. Learn placements without a rush.", badge: "Practice", color: "#a3e635" },
  { id: "pentix", title: "Pentix", detail: "Twelve five-cell shapes. A new kind of challenge.", badge: "Advanced", color: "#fb923c" },
];
export const BLOCK_COLORS: Record<PieceType, string> = {
  I: "#22d3ee", J: "#608bfa", L: "#fb923c", O: "#fbbf24", S: "#a3e635", T: "#b18aff", Z: "#fb7185",
  F: "#22d3ee", I5: "#608bfa", L5: "#fb923c", P: "#fbbf24", N: "#a3e635", T5: "#b18aff",
  U: "#fb7185", V: "#38bdf8", W: "#c084fc", X: "#f472b6", Y: "#34d399", Z5: "#fda4af",
};
export const modeTitle = (mode: Challenge) => MODES.find(item => item.id === mode)!.title;
export const isTimed = (mode: Challenge) => mode === "sprint" || mode === "attack" || mode === "daily";
export function formatTime(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}
