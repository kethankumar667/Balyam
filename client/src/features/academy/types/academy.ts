import type React from "react";

export type AcademyGenre =
  | "board"
  | "cards"
  | "duel"
  | "retro"
  | "arcade"
  | "classroom";

export type InteractiveSandboxKind =
  | "dice-roll"
  | "card-meld"
  | "uno-challenge"
  | "cricket-duel"
  | "quantum-grid"
  | "dots-chain"
  | "word-chain"
  | "sudoku-scanner"
  | "carrom-striker"
  | "chess-tactics"
  | "star-slap"
  | "bingo-cross"
  | "retro-mini";

export interface AcademySlide {
  id: string;
  badge: string;
  title: string;
  summary: string;
  keyRule: string;
  proTip?: string;
  iconName: "Orbit" | "Flame" | "Zap" | "Crown" | "Grid" | "Layers" | "Trophy" | "ShieldCheck" | "Target" | "Dice5" | "Play" | "Award" | "BookOpen" | "HelpCircle";
  sandboxKind?: InteractiveSandboxKind;
  sandboxConfig?: Record<string, unknown>;
}

export interface CheatsheetRuleItem {
  label: string;
  detail: string;
  tag?: string;
}

export interface CheatsheetSection {
  title: string;
  iconName: "Zap" | "ShieldCheck" | "Crown" | "Grid" | "Target" | "Flame" | "Trophy" | "Orbit";
  items: CheatsheetRuleItem[];
}

export interface GameAcademySpec {
  slug: string;
  title: string;
  tagline: string;
  genre: AcademyGenre;
  players: string;
  duration: string;
  difficulty: "Casual" | "Tactical" | "Mastermind";
  primaryAccent: string;
  secondaryAccent: string;
  glowAura: string;
  slides: AcademySlide[];
  cheatsheet: CheatsheetSection[];
  keybindings?: Array<{ key: string; description: string }>;
  storageKey: string;
}

export type AcademyMode = "walkthrough" | "cheatsheet";
