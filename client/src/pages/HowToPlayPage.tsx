import React, { useState } from "react";
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
  Volume2,
} from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import Modal from "../components/Modal";
import JoinRoomModal from "../components/bhalyam/JoinRoomModal";

interface GameRuleDetail {
  slug: string;
  title: string;
  icon: string;
  players: string;
  duration: string;
  difficulty: "Easy" | "Medium" | "Strategic";
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

export default function HowToPlayPage() {
  const [selectedGameRule, setSelectedGameRule] = useState<GameRuleDetail | null>(null);
  const [joinModalOpen, setJoinModalOpen] = useState(false);

  return (
    <AppLayout showFallingPetals>
      <div className="min-h-screen bhalyam-paper py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-12">
          {/* ── Page Hero ── */}
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-[#EA580C] text-xs font-bold font-mono uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Player Guide & Rulebook</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Welcome to <span className="text-[#EA580C]">BHALYAM</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 font-medium">
              Pick a game. Call your friends. Make a memory.
            </p>

            {/* Quick Action Buttons */}
            <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/games"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-sm shadow-md transition"
              >
                <Gamepad2 className="w-4 h-4" />
                <span>Explore Games</span>
              </Link>

              <button
                onClick={() => setJoinModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white dark:bg-[#151A2E] text-slate-800 dark:text-slate-200 border border-[#EFEBE4] dark:border-[#222A44] hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-sm shadow-xs transition cursor-pointer"
              >
                <Users className="w-4 h-4 text-amber-500" />
                <span>Join a Lounge</span>
              </button>

              <Link
                to="/games"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-bold text-sm shadow-xs transition"
              >
                <PlusCircle className="w-4 h-4 text-amber-400" />
                <span>Create a Room</span>
              </Link>
            </div>
          </div>

          {/* ── Section 1: Your First Game (4-Step Journey) ── */}
          <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-6 sm:p-10 shadow-xs space-y-8">
            <div className="text-center max-w-xl mx-auto space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Your First Game in 4 Easy Steps
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Multiplayer-first, zero downloads required, instant nostalgic fun in your browser.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Step 1 */}
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-[#F3EFE9] dark:border-[#202740] rounded-2xl p-5 space-y-3 relative group hover:border-amber-500/40 transition">
                <span className="text-2xl font-black text-[#EA580C] font-mono block">
                  01
                </span>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Choose a Game
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Browse our catalog of Indian childhood favorites — Hand Cricket, Ludo, Classic Rummy, UNO, and more.
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-[#F3EFE9] dark:border-[#202740] rounded-2xl p-5 space-y-3 relative group hover:border-amber-500/40 transition">
                <span className="text-2xl font-black text-[#EA580C] font-mono block">
                  02
                </span>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Create or Join
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Instantly generate a 6-character room code, or enter a friend's code to join their active lounge.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-[#F3EFE9] dark:border-[#202740] rounded-2xl p-5 space-y-3 relative group hover:border-amber-500/40 transition">
                <span className="text-2xl font-black text-[#EA580C] font-mono block">
                  03
                </span>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Invite Friends
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Share your room invite via WhatsApp, Web Share link, or QR code. No login required for guests to join.
                </p>
              </div>

              {/* Step 4 */}
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-[#F3EFE9] dark:border-[#202740] rounded-2xl p-5 space-y-3 relative group hover:border-amber-500/40 transition">
                <span className="text-2xl font-black text-[#EA580C] font-mono block">
                  04
                </span>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Play & Relive
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Enjoy real-time turns, send nostalgic sound reactions, talk over WebRTC voice, and play instant rematches.
                </p>
              </div>
            </div>
          </div>

          {/* ── Section 2: How BHALYAM Works (Core Concepts) ── */}
          <div className="space-y-6">
            <div className="text-center max-w-xl mx-auto space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                How BHALYAM Works
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Understanding Lounges, Bots, and our server-authoritative multiplayer platform.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Lounges */}
              <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-6 space-y-4 shadow-xs">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center text-xl">
                  🏠
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Digital Lounges
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  A lounge is your private digital room. The room host selects the game options (e.g. max players, round targets), while friends join seamlessly with the 6-character room code.
                </p>
                <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2 pt-2 border-t border-[#F3EFE9] dark:border-[#222A44]">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Host controls start & game options</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Automatic host migration if host leaves</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Seamless rematch negotiations</span>
                  </li>
                </ul>
              </div>

              {/* Card 2: Playing with Bots */}
              <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-6 space-y-4 shadow-xs">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-500 flex items-center justify-center text-xl">
                  🤖
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Intelligent Bot Seats
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Can't find enough friends? Add an automated bot with a single tap. BHALYAM bots run on realistic human-like think delays and fair server-computed heuristics.
                </p>
                <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2 pt-2 border-t border-[#F3EFE9] dark:border-[#222A44]">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                    <span>Customizable bot names (Pintu, Chintu)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                    <span>Replaces disconnected players automatically</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                    <span>Server-authoritative (never cheats)</span>
                  </li>
                </ul>
              </div>

              {/* Card 3: Realtime & Reconnect */}
              <div className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-6 space-y-4 shadow-xs">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center text-xl">
                  ⚡
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Network Resilience
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Internet hiccups happen. BHALYAM automatically reserves your seat for 600 seconds with cryptographic tokens, allowing instant reconnection without losing game state.
                </p>
                <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2 pt-2 border-t border-[#F3EFE9] dark:border-[#222A44]">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>10-minute seat holding grace period</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Auto-play moves during disconnection</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Pass & Play for 1 shared device</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* ── Section 3: Visual Game Rules Catalog ── */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EFEBE4] dark:border-[#222A44] pb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>📖 Game Rules Directory</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Select any game below to review full official rules, player counts, and win strategies.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.values(GAME_RULES_CATALOG).map((game) => (
                <div
                  key={game.slug}
                  className="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-5 space-y-3.5 shadow-xs hover:shadow-md transition flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl">{game.icon}</span>
                      <span className="text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {game.difficulty}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        {game.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                        {game.tagline}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium pt-1">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-amber-500" />
                        {game.players}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {game.duration}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedGameRule(game)}
                    className="w-full py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-500 hover:text-white text-[#EA580C] dark:text-amber-400 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                  >
                    <span>Read Game Rules</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ── Section 4: Multiplayer FAQ Quick Strip ── */}
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/25 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                Have specific questions about scoring, bans, or account XP?
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Explore our full community guidelines and answers in the Support & FAQ hub.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                to="/community-rules"
                className="px-5 py-2.5 rounded-xl bg-white dark:bg-[#151A2E] text-slate-800 dark:text-slate-200 border border-[#EFEBE4] dark:border-[#222A44] hover:bg-slate-50 font-bold text-xs shadow-xs transition"
              >
                Community Rules
              </Link>
              <Link
                to="/support"
                className="px-5 py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
              >
                <span>Support & FAQs</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Game Rules Modal ── */}
      {selectedGameRule && (
        <Modal
          open={Boolean(selectedGameRule)}
          onClose={() => setSelectedGameRule(null)}
          ariaLabel={`${selectedGameRule.title} Official Rules`}
          panelClassName="bg-white dark:bg-[#151A2E] border border-[#EFEBE4] dark:border-[#222A44] rounded-3xl p-6 sm:p-8 shadow-2xl max-w-2xl w-full text-left max-h-[85vh] overflow-y-auto"
        >
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[#EFEBE4] dark:border-[#222A44] pb-4">
              <div className="flex items-center gap-3.5">
                <span className="text-4xl">{selectedGameRule.icon}</span>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                    {selectedGameRule.title} Rules
                  </h2>
                  <div className="flex items-center gap-3 text-xs text-slate-400 font-medium mt-1">
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
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Objective */}
            <div className="space-y-1.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-4">
              <h4 className="text-xs font-bold text-[#EA580C] uppercase tracking-wider">
                Objective
              </h4>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                {selectedGameRule.objective}
              </p>
            </div>

            {/* Step-by-Step Rules */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Step-by-Step Gameplay
              </h4>
              <div className="space-y-2.5">
                {selectedGameRule.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-[#F3EFE9] dark:border-[#252D4A]"
                  >
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Strategy & Pro Tips */}
            {selectedGameRule.tips.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span>Winning Strategy Tips</span>
                </h4>
                <div className="space-y-1.5">
                  {selectedGameRule.tips.map((tip, idx) => (
                    <p
                      key={idx}
                      className="text-xs text-slate-600 dark:text-slate-400 italic pl-3 border-l-2 border-amber-500"
                    >
                      "{tip}"
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Action Footer */}
            <div className="pt-2 flex items-center gap-3">
              <Link
                to="/games"
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs text-center shadow-md hover:from-amber-600 hover:to-orange-600 transition"
              >
                Play {selectedGameRule.title} Now
              </Link>
              <button
                onClick={() => setSelectedGameRule(null)}
                className="py-3 px-5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 transition cursor-pointer"
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
    </AppLayout>
  );
}
