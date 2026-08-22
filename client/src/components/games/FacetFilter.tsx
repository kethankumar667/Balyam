import React, { useState } from "react";
import {
  Filter,
  Users,
  Clock,
  Sparkles,
  Bot,
  Mic,
  RotateCcw,
  Check,
  ChevronDown,
  X,
} from "lucide-react";
import { type BhalyamGameCard } from "../bhalyam/data";

export interface GameFacets {
  playerCount: ("solo" | "duel" | "party")[];
  gameType: ("board" | "cards" | "retro" | "classroom")[];
  duration: ("quick" | "medium" | "long")[];
  features: ("bots" | "voice" | "turn")[];
}

export const INITIAL_FACETS: GameFacets = {
  playerCount: [],
  gameType: [],
  duration: [],
  features: [],
};

export interface FacetFilterProps {
  facets: GameFacets;
  onChange: (facets: GameFacets) => void;
  onReset: () => void;
  totalMatches: number;
}

export function matchesFacets(game: BhalyamGameCard, facets: GameFacets): boolean {
  // 1. Player Count
  if (facets.playerCount.length > 0) {
    const range = (game.playerRange || "").toLowerCase();
    const hasSolo =
      facets.playerCount.includes("solo") &&
      (range.includes("1") || game.tags.includes("solo"));
    const hasDuel =
      facets.playerCount.includes("duel") &&
      (range.includes("2") || game.tags.includes("multiplayer"));
    const hasParty =
      facets.playerCount.includes("party") &&
      (range.includes("4") || range.includes("6") || range.includes("8") || range.includes("3") || game.tags.includes("party") || game.tags.includes("multiplayer"));

    if (!hasSolo && !hasDuel && !hasParty) return false;
  }

  // 2. Game Type
  if (facets.gameType.length > 0) {
    const matchesType = facets.gameType.some((t) => game.tags.includes(t as any));
    if (!matchesType) return false;
  }

  // 3. Duration
  if (facets.duration.length > 0) {
    const dur = (game.duration || "").toLowerCase();
    const isQuick = facets.duration.includes("quick") && (dur.includes("5") || dur.includes("3") || dur.includes("quick"));
    const isMedium = facets.duration.includes("medium") && (dur.includes("10") || dur.includes("15") || dur.includes("5–10"));
    const isLong = facets.duration.includes("long") && (dur.includes("20") || dur.includes("30") || dur.includes("long"));
    if (!isQuick && !isMedium && !isLong) return false;
  }

  // 4. Features (Bot support, etc.)
  if (facets.features.length > 0) {
    if (facets.features.includes("bots")) {
      const botSupported = ["ludo", "uno", "rps", "rummy", "handcricket", "snl", "dotsboxes", "stargame", "bingo"];
      if (!botSupported.includes(game.slug)) return false;
    }
  }

  return true;
}

export default function FacetFilter({
  facets,
  onChange,
  onReset,
  totalMatches,
}: FacetFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeCount =
    facets.playerCount.length +
    facets.gameType.length +
    facets.duration.length +
    facets.features.length;

  const toggleArrayItem = <T,>(arr: T[], item: T): T[] => {
    return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
  };

  return (
    <div className="w-full space-y-2">
      {/* Trigger Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full border text-xs font-bold transition cursor-pointer ${
              activeCount > 0
                ? "bg-amber-500 text-stone-950 border-amber-400 font-extrabold shadow-sm"
                : "bg-[var(--chrome-control)] border-[var(--chrome-border)] text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)]"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter Facets</span>
            {activeCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-stone-950 text-amber-400 text-[10px] font-black flex items-center justify-center">
                {activeCount}
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>

          {activeCount > 0 && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold text-[var(--chrome-ink-soft)] hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        <div className="text-xs text-[var(--chrome-ink-soft)] font-medium">
          Showing <span className="font-bold text-[var(--chrome-ink)]">{totalMatches}</span> games
        </div>
      </div>

      {/* Expanded Multi-Facet Panel */}
      {isOpen && (
        <div className="p-4 rounded-2xl border border-[var(--chrome-border)] bg-[var(--chrome-panel)] shadow-lg space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Player Count */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--chrome-ink)] uppercase tracking-wider">
                <Users className="w-3.5 h-3.5 text-amber-500" />
                <span>Player Count</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "solo" as const, label: "1 Player (Solo)" },
                  { id: "duel" as const, label: "2 Players (1v1)" },
                  { id: "party" as const, label: "3+ Players (Party)" },
                ].map((opt) => {
                  const active = facets.playerCount.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        onChange({
                          ...facets,
                          playerCount: toggleArrayItem(facets.playerCount, opt.id),
                        })
                      }
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                        active
                          ? "bg-amber-500/20 border-amber-500 text-amber-800 dark:text-amber-300"
                          : "bg-[var(--chrome-control)] border-[var(--chrome-border)] text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Game Type */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--chrome-ink)] uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                <span>Game Type</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "board" as const, label: "Board Games" },
                  { id: "cards" as const, label: "Card Games" },
                  { id: "retro" as const, label: "Retro Classics" },
                  { id: "classroom" as const, label: "Classroom" },
                ].map((opt) => {
                  const active = facets.gameType.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        onChange({
                          ...facets,
                          gameType: toggleArrayItem(facets.gameType, opt.id),
                        })
                      }
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                        active
                          ? "bg-sky-500/20 border-sky-500 text-sky-800 dark:text-sky-300"
                          : "bg-[var(--chrome-control)] border-[var(--chrome-border)] text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Duration */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--chrome-ink)] uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Duration</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "quick" as const, label: "Quick (< 5 min)" },
                  { id: "medium" as const, label: "Medium (5-15 min)" },
                  { id: "long" as const, label: "Long (15+ min)" },
                ].map((opt) => {
                  const active = facets.duration.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        onChange({
                          ...facets,
                          duration: toggleArrayItem(facets.duration, opt.id),
                        })
                      }
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                        active
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-800 dark:text-emerald-300"
                          : "bg-[var(--chrome-control)] border-[var(--chrome-border)] text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Capabilities */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--chrome-ink)] uppercase tracking-wider">
                <Bot className="w-3.5 h-3.5 text-purple-400" />
                <span>Features</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "bots" as const, label: "AI Bot Support" },
                  { id: "voice" as const, label: "Voice Chat Ready" },
                ].map((opt) => {
                  const active = facets.features.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        onChange({
                          ...facets,
                          features: toggleArrayItem(facets.features, opt.id),
                        })
                      }
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                        active
                          ? "bg-purple-500/20 border-purple-500 text-purple-800 dark:text-purple-300"
                          : "bg-[var(--chrome-control)] border-[var(--chrome-border)] text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
