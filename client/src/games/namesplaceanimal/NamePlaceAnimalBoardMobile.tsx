import { useState, useEffect } from "react";
import type { ChatMessage, NamePlaceAnimalAnswers, NamePlaceAnimalCategory, NamePlaceAnimalPublicState, Player } from "@shared/types";
import { motion, AnimatePresence } from "framer-motion";
import InlineRoomRail from "../../components/InlineRoomRail";
import FloatingReactionsLayer from "../../components/reactions/FloatingReactionsLayer";
import { useSeatReactions } from "../../components/reactions/useSeatReactions";
import { NpatLetterRevealBurst, NpatWinnerCelebration } from "./NpatAnimations";

import GameThemeToggle from "../../components/theme/GameThemeToggle";
import type { GameSkinTheme } from "../../hooks/useGameTheme";

export interface NamePlaceAnimalBoardProps {
  state: NamePlaceAnimalPublicState;
  myAnswers: NamePlaceAnimalAnswers;
  myPlayerId: string;
  onMove: (type: string, data?: unknown) => void;
  players?: Player[];
  messages?: ChatMessage[];
  roomCode?: string;
  roomPhase?: string;
  theme?: GameSkinTheme;
  toggleTheme?: () => void;
  isNotebook?: boolean;
  isNeon?: boolean;
}

const SAMPLE_CLUES: Record<string, Record<NamePlaceAnimalCategory, string>> = {
  A: { name: "Arjun, Anil, Alice", place: "Amsterdam, Agra, Austin", animal: "Alligator, Anteater, Ant", thing: "Apple, Anchor, Arrow" },
  B: { name: "Bhavana, Balaji, Ben", place: "Bengaluru, Berlin, Boston", animal: "Bear, Bat, Buffalo", thing: "Ball, Book, Bottle" },
  C: { name: "Charan, Cynthia, Chris", place: "Chennai, Chicago, Cairo", animal: "Cat, Camel, Cheetah", thing: "Car, Camera, Chair" },
  D: { name: "Deepak, David, Divya", place: "Delhi, Dallas, Dublin", animal: "Dog, Donkey, Deer", thing: "Door, Drum, Desk" },
  E: { name: "Eswar, Emily, Eric", place: "Edinburgh, Egypt, Ecuador", animal: "Elephant, Eagle, Eel", thing: "Envelope, Eraser, Engine" },
  F: { name: "Farhan, Felix, Fiona", place: "France, Frankfurt, Fiji", animal: "Fox, Frog, Flamingo", thing: "Fan, Fork, Feather" },
  G: { name: "Ganesh, Gautam, Grace", place: "Germany, Geneva, Greece", animal: "Giraffe, Gorilla, Goat", thing: "Glass, Guitar, Glove" },
  H: { name: "Harish, Hemant, Hannah", place: "Hyderabad, Houston, Hanoi", animal: "Horse, Hippo, Hyena", thing: "Hat, Hammer, Helmet" },
  I: { name: "Ishaan, Indira, Ian", place: "India, Indonesia, Italy", animal: "Iguana, Impala, Ibex", thing: "Ink, Iron, Ice" },
  J: { name: "Janaki, Joseph, John", place: "Jaipur, Jakarta, Japan", animal: "Jaguar, Jellyfish, Jackal", thing: "Jacket, Jar, Jeep" },
  K: { name: "Kiran, Kavya, Karthik", place: "Kochi, Kolkata, Kyoto", animal: "Kangaroo, Koala, Kiwi", thing: "Key, Kettle, Kite" },
  L: { name: "Lakshmi, Lokesh, Luke", place: "London, Los Angeles, Lisbon", animal: "Lion, Leopard, Llama", thing: "Lamp, Lock, Ladder" },
  M: { name: "Mahesh, Meena, Manish", place: "Mumbai, Madrid, Melbourne", animal: "Monkey, Mouse, Moose", thing: "Magnet, Mirror, Map" },
  N: { name: "Naveen, Nisha, Nicholas", place: "New York, Nairobi, New Delhi", animal: "Newt, Nightingale, Narwhal", thing: "Needle, Net, Notebook" },
  O: { name: "Omkar, Oliver, Olivia", place: "Oslo, Ottawa, Oxford", animal: "Owl, Octopus, Ostrich", thing: "Oven, Oil, Organ" },
  P: { name: "Pavan, Pooja, Pradeep", place: "Paris, Prague, Perth", animal: "Penguin, Panda, Panther", thing: "Pen, Pencil, Phone" },
  R: { name: "Rahul, Ramesh, Rachel", place: "Rome, Rio, Riyadh", animal: "Rabbit, Rat, Rhino", thing: "Ring, Radio, Rope" },
  S: { name: "Suresh, Sneha, Srikanth", place: "Singapore, Sydney, Seoul", animal: "Snake, Shark, Sheep", thing: "Spoon, Soap, Shoe" },
  T: { name: "Tarun, Teja, Thomas", place: "Tokyo, Toronto, Turkey", animal: "Tiger, Turtle, Toucan", thing: "Table, Telephone, Towel" },
  U: { name: "Uday, Uma, Umesh", place: "Uganda, Ukraine, Udaipur", animal: "Unicorn, Umbrellabird, Urchin", thing: "Umbrella, Uniform, Urn" },
  V: { name: "Vijay, Varun, Vikram", place: "Vienna, Vancouver, Venice", animal: "Vulture, Viper, Vole", thing: "Vase, Violin, Van" },
  W: { name: "William, Wayne, Wendy", place: "Washington, Warsaw, Wellington", animal: "Wolf, Whale, Walrus", thing: "Watch, Whistle, Wheel" },
  Y: { name: "Yash, Yogesh, Yvonne", place: "Yokohama, Yerevan, Yangon", animal: "Yak, Yellowjacket, Yabby", thing: "Yarn, Yacht, Yoyo" },
};

export default function NamePlaceAnimalBoardMobile({
  state,
  myAnswers: initialMyAnswers,
  myPlayerId,
  onMove,
  players,
  messages,
  roomCode,
  roomPhase,
  theme,
  toggleTheme,
  isNotebook,
  isNeon,
}: NamePlaceAnimalBoardProps) {
  const reactions = useSeatReactions(myPlayerId);
  const [form, setForm] = useState<NamePlaceAnimalAnswers>(() => ({
    name: initialMyAnswers?.name || "",
    place: initialMyAnswers?.place || "",
    animal: initialMyAnswers?.animal || "",
    thing: initialMyAnswers?.thing || "",
  }));
  const [showClues, setShowClues] = useState(false);
  const [revealedClues, setRevealedClues] = useState<Set<NamePlaceAnimalCategory>>(new Set());
  const [now, setNow] = useState(Date.now());
  const [isSpinningWheel, setIsSpinningWheel] = useState(true);

  // Reset form, clues & spin roulette wheel when a new round starts
  useEffect(() => {
    setForm({ name: "", place: "", animal: "", thing: "" });
    setShowClues(false);
    setRevealedClues(new Set());
    setIsSpinningWheel(true);
    const timer = setTimeout(() => setIsSpinningWheel(false), 1200);
    return () => clearTimeout(timer);
  }, [state.round, state.letter]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const letter = state.letter || "A";
  const myPlayer = state.players.find((p) => p.id === myPlayerId);
  const hasSubmitted = myPlayer?.hasSubmitted || false;

  const totalRoundSec = state.roundSeconds || 30;
  const secondsLeft = state.deadline
    ? Math.max(0, Math.ceil((state.deadline - now) / 1000))
    : totalRoundSec;
  const progressPct = Math.min(100, Math.max(0, (secondsLeft / totalRoundSec) * 100));

  const categoryKeys: NamePlaceAnimalCategory[] = ["name", "place", "animal", "thing"];
  const categoryLabels = state.categories && state.categories.length === 4
    ? state.categories
    : ["Name", "Place", "Animal", "Thing"];

  const clues = SAMPLE_CLUES[letter.toUpperCase()] ?? {
    name: `${categoryLabels[0]} starting with ${letter}`,
    place: `${categoryLabels[1]} starting with ${letter}`,
    animal: `${categoryLabels[2]} starting with ${letter}`,
    thing: `${categoryLabels[3]} starting with ${letter}`,
  };

  const handleRequestCategoryClue = (cat: NamePlaceAnimalCategory) => {
    setRevealedClues((prev) => {
      const next = new Set(prev);
      next.add(cat);
      return next;
    });
    onMove("requestClue", { category: cat });
  };

  const handleChange = (field: keyof NamePlaceAnimalAnswers, value: string) => {
    if (hasSubmitted) return;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const isAllFilled = Boolean(
    form.name.trim() && form.place.trim() && form.animal.trim() && form.thing.trim()
  );

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (hasSubmitted) return;
    onMove("submitAnswers", { ...form, usedClues: Array.from(revealedClues) });
  };

  const handleStop = () => {
    if (!isAllFilled) return;
    handleSubmit();
    onMove("stopClock");
  };

  const isStopped = Boolean(state.stoppedByPlayerId);

  return (
    <div className={`flex flex-col min-h-[calc(100vh-5rem)] max-w-md mx-auto p-4 font-sans space-y-4 transition-all duration-300 ${
      isNeon ? "bg-slate-950 text-slate-100" : isNotebook ? "bg-[#fbf8ee] text-slate-800" : "text-ink-hi"
    } ${
      isStopped ? "animate-shake bg-red-950/20" : ""
    }`}>
      {/* 🚨 Emergency STOP Lockdown Siren Banner */}
      {isStopped && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-3 bg-red-600 text-white rounded-2xl shadow-2xl border-2 border-red-300 text-center font-extrabold animate-pulse space-y-1"
        >
          <div className="text-sm uppercase tracking-widest flex items-center justify-center gap-2">
            <span>🚨</span> EMERGENCY STOP SLAMMED! <span>🚨</span>
          </div>
          <p className="text-xs">5-second lockdown countdown initiated! Submit your answers now!</p>
        </motion.div>
      )}

      {/* Header Banner */}
      <div className={`border rounded-2xl p-4 shadow-lg text-center relative overflow-hidden space-y-3 ${
        isNeon
          ? "bg-slate-900/90 border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
          : isNotebook
          ? "bg-[#fffdf8] border-amber-900/20 shadow-md ring-1 ring-amber-400/20"
          : "bg-surface-0 border-brand-500/30"
      }`}>
        <div className="flex justify-between items-center text-xs">
          <span className={`font-semibold uppercase tracking-wider ${isNeon ? "text-cyan-400" : isNotebook ? "text-amber-900/70" : "text-ink-mid"}`}>
            Round {state.round} of {state.totalRounds} • {state.themePack?.toUpperCase() ?? "CLASSIC"}
          </span>
          <div className="flex items-center gap-1.5">
            {toggleTheme && (
              <GameThemeToggle theme={theme ?? "notebook"} onToggle={toggleTheme} variant="compact" />
            )}
            <button
              onClick={() => setShowClues(!showClues)}
              className={`px-2.5 py-0.5 rounded-full font-bold cursor-pointer text-[11px] ${
                isNeon
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
              }`}
            >
              💡 {showClues ? "Close Clues" : "Need a Clue?"}
            </button>
          </div>
        </div>

        {/* 🔤 3D Roulette Letter Spinner */}
        <div className="relative py-2 flex justify-center items-center">
          <AnimatePresence mode="wait">
            {isSpinningWheel ? (
              <motion.div
                key="roulette-spin"
                animate={{ rotateY: [0, 720, 1440], scale: [0.8, 1.3, 1] }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
                className={`w-20 h-20 rounded-2xl ${
                  isNeon
                    ? "bg-gradient-to-tr from-cyan-600 via-purple-600 to-pink-500 text-white border-2 border-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                    : isNotebook
                    ? "bg-[#fffdfa] text-amber-900 border-2 border-amber-800/30 shadow-md font-serif"
                    : "bg-gradient-to-tr from-amber-500 via-orange-600 to-amber-300 text-white border-4 border-amber-200 shadow-2xl"
                } font-display text-4xl flex items-center justify-center`}
              >
                🎲
              </motion.div>
            ) : (
              <motion.div
                key={letter}
                initial={{ rotateY: 180, scale: 0.3, opacity: 0 }}
                animate={{ rotateY: 360, scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 15 }}
                className={`w-20 h-20 rounded-2xl ${
                  isNeon
                    ? "bg-gradient-to-br from-cyan-500 via-purple-600 to-pink-500 text-white border-2 border-cyan-300 shadow-[0_0_30px_rgba(168,85,247,0.5)]"
                    : isNotebook
                    ? "bg-[#fbf4e2] text-amber-900 border-2 border-amber-700/40 shadow-inner font-serif"
                    : "bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 text-white border-4 border-amber-200 shadow-2xl"
                } font-display text-5xl flex items-center justify-center animate-glow-pulse`}
              >
                {letter}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Countdown & Progress Bar */}
        {state.phase === "playing" && (
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className={`flex items-center gap-1 ${secondsLeft <= 5 || isStopped ? "text-red-500 animate-pulse font-extrabold" : isNeon ? "text-cyan-400" : "text-amber-600 dark:text-amber-400"}`}>
                ⏱️ {secondsLeft}s Left
              </span>
              <span className={`text-[10px] ${isNeon ? "text-cyan-300/70" : isNotebook ? "text-amber-900/60" : "text-ink-mute"}`}>Starts with '{letter}'</span>
            </div>
            <div className={`w-full h-2 rounded-full overflow-hidden border ${isNeon ? "bg-slate-900 border-cyan-500/30" : "bg-surface-1 border-surface-rim"}`}>
              <motion.div
                className={`h-full transition-all duration-1000 ${
                  secondsLeft <= 5 || isStopped ? "bg-red-500 animate-pulse" : isNeon ? "bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500" : "bg-gradient-to-r from-amber-400 to-orange-500"
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Per-Category Clue Drawer */}
      <AnimatePresence>
        {showClues && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`border rounded-2xl p-3 shadow-lg space-y-2 overflow-hidden text-xs ${
              isNeon
                ? "bg-cyan-950/30 border-cyan-500/30 text-cyan-200"
                : "bg-amber-500/10 border-amber-500/30"
            }`}
          >
            <div className={`font-bold uppercase tracking-wider text-[11px] ${isNeon ? "text-cyan-400" : "text-amber-700 dark:text-amber-300"}`}>
              💡 Select a Category for a Clue (-50% points)
            </div>
            <p className="text-[10px] opacity-80">
              Revealing a clue reduces correct score for that category from 10 pts to 5 pts.
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {categoryKeys.map((cat, idx) => {
                const label = categoryLabels[idx];
                const isRevealed = revealedClues.has(cat);
                return (
                  <div key={cat} className={`p-2 rounded-lg border flex flex-col justify-between ${
                    isNeon
                      ? "bg-slate-900/90 border-cyan-500/30"
                      : isNotebook
                      ? "bg-[#fffdfa] border-amber-900/20"
                      : "bg-surface-0 border-surface-rim"
                  }`}>
                    <span className={`font-bold text-[10px] uppercase ${isNeon ? "text-cyan-400" : "text-amber-600 dark:text-amber-400"}`}>{label}</span>
                    {isRevealed ? (
                      <span className="font-semibold text-emerald-400 text-[11px] block mt-1">
                        {clues[cat]}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRequestCategoryClue(cat)}
                        className={`mt-1.5 py-1 px-2 rounded font-bold transition text-[10px] text-center cursor-pointer ${
                          isNeon
                            ? "bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"
                            : "bg-amber-500/20 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30"
                        }`}
                      >
                        Get {label} clue
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Playing Phase */}
      {state.phase === "playing" && (
        <form onSubmit={handleSubmit} className="space-y-3 flex-1 flex flex-col justify-between">
          <div className="space-y-3">
            {/* Category Input Cards */}
            {categoryKeys.map((cat, idx) => {
              const label = categoryLabels[idx];
              const val = form[cat];
              const isValidLetter = !val.trim() || val.trim()[0].toUpperCase() === letter;
              const isClueRevealed = revealedClues.has(cat);
              return (
                <div key={cat} className={`border rounded-xl p-3 shadow-md ${
                  isNeon
                    ? "bg-slate-900/80 border-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.12)]"
                    : isNotebook
                    ? "bg-[#fffefc] border-amber-900/15 shadow-sm"
                    : "bg-surface-0 border-surface-rim"
                }`}>
                  <div className="flex justify-between items-center mb-1">
                    <label className={`block text-xs font-bold uppercase tracking-wider ${
                      isNeon ? "text-cyan-400" : isNotebook ? "text-amber-900" : "text-amber-600 dark:text-amber-300"
                    }`}>
                      {label}
                    </label>
                    {!isClueRevealed ? (
                      <button
                        type="button"
                        onClick={() => handleRequestCategoryClue(cat)}
                        className={`text-[10px] hover:underline font-bold flex items-center gap-1 cursor-pointer ${
                          isNeon ? "text-cyan-400" : "text-amber-600 dark:text-amber-300"
                        }`}
                      >
                        💡 Get Clue (-50% pts)
                      </button>
                    ) : (
                      <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 truncate max-w-[170px]">
                        💡 {clues[cat]}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    disabled={hasSubmitted}
                    placeholder={`${label} starting with ${letter}...`}
                    value={val}
                    onChange={(e) => handleChange(cat, e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 disabled:opacity-60 ${
                      !isValidLetter
                        ? "border-red-500 text-red-400"
                        : isNeon
                        ? "bg-slate-950/80 border-cyan-500/30 text-cyan-100 focus:border-cyan-400 focus:ring-cyan-500/40"
                        : isNotebook
                        ? "bg-[#fdfbf7] border-amber-900/20 text-slate-800 focus:ring-amber-400 font-serif"
                        : "bg-surface-1 border-surface-rim text-ink-hi focus:ring-amber-400"
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="pt-2 space-y-2">
            {!hasSubmitted ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 font-bold text-sm text-white shadow-lg transition active:scale-95 cursor-pointer"
                >
                  Submit
                </button>
                <button
                  type="button"
                  onClick={handleStop}
                  disabled={!isAllFilled}
                  className={`w-full py-3 px-4 rounded-xl font-extrabold text-sm text-white shadow-lg transition active:scale-95 ${
                    isAllFilled
                      ? "bg-red-600 hover:bg-red-700 animate-bounce cursor-pointer border-2 border-red-300"
                      : "bg-surface-1 text-ink-mute opacity-50 cursor-not-allowed border border-surface-rim"
                  }`}
                >
                  🚨 STOP!
                </button>
              </div>
            ) : (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-center">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  Answers submitted! Waiting for round summary...
                </p>
              </div>
            )}
          </div>
        </form>
      )}

      {/* Round Summary Phase */}
      {state.phase === "roundSummary" && state.allAnswers && (
        <div className="space-y-4 flex-1 flex flex-col justify-between">
          <div className="bg-surface-0 border border-surface-rim rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider text-center">
              Round {state.round} Results
            </h3>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {state.seatOrder.map((pid) => {
                const player = state.players.find((p) => p.id === pid);
                const pAns = state.allAnswers?.[pid];
                const pCatScores = state.categoryScores?.[pid];
                const pRoundTotal = state.roundScores?.[pid] ?? 0;

                return (
                  <div
                    key={pid}
                    className={`p-3 rounded-lg border ${
                      pid === myPlayerId
                        ? "bg-amber-500/10 border-amber-500/40"
                        : "bg-surface-1 border-surface-rim"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-xs text-ink-hi">
                        {player?.id === myPlayerId ? "You" : `Player (${pid.slice(0, 4)})`}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
                        +{pRoundTotal} pts
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      {categoryKeys.map((cat, idx) => {
                        const label = categoryLabels[idx];
                        const word = pAns?.[cat] || "—";
                        const pts = pCatScores?.[cat] ?? 0;
                        return (
                          <div
                            key={cat}
                            className="bg-surface-0 p-1.5 rounded border border-surface-rim flex justify-between items-center"
                          >
                            <span className="text-ink-mute uppercase text-[9px] truncate max-w-[50px]">{label}:</span>
                            <span className="font-medium text-ink-hi truncate max-w-[70px]">
                              {word}
                            </span>
                            <span
                              className={`text-[9px] font-bold ${
                                pts === 10
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : pts === 5
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              ({pts})
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => onMove("nextRound")}
            className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 font-bold text-sm text-black shadow-lg transition active:scale-95 cursor-pointer"
          >
            Next Round →
          </button>
        </div>
      )}

      {/* Finished Game Standings */}
      {state.phase === "finished" && state.standings && (
        <div className="bg-surface-0 border border-surface-rim rounded-2xl p-4 text-center space-y-4">
          <h2 className="text-2xl font-display text-amber-600 dark:text-amber-400">Game Over!</h2>
          <div className="space-y-2">
            {state.standings.map((st) => (
              <div
                key={st.playerId}
                className="flex justify-between items-center p-3 bg-surface-1 border border-surface-rim rounded-xl"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {st.rank === 0 ? "🥇" : st.rank === 1 ? "🥈" : st.rank === 2 ? "🥉" : `#${st.rank + 1}`}
                  </span>
                  <span className="font-bold text-sm text-ink-hi">
                    {st.playerId === myPlayerId ? "You" : `Player (${st.playerId.slice(0, 4)})`}
                  </span>
                </div>
                <span className="font-bold text-sm text-amber-600 dark:text-amber-400">{st.score} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* In-board chat / players / voice / reactions rail — this game never
          had one mounted, so InlineRoomRail's targeted-reaction picker had
          nowhere to trigger from. Mobile has no persistent player-identity
          row to anchor a fly-to/flinch target on (the standings above are
          transient, round-summary-only), so the flinch animation degrades to
          a plain float here — see FloatingReactionsLayer's doc comment. */}
      <div className="mt-2">
        <InlineRoomRail
          code={roomCode ?? ""}
          game="namesplaceanimal"
          phase={roomPhase ?? state.phase}
          players={players ?? []}
          selfId={myPlayerId}
          messages={messages ?? []}
        />
      </div>

      {/* GAL Animations */}
      {!isSpinningWheel && letter && (
        <NpatLetterRevealBurst letter={letter} />
      )}
      {state.phase === "finished" && state.winnerId && (
        <NpatWinnerCelebration
          winnerName={players?.find((p) => p.id === state.winnerId)?.name ?? "Winner"}
        />
      )}

      <FloatingReactionsLayer reactions={reactions.items} anchorOf={reactions.anchorOf} />
    </div>
  );
}
