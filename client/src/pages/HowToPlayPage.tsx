import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Gamepad2,
  Users,
  PlusCircle,
  ArrowRight,
  Sparkles,
  Bot,
  Clock,
  ShieldCheck,
  Smartphone,
  Tv,
  HelpCircle,
  Flame,
  CheckCircle2,
  X,
  Printer,
  BookOpen,
  Filter,
} from "lucide-react";
import HelpLayout from "../components/layout/HelpLayout";
import Modal from "../components/Modal";
import JoinRoomModal from "../components/bhalyam/JoinRoomModal";
import { HapticsManager } from "../services/HapticsManager";

interface GameRuleDetail {
  slug: string;
  title: string;
  icon: string;
  players: string;
  duration: string;
  difficulty: "Easy" | "Medium" | "Strategic";
  category: "board" | "cards" | "quick" | "2player";
  tagline: string;
  objective: string;
  steps: string[];
  tips: string[];
}

const GAME_RULES_CATALOG: Record<string, GameRuleDetail> = {
  handcricket: {
    slug: "handcricket",
    title: "Hand Cricket",
    icon: "🏏",
    players: "2 Players",
    duration: "5–10 min",
    difficulty: "Easy",
    category: "2player",
    tagline: "The timeless classroom finger-cricket duel.",
    objective: "Score the highest runs while batting and outwit your opponent to take their wicket while bowling.",
    steps: [
      "Toss: A coin toss decides who bats or bowls first.",
      "Simultaneous Choice: In each ball, both players simultaneously pick a number from 1 to 6.",
      "Scoring: If both numbers are different, the batsman adds their chosen number to their total score.",
      "Wicket (OUT): If both players pick the EXACT same number, the batsman is OUT!",
      "Innings Switch: The bowler now bats to chase the target score. Surpassing the target wins the match.",
    ],
    tips: [
      "Watch your opponent's rhythm: Players often repeat winning numbers or alternate between odd and even.",
      "Pressure overs: When chasing a tight target, balance safe singles (1, 2) with boundary risks (4, 6).",
    ],
  },
  ludo: {
    slug: "ludo",
    title: "Ludo Lounge",
    icon: "🎲",
    players: "2–4 Players",
    duration: "15–25 min",
    difficulty: "Easy",
    category: "board",
    tagline: "Classic board game of rolling sixes and cutting tokens.",
    objective: "Navigate all 4 of your colored tokens from your home base around the track into the center home triangle.",
    steps: [
      "Unlocking: Roll a 6 on the dice to bring a token out of your home base onto the start cell.",
      "Extra Turns: Rolling a 6 or capturing an opponent's token awards an immediate bonus roll.",
      "Capturing: Landing on a cell occupied by an opponent's token sends it all the way back to their base.",
      "Safe Zones: Star cells and home columns are safe — tokens on safe cells cannot be captured.",
      "Victory: The first player to get all 4 tokens safely into the home center wins 1st place.",
    ],
    tips: [
      "Keep multiple tokens active on the board rather than moving just one token forward.",
      "Camp on safe star cells just behind opponents to threaten them on their next roll.",
    ],
  },
  rummy: {
    slug: "rummy",
    title: "Classic Rummy",
    icon: "🎴",
    players: "2–6 Players",
    duration: "10–20 min",
    difficulty: "Medium",
    category: "cards",
    tagline: "13-card Indian Rummy with pure sequences and sets.",
    objective: "Form valid sequences (runs of same suit) and sets (same rank, different suits) with all 13 cards.",
    steps: [
      "Dealing: Each player is dealt 13 cards. A wild joker is drawn randomly from the remaining deck.",
      "Draw & Discard: On your turn, pick 1 card from the open discard pile or closed draw pile, then discard 1 card.",
      "Valid Declaration: A valid hand requires at least 2 sequences, of which at least 1 must be a pure sequence (no jokers).",
      "Show & Declare: Once your 13 cards are arranged in valid groups, discard your final card to the Declare box.",
    ],
    tips: [
      "Prioritize your pure sequence first before building joker-assisted melds.",
      "Discard high-value unmatched picture cards (K, Q, J, A) early to minimize penalty points if an opponent declares.",
    ],
  },
  snl: {
    slug: "snl",
    title: "Snakes & Ladders",
    icon: "🐍",
    players: "2–4 Players",
    duration: "10–15 min",
    difficulty: "Easy",
    category: "board",
    tagline: "Climb glorious ladders and dodge venomous snakes.",
    objective: "Be the first player to travel from square 1 to square 100 on the classic childhood board.",
    steps: [
      "Turn Rolling: Roll the dice to move your token forward by the exact number shown.",
      "Ladders: Landing on the bottom of a ladder automatically boosts you up to its top square.",
      "Snakes: Landing on a snake's head slides your token down to its tail.",
      "Exact 100: You must land on square 100 with an exact roll to win the crown.",
    ],
    tips: [
      "Watch out for the giant snake near square 98 — it drops you back to square 28!",
    ],
  },
  uno: {
    slug: "uno",
    title: "UNO Blast",
    icon: "🃏",
    players: "2–4 Players",
    duration: "10–15 min",
    difficulty: "Easy",
    category: "cards",
    tagline: "Match colors, unleash Draw-4s, and scream UNO!",
    objective: "Be the first player to discard all cards from your hand by matching color, number, or action symbol.",
    steps: [
      "Matching: Play a card from your hand that matches the top discard pile card in color or number.",
      "Action Cards: Skip, Reverse, and Draw Two force opponents to lose turns or draw penalty cards.",
      "Wild Cards: Wild and Wild Draw Four let you change the active playing color.",
      "Call UNO: When you have only 1 card left in your hand, tap the UNO button before your turn ends!",
    ],
    tips: [
      "Save Wild Draw 4 cards for crucial defense when an opponent is down to 1 or 2 cards.",
    ],
  },
  dotsboxes: {
    slug: "dotsboxes",
    title: "Dots & Boxes",
    icon: "⏹",
    players: "2 Players",
    duration: "5–10 min",
    difficulty: "Easy",
    category: "2player",
    tagline: "Connect grid lines, close boxes, and claim territory.",
    objective: "Complete the 4th side of square boxes on the grid to claim ownership and capture the highest score.",
    steps: [
      "Drawing Lines: Players take turns drawing a single horizontal or vertical line between two adjacent dots.",
      "Closing Boxes: Completing the 4th side of a 1x1 box claims it with your color and awards 1 point.",
      "Bonus Turn: Closing a box awards an immediate extra turn, enabling massive chain captures.",
      "End Game: Once all boxes on the grid are claimed, the player with the most boxes wins.",
    ],
    tips: [
      "Avoid drawing the 3rd side of any box unless you are prepared for your opponent to claim it on their turn.",
      "Create long corridor chains to sweep 8-10 boxes in a single combo turn.",
    ],
  },
  wordbuilding: {
    slug: "wordbuilding",
    title: "Word Building",
    icon: "🔤",
    players: "2 Players",
    duration: "5–10 min",
    difficulty: "Medium",
    category: "2player",
    tagline: "Test your vocabulary in real-time letter chain duels.",
    objective: "Build valid English words where each word starts with the last letter of the opponent's previous word.",
    steps: [
      "Starting: Player 1 submits any valid English word of 3 or more letters.",
      "Chaining: Player 2 must submit a valid word starting with the final letter of Player 1's word.",
      "Dictionary Check: Words are validated in real-time against verified English lexicons.",
      "Timer & Lives: Failing to enter a valid word before the turn timer expires loses a round life.",
    ],
    tips: [
      "End your words with difficult letters like X, Z, Q, or J to put maximum pressure on your opponent!",
    ],
  },
  bingo: {
    slug: "bingo",
    title: "Bingo Lounge",
    icon: "🎟️",
    players: "2–4 Players",
    duration: "5–10 min",
    difficulty: "Easy",
    category: "quick",
    tagline: "Cross 5 numbers in rows, columns, or diagonals to strike B-I-N-G-O.",
    objective: "Lock your 5x5 grid and cross off numbers called out to complete 5 distinct lines.",
    steps: [
      "Board Setup: Fill your 5x5 grid with numbers 1–25 in any custom order and lock your board.",
      "Number Calling: Players take turns calling out numbers; all players cross off that number simultaneously.",
      "Completing Lines: Completing a full horizontal, vertical, or diagonal line lights up one letter of B-I-N-G-O.",
      "Winning: The first player to complete 5 full lines shouts BINGO and wins the table.",
    ],
    tips: [
      "Distribute consecutive numbers across different quadrants of your card for optimal line overlap.",
    ],
  },
};

const CATEGORY_FILTERS = [
  { id: "all", label: "All Games" },
  { id: "2player", label: "2 Players" },
  { id: "board", label: "Board Games" },
  { id: "cards", label: "Card Games" },
  { id: "quick", label: "Quick Play (<10m)" },
];

export default function HowToPlayPage() {
  const [selectedGameRule, setSelectedGameRule] = useState<GameRuleDetail | null>(null);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredGames = useMemo(() => {
    return Object.values(GAME_RULES_CATALOG).filter((game) => {
      if (activeCategory === "all") return true;
      if (activeCategory === "2player") return game.players.includes("2") || game.category === "2player";
      if (activeCategory === "board") return game.category === "board";
      if (activeCategory === "cards") return game.category === "cards";
      if (activeCategory === "quick") return game.duration.includes("5") || game.category === "quick";
      return true;
    });
  }, [activeCategory]);

  const handleCategoryChange = (catId: string) => {
    try {
      HapticsManager.getInstance().subtle();
    } catch {
      // ignore
    }
    setActiveCategory(catId);
  };

  const handlePrint = () => {
    try {
      HapticsManager.getInstance().subtle();
    } catch {
      // ignore
    }
    window.print();
  };

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedGameRule) {
        setSelectedGameRule(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedGameRule]);

  return (
    <HelpLayout
      title="How to Play"
      subtitle="Official rulebooks, match mechanics, and winning strategies for all 16+ Indian nostalgic games."
      badgeText="Lounge Rulebook"
    >
      <div className="space-y-10 text-stone-800 dark:text-slate-100">
        {/* ── Quick Header Actions & Print Button ── */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              {filteredGames.length} Official Game Guides
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-stone-700 dark:text-slate-300 bg-white dark:bg-[#151A2E] border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-slate-800 transition shadow-2xs cursor-pointer min-h-[44px] focus-visible:outline-2 focus-visible:outline-amber-500"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Rulebook</span>
            </button>

            <button
              onClick={() => setJoinModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-sm transition min-h-[44px] cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Join a Lounge</span>
            </button>
          </div>
        </div>

        {/* ── Visual Cheat Sheets Strip (Audience Power) ── */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Rummy Cheat Sheet */}
          <div className="rounded-3xl p-0.5 bg-gradient-to-b from-amber-500/25 to-transparent shadow-xs">
            <div className="rounded-[22px] p-5 sm:p-6 bg-white/95 dark:bg-[#111827]/95 border border-stone-200/80 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🎴</span> CHEAT SHEET • RUMMY
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Golden Rule
                </span>
              </div>
              <h3 className="font-bold text-sm sm:text-base text-stone-900 dark:text-white">
                Pure vs. Impure Sequences
              </h3>
              <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed">
                You cannot declare in 13-Card Rummy without at least <strong className="text-amber-600 dark:text-amber-400">1 Pure Sequence</strong> (3+ consecutive cards of same suit with ZERO jokers).
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300/60 dark:border-emerald-700/40 text-emerald-800 dark:text-emerald-300">
                  <div className="font-bold mb-1">✓ Pure Sequence</div>
                  <div className="text-xs font-black">4♠ • 5♠ • 6♠</div>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300/60 dark:border-amber-700/40 text-amber-800 dark:text-amber-300">
                  <div className="font-bold mb-1">✓ Impure (w/ Joker)</div>
                  <div className="text-xs font-black">7♥ • 8♥ • 🃏</div>
                </div>
              </div>
            </div>
          </div>

          {/* Ludo Cheat Sheet */}
          <div className="rounded-3xl p-0.5 bg-gradient-to-b from-sky-500/25 to-transparent shadow-xs">
            <div className="rounded-[22px] p-5 sm:p-6 bg-white/95 dark:bg-[#111827]/95 border border-stone-200/80 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-black text-sky-600 dark:text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🎲</span> CHEAT SHEET • LUDO
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                  Tactical Sanctuary
                </span>
              </div>
              <h3 className="font-bold text-sm sm:text-base text-stone-900 dark:text-white">
                Safe Star Sanctuaries & Bonus Turns
              </h3>
              <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed">
                Tokens resting on star cells (★) can never be cut. Cutting an opponent's token or rolling a 6 grants an immediate bonus roll!
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                <div className="p-2.5 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-300/60 dark:border-sky-700/40 text-sky-800 dark:text-sky-300">
                  <div className="font-bold mb-1">★ Star Cells</div>
                  <div>Cannot be captured</div>
                </div>
                <div className="p-2.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-300/60 dark:border-purple-700/40 text-purple-800 dark:text-purple-300">
                  <div className="font-bold mb-1">⚡ Bonus Rolls</div>
                  <div>Roll 6 or Cut Token</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 1: Your First Game in 4 Easy Steps ── */}
        <section className="rounded-3xl p-0.5 bg-gradient-to-b from-amber-500/20 via-stone-300/20 dark:via-white/5 to-transparent shadow-sm">
          <div className="rounded-[22px] p-6 sm:p-8 bg-white/95 dark:bg-[#111827]/95 border border-stone-200/80 dark:border-white/10 space-y-6">
            <div className="text-center max-w-xl mx-auto space-y-1">
              <h3 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white">
                Your First Game in 4 Easy Steps
              </h3>
              <p className="text-xs sm:text-sm text-stone-500 dark:text-slate-400">
                Multiplayer-first, zero downloads required, instant nostalgic fun in your browser.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-stone-50 dark:bg-[#162035] border border-stone-200/70 dark:border-white/10 rounded-2xl p-5 space-y-2 hover:border-amber-500/40 transition">
                <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono block">
                  01
                </span>
                <h4 className="font-bold text-sm text-stone-900 dark:text-white">Choose a Game</h4>
                <p className="text-xs text-stone-500 dark:text-slate-400 leading-relaxed">
                  Browse our catalog of Indian childhood favorites — Hand Cricket, Ludo, Classic Rummy, UNO, and more.
                </p>
              </div>

              <div className="bg-stone-50 dark:bg-[#162035] border border-stone-200/70 dark:border-white/10 rounded-2xl p-5 space-y-2 hover:border-amber-500/40 transition">
                <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono block">
                  02
                </span>
                <h4 className="font-bold text-sm text-stone-900 dark:text-white">Create or Join</h4>
                <p className="text-xs text-stone-500 dark:text-slate-400 leading-relaxed">
                  Instantly generate a 6-character room code, or enter a friend's code to join their active lounge.
                </p>
              </div>

              <div className="bg-stone-50 dark:bg-[#162035] border border-stone-200/70 dark:border-white/10 rounded-2xl p-5 space-y-2 hover:border-amber-500/40 transition">
                <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono block">
                  03
                </span>
                <h4 className="font-bold text-sm text-stone-900 dark:text-white">Invite Friends</h4>
                <p className="text-xs text-stone-500 dark:text-slate-400 leading-relaxed">
                  Share your room invite via WhatsApp, Web Share link, or QR code. No login required for guests to join.
                </p>
              </div>

              <div className="bg-stone-50 dark:bg-[#162035] border border-stone-200/70 dark:border-white/10 rounded-2xl p-5 space-y-2 hover:border-amber-500/40 transition">
                <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono block">
                  04
                </span>
                <h4 className="font-bold text-sm text-stone-900 dark:text-white">Play &amp; Relive</h4>
                <p className="text-xs text-stone-500 dark:text-slate-400 leading-relaxed">
                  Enjoy real-time turns, send nostalgic sound reactions, talk over WebRTC voice, and play instant rematches.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 2: Interactive Filter Bar & Game Rules Catalog ── */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-4">
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-500" />
                <span>Game Rules Directory</span>
              </h3>
              <p className="text-xs sm:text-sm text-stone-500 dark:text-slate-400 mt-0.5">
                Select any game below to review full official rules, player counts, and win strategies.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] touch-pan-x py-1">
              {CATEGORY_FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => handleCategoryChange(f.id)}
                  type="button"
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition min-h-[38px] whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500 ${
                    activeCategory === f.id
                      ? "bg-amber-500 text-stone-950 shadow-2xs font-extrabold"
                      : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-slate-400 hover:bg-stone-200 dark:hover:bg-stone-700"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredGames.map((game) => (
              <div
                key={game.slug}
                className="rounded-3xl p-0.5 bg-gradient-to-b from-amber-500/15 to-transparent hover:from-amber-500/35 transition-all shadow-xs group flex flex-col"
              >
                <div className="rounded-[22px] p-5 bg-white/95 dark:bg-[#111827]/95 border border-stone-200/80 dark:border-white/10 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl">{game.icon}</span>
                      <span className="text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-slate-300">
                        {game.difficulty}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-stone-900 dark:text-white">
                        {game.title}
                      </h4>
                      <p className="text-xs text-stone-500 dark:text-slate-400 line-clamp-2 mt-1">
                        {game.tagline}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-stone-400 font-medium pt-1">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-amber-500" />
                        {game.players}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-stone-400" />
                        {game.duration}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 space-y-1.5">
                    <button
                      onClick={() => setSelectedGameRule(game)}
                      type="button"
                      className="w-full py-2 px-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-500 hover:text-stone-950 text-[#EA580C] dark:text-amber-400 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px] focus-visible:outline-2 focus-visible:outline-amber-500"
                    >
                      <span>Read Rules</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <Link
                      to="/games"
                      className="w-full py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-slate-400 text-[11px] font-bold transition flex items-center justify-center gap-1 min-h-[36px]"
                    >
                      <Gamepad2 className="w-3 h-3" />
                      <span>Play vs Bots</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 3: Core Platform Concepts ── */}
        <section className="space-y-4">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <h3 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white">
              How BHALYAM Works
            </h3>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-slate-400">
              Understanding Lounges, Bots, and our server-authoritative multiplayer platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="rounded-3xl p-0.5 bg-gradient-to-b from-amber-500/20 to-transparent shadow-xs">
              <div className="rounded-[22px] p-6 bg-white/95 dark:bg-[#111827]/95 border border-stone-200/80 dark:border-white/10 space-y-3">
                <span className="text-2xl block">🏠</span>
                <h4 className="font-bold text-base text-stone-900 dark:text-white">Digital Lounges</h4>
                <p className="text-xs text-stone-500 dark:text-slate-400 leading-relaxed">
                  A lounge is your private digital room. The room host selects the game options while friends join seamlessly with the 6-character room code.
                </p>
                <ul className="text-xs text-stone-600 dark:text-slate-300 space-y-1.5 pt-2 border-t border-stone-100 dark:border-stone-800">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Host controls start &amp; options</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Automatic host failover</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="rounded-3xl p-0.5 bg-gradient-to-b from-purple-500/20 to-transparent shadow-xs">
              <div className="rounded-[22px] p-6 bg-white/95 dark:bg-[#111827]/95 border border-stone-200/80 dark:border-white/10 space-y-3">
                <span className="text-2xl block">🤖</span>
                <h4 className="font-bold text-base text-stone-900 dark:text-white">Intelligent Bot Seats</h4>
                <p className="text-xs text-stone-500 dark:text-slate-400 leading-relaxed">
                  Can't find enough friends? Add an automated bot with a single tap. BHALYAM bots run on human-like think delays and fair server-computed heuristics.
                </p>
                <ul className="text-xs text-stone-600 dark:text-slate-300 space-y-1.5 pt-2 border-t border-stone-100 dark:border-stone-800">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                    <span>Nostalgic bot names (Pintu, Chintu)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                    <span>Server-authoritative (never cheats)</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="rounded-3xl p-0.5 bg-gradient-to-b from-blue-500/20 to-transparent shadow-xs">
              <div className="rounded-[22px] p-6 bg-white/95 dark:bg-[#111827]/95 border border-stone-200/80 dark:border-white/10 space-y-3">
                <span className="text-2xl block">⚡</span>
                <h4 className="font-bold text-base text-stone-900 dark:text-white">Network Resilience</h4>
                <p className="text-xs text-stone-500 dark:text-slate-400 leading-relaxed">
                  Internet hiccups happen. BHALYAM automatically reserves your seat for 600 seconds with cryptographic tokens, allowing instant reconnection without losing turns.
                </p>
                <ul className="text-xs text-stone-600 dark:text-slate-300 space-y-1.5 pt-2 border-t border-stone-100 dark:border-stone-800">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>10-minute seat reservation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Pass &amp; Play for 1 shared phone</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── Game Rules Modal ── */}
      {selectedGameRule && (
        <Modal
          open={Boolean(selectedGameRule)}
          onClose={() => setSelectedGameRule(null)}
          ariaLabel={`${selectedGameRule.title} Official Rules`}
          panelClassName="bg-white dark:bg-[#151A2E] border border-stone-200 dark:border-[#222A44] rounded-3xl p-6 sm:p-8 shadow-2xl max-w-2xl w-full text-left max-h-[85vh] overflow-y-auto"
        >
          <div className="space-y-6">
            <div className="flex items-start justify-between border-b border-stone-200 dark:border-[#222A44] pb-4">
              <div className="flex items-center gap-3.5">
                <span className="text-4xl">{selectedGameRule.icon}</span>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-stone-900 dark:text-white">
                    {selectedGameRule.title} Rules
                  </h2>
                  <div className="flex items-center gap-3 text-xs text-stone-400 font-medium mt-1">
                    <span>👥 {selectedGameRule.players}</span>
                    <span>•</span>
                    <span>⏱️ {selectedGameRule.duration}</span>
                    <span>•</span>
                    <span className="text-amber-500 font-bold">{selectedGameRule.difficulty}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedGameRule(null)}
                aria-label="Close rule details"
                className="w-9 h-9 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 flex items-center justify-center hover:bg-stone-200 dark:hover:bg-stone-700 transition cursor-pointer min-h-[44px] min-w-[44px] focus-visible:outline-2 focus-visible:outline-amber-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-4">
              <h4 className="text-xs font-bold text-[#EA580C] dark:text-amber-400 uppercase tracking-wider">
                Objective
              </h4>
              <p className="text-xs sm:text-sm text-stone-700 dark:text-slate-300 font-medium leading-relaxed">
                {selectedGameRule.objective}
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                Step-by-Step Gameplay
              </h4>
              <div className="space-y-2">
                {selectedGameRule.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-2xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200/70 dark:border-white/10"
                  >
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-xs sm:text-sm text-stone-700 dark:text-slate-300 leading-relaxed">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {selectedGameRule.tips.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span>Winning Strategy Tips</span>
                </h4>
                <div className="space-y-1.5">
                  {selectedGameRule.tips.map((tip, idx) => (
                    <p
                      key={idx}
                      className="text-xs text-stone-600 dark:text-slate-400 italic pl-3 border-l-2 border-amber-500"
                    >
                      "{tip}"
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center gap-3">
              <Link
                to="/games"
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs text-center shadow-md hover:from-amber-600 hover:to-orange-600 transition min-h-[44px] flex items-center justify-center"
              >
                Play {selectedGameRule.title} Now
              </Link>
              <button
                onClick={() => setSelectedGameRule(null)}
                className="py-3 px-5 rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-slate-300 font-bold text-xs hover:bg-stone-200 transition cursor-pointer min-h-[44px]"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Join Room Modal ── */}
      {joinModalOpen && (
        <JoinRoomModal
          open={joinModalOpen}
          onClose={() => setJoinModalOpen(false)}
        />
      )}
    </HelpLayout>
  );
}
