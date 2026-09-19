import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Gamepad2,
  Users,
  ArrowRight,
  Clock,
  Printer,
  BookOpen,
  Search,
  CheckCircle2,
  Zap,
  Home,
  Bot,
} from "lucide-react";
import HelpLayout from "../components/layout/HelpLayout";
import JoinRoomModal from "../components/bhalyam/JoinRoomModal";
import { HapticsManager } from "../services/HapticsManager";
import { getAllAcademySpecs } from "../features/academy/data";
import { buildPlatformHowToPlaySchema } from "../seo/schemas/howto";
import type { GameAcademySpec } from "../features/academy/types/academy";
import { GameAcademyModal } from "../features/academy/components/GameAcademyModal";

const CATEGORY_FILTERS = [
  { id: "all", label: "All Games" },
  { id: "board", label: "Board Games" },
  { id: "cards", label: "Card Games" },
  { id: "duel", label: "Classroom & Duels" },
  { id: "retro", label: "Retro & Arcade" },
];

export default function HowToPlayPage() {
  const [selectedAcademySpec, setSelectedAcademySpec] = useState<GameAcademySpec | null>(null);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const allSpecs = useMemo(() => getAllAcademySpecs(), []);
  // The same steps the page's HowTo structured data (JSON-LD) declares, so what search
  // engines are told is exactly what a visitor can read.
  const howToSteps = useMemo(() => buildPlatformHowToPlaySchema().step, []);

  const filteredGames = useMemo(() => {
    return allSpecs.filter((game) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.slug.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeCategory === "all") return true;
      if (activeCategory === "board") return game.genre === "board";
      if (activeCategory === "cards") return game.genre === "cards";
      if (activeCategory === "duel") return game.genre === "duel" || game.genre === "classroom";
      if (activeCategory === "retro") return game.genre === "retro" || game.genre === "arcade";
      return true;
    });
  }, [allSpecs, activeCategory, searchQuery]);

  const handleCategoryChange = (catId: string) => {
    HapticsManager.getInstance().subtle();
    setActiveCategory(catId);
  };

  const handlePrint = () => {
    HapticsManager.getInstance().subtle();
    window.print();
  };

  return (
    <HelpLayout
      title="How to Play"
      subtitle="Official interactive rulebooks, mechanics, and winning strategies for all 24+ BHALYAM games."
      badgeText="Interactive Game Academy"
    >
      <div className="space-y-10 text-stone-800 dark:text-slate-100">
        {/* ── Quick Header Actions & Print Button ── */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              {filteredGames.length} Official Game Academies Available
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-stone-700 dark:text-slate-300 bg-white dark:bg-[#151A2E] border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-slate-800 transition shadow-2xs cursor-pointer min-h-[44px] focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Game List</span>
            </button>

            <button
              onClick={() => setJoinModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-sm transition min-h-[44px] cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Join a Lounge</span>
            </button>
          </div>
        </div>

        {/* ── Section 1: Interactive Search & Filters ── */}
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-500" />
                <span>Game Academy Directory</span>
              </h3>
              <p className="text-xs sm:text-sm text-stone-500 dark:text-slate-400 mt-0.5">
                Select any game to launch its live interactive sandbox, tactical cheatsheet, and official rules.
              </p>
            </div>

            {/* Live Search Input */}
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                aria-label="Search games"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search 24+ games..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-900 border border-stone-300 dark:border-stone-800 text-xs font-mono text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
              />
            </div>
          </div>

          {/* Filter Pills */}
          <div
            role="group"
            aria-label="Filter games by category"
            className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] touch-pan-x py-1"
          >
            {CATEGORY_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => handleCategoryChange(f.id)}
                type="button"
                aria-pressed={activeCategory === f.id}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition min-h-[44px] whitespace-nowrap cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  activeCategory === f.id
                    ? "bg-amber-500 text-amber-950 shadow-2xs font-extrabold"
                    : "bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-white hover:bg-stone-200 dark:hover:bg-stone-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Game Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredGames.map((game) => (
              <div
                key={game.slug}
                className="rounded-3xl p-0.5 bg-gradient-to-b from-amber-500/15 to-transparent hover:from-amber-500/35 transition-all shadow-xs group flex flex-col"
              >
                <div className="rounded-[22px] p-5 bg-white/95 dark:bg-[#111827]/95 border border-stone-200/80 dark:border-white/10 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-slate-950 shadow-sm"
                        style={{ background: game.primaryAccent }}
                      >
                        <Zap className="w-5 h-5 fill-current" />
                      </div>
                      <span className="text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-slate-300">
                        {game.difficulty}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-stone-900 dark:text-white">
                        {game.title}
                      </h4>
                      <p className="text-xs text-stone-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                        {game.tagline}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-stone-600 dark:text-slate-400 font-medium pt-1 font-mono">
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
                      onClick={() => {
                        HapticsManager.getInstance().subtle();
                        setSelectedAcademySpec(game);
                      }}
                      type="button"
                      className="w-full py-2 px-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-500 hover:text-amber-950 text-amber-900 dark:text-amber-300 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px] focus-visible:ring-2 focus-visible:ring-amber-500"
                    >
                      <span>Launch Interactive Academy</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <Link
                      to="/games"
                      className="w-full py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-slate-400 text-[11px] font-bold transition flex items-center justify-center gap-1 min-h-[44px]"
                    >
                      <Gamepad2 className="w-3 h-3" />
                      <span>Play Match</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredGames.length === 0 && (
            <p role="status" className="text-center text-sm text-stone-600 dark:text-slate-400 py-10">
              No games match your search. Try a different name or pick another category.
            </p>
          )}
        </section>

        {/* ── Section: first game in four steps (mirrors the page's HowTo structured data) ── */}
        <section className="space-y-4 pt-6" aria-labelledby="first-game-heading">
          <h3 id="first-game-heading" className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white text-center">
            Your First Game in 4 Easy Steps
          </h3>
          <ol className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {howToSteps.map((step) => (
              <li
                key={step.position}
                className="rounded-2xl p-4 bg-white/95 dark:bg-[#111827]/95 border border-stone-200/80 dark:border-white/10 flex gap-3"
              >
                <span
                  aria-hidden="true"
                  className="w-8 h-8 shrink-0 rounded-full bg-amber-500 text-amber-950 font-black text-sm flex items-center justify-center"
                >
                  {step.position}
                </span>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-stone-900 dark:text-white">{step.name}</h4>
                  <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Section 2: Core Platform Concepts ── */}
        <section className="space-y-4 pt-6">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <h3 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white">
              How BHALYAM Works
            </h3>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-slate-400">
              Understanding Digital Lounges, Bots, and our server-authoritative multiplayer architecture.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="rounded-3xl p-0.5 bg-gradient-to-b from-amber-500/20 to-transparent shadow-xs">
              <div className="rounded-[22px] p-6 bg-white/95 dark:bg-[#111827]/95 border border-stone-200/80 dark:border-white/10 space-y-3">
                <Home className="w-7 h-7 text-amber-500" aria-hidden="true" />
                <h4 className="font-bold text-base text-stone-900 dark:text-white">Digital Lounges</h4>
                <p className="text-xs text-stone-500 dark:text-slate-400 leading-relaxed">
                  A lounge is your private digital room. The room host selects game options while friends join seamlessly with a 6-character code.
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
                <Bot className="w-7 h-7 text-purple-500" aria-hidden="true" />
                <h4 className="font-bold text-base text-stone-900 dark:text-white">Intelligent Bot Seats</h4>
                <p className="text-xs text-stone-500 dark:text-slate-400 leading-relaxed">
                  Can't find enough friends? Add an automated bot with a single tap. BHALYAM bots run on human-like think delays and fair heuristics.
                </p>
                <ul className="text-xs text-stone-600 dark:text-slate-300 space-y-1.5 pt-2 border-t border-stone-100 dark:border-stone-800">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                    <span>Nostalgic bot names</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                    <span>Every move is checked by the server</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="rounded-3xl p-0.5 bg-gradient-to-b from-blue-500/20 to-transparent shadow-xs">
              <div className="rounded-[22px] p-6 bg-white/95 dark:bg-[#111827]/95 border border-stone-200/80 dark:border-white/10 space-y-3">
                <Zap className="w-7 h-7 text-blue-500" aria-hidden="true" />
                <h4 className="font-bold text-base text-stone-900 dark:text-white">Network Resilience</h4>
                <p className="text-xs text-stone-500 dark:text-slate-400 leading-relaxed">
                  BHALYAM reserves your seat for 90 seconds with cryptographic tokens, allowing instant reconnection without losing turns.
                </p>
                <ul className="text-xs text-stone-600 dark:text-slate-300 space-y-1.5 pt-2 border-t border-stone-100 dark:border-stone-800">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Cryptographic seatToken ownership</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Pass &amp; Play local phone shielding</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── Interactive Game Academy Modal ── */}
      {selectedAcademySpec && (
        <GameAcademyModal
          open={Boolean(selectedAcademySpec)}
          spec={selectedAcademySpec}
          initialMode="walkthrough"
          onClose={() => setSelectedAcademySpec(null)}
        />
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
