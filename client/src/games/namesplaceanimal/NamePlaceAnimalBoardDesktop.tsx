import { useState, useEffect } from "react";
import type { NamePlaceAnimalAnswers, NamePlaceAnimalCategory, NamePlaceAnimalPublicState } from "@shared/types";
import { motion, AnimatePresence } from "framer-motion";
import type { NamePlaceAnimalBoardProps } from "./NamePlaceAnimalBoardMobile";

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

export default function NamePlaceAnimalBoardDesktop({
  state,
  myAnswers: initialMyAnswers,
  myPlayerId,
  onMove,
}: NamePlaceAnimalBoardProps) {
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

  // 1-second interval tick for live countdown display
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
    <div className={`min-h-[calc(100vh-6rem)] max-w-6xl mx-auto p-6 text-ink-hi font-sans grid grid-cols-12 gap-6 relative transition-all duration-300 ${
      isStopped ? "animate-shake bg-red-950/20" : ""
    }`}>
      {/* Left Column (Input Form & Summary) */}
      <div className="col-span-8 space-y-6 flex flex-col justify-between">
        {/* 🚨 Emergency STOP Lockdown Siren Banner */}
        {isStopped && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-4 bg-red-600 text-white rounded-2xl shadow-2xl border-2 border-red-300 text-center font-extrabold animate-pulse space-y-1"
          >
            <div className="text-base uppercase tracking-widest flex items-center justify-center gap-2">
              <span>🚨</span> EMERGENCY STOP SLAMMED! <span>🚨</span>
            </div>
            <p className="text-xs">5-second lockdown countdown initiated! Submit your answers now!</p>
          </motion.div>
        )}

        {/* Banner with 30s Countdown */}
        <div className="bg-surface-0 border border-brand-500/30 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-ink-mid">
            <span>Round {state.round} of {state.totalRounds} • {state.themePack?.toUpperCase() ?? "CLASSIC"}</span>
            <button
              onClick={() => setShowClues(!showClues)}
              className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500/30 font-bold transition text-xs cursor-pointer"
            >
              💡 {showClues ? "Hide Clues" : "Need a Clue?"}
            </button>
          </div>

          <div className="flex items-center justify-between gap-6 p-4 bg-surface-1 border border-surface-rim rounded-xl">
            <div className="flex items-center gap-4">
              {/* 🔤 3D Roulette Letter Spinner */}
              <AnimatePresence mode="wait">
                {isSpinningWheel ? (
                  <motion.div
                    key="roulette-spin-desktop"
                    animate={{ rotateY: [0, 720, 1440], scale: [0.8, 1.3, 1] }}
                    transition={{ duration: 1.2, ease: "easeInOut" }}
                    className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-600 to-amber-300 text-white font-display text-4xl flex items-center justify-center shadow-2xl border-4 border-amber-200"
                  >
                    🎲
                  </motion.div>
                ) : (
                  <motion.div
                    key={letter}
                    initial={{ rotateY: 180, scale: 0.3, opacity: 0 }}
                    animate={{ rotateY: 360, scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 15 }}
                    className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 text-white font-display text-5xl flex items-center justify-center shadow-2xl border-4 border-amber-200/60 animate-glow-pulse"
                  >
                    {letter}
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <h2 className="text-2xl font-bold text-ink-hi font-display">Target Letter: '{letter}'</h2>
                <p className="text-xs text-ink-mute">
                  Fill all 4 categories starting with the letter <strong className="text-amber-500 font-bold">'{letter}'</strong>
                </p>
              </div>
            </div>

            {state.phase === "playing" && (
              <div className="text-right min-w-[140px]">
                <div className={`text-2xl font-bold font-mono ${secondsLeft <= 5 || isStopped ? "text-red-500 animate-pulse" : "text-amber-600 dark:text-amber-400"}`}>
                  ⏱️ {secondsLeft}s
                </div>
                <div className="w-36 h-2.5 bg-surface-0 rounded-full overflow-hidden border border-surface-rim mt-1">
                  <motion.div
                    className={`h-full transition-all duration-1000 ${
                      secondsLeft <= 5 || isStopped ? "bg-red-500 animate-pulse" : "bg-gradient-to-r from-amber-400 to-orange-500"
                    }`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Per-Category Clue Selector Drawer */}
        <AnimatePresence>
          {showClues && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 shadow-xl space-y-3 overflow-hidden text-xs"
            >
              <div className="font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider text-xs flex justify-between">
                <span>💡 Select a Category for a Clue (-50% points)</span>
                <span className="text-[10px] opacity-80">Correct score reduces from 10 pts → 5 pts for revealed clue</span>
              </div>
              <div className="grid grid-cols-4 gap-3 text-xs">
                {categoryKeys.map((cat, idx) => {
                  const label = categoryLabels[idx];
                  const isRevealed = revealedClues.has(cat);
                  return (
                    <div key={cat} className="bg-surface-0 p-3 rounded-xl border border-surface-rim flex flex-col justify-between space-y-2">
                      <span className="font-bold text-amber-600 dark:text-amber-400 text-xs uppercase">{label}</span>
                      {isRevealed ? (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-xs leading-relaxed block">
                          {clues[cat]}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRequestCategoryClue(cat)}
                          className="py-1.5 px-2 rounded bg-amber-500/20 text-amber-800 dark:text-amber-200 font-bold hover:bg-amber-500/30 transition text-xs text-center cursor-pointer"
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

        {/* Main Playing Phase (Desktop Grid) */}
        {state.phase === "playing" && (
          <form onSubmit={handleSubmit} className="bg-surface-0 border border-surface-rim rounded-2xl p-6 shadow-xl space-y-6 flex-1 flex flex-col justify-between">
            <div className="grid grid-cols-2 gap-4">
              {categoryKeys.map((cat, idx) => {
                const label = categoryLabels[idx];
                const val = form[cat];
                const isValidLetter = !val.trim() || val.trim()[0].toUpperCase() === letter;
                const isClueRevealed = revealedClues.has(cat);
                return (
                  <div key={cat} className="bg-surface-1 border border-surface-rim rounded-xl p-4 shadow-sm space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300">
                        {label}
                      </label>
                      {!isClueRevealed ? (
                        <button
                          type="button"
                          onClick={() => handleRequestCategoryClue(cat)}
                          className="text-xs text-amber-600 dark:text-amber-300 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        >
                          💡 Get Clue (-50% pts)
                        </button>
                      ) : (
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 truncate max-w-[200px]">
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
                      className={`w-full px-4 py-2.5 bg-surface-0 border ${
                        !isValidLetter ? "border-red-500 text-red-600 dark:text-red-300" : "border-surface-rim text-ink-hi"
                      } rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-60`}
                    />
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="pt-2">
              {!hasSubmitted ? (
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="submit"
                    className="w-full py-3.5 px-6 rounded-xl bg-brand-500 hover:bg-brand-600 font-bold text-base text-white shadow-lg transition active:scale-95 cursor-pointer"
                  >
                    Submit Answers
                  </button>
                  <button
                    type="button"
                    onClick={handleStop}
                    disabled={!isAllFilled}
                    className={`w-full py-3.5 px-6 rounded-xl font-extrabold text-base text-white shadow-lg transition active:scale-95 ${
                      isAllFilled
                        ? "bg-red-600 hover:bg-red-700 animate-bounce cursor-pointer border-2 border-red-300"
                        : "bg-surface-1 text-ink-mute opacity-50 cursor-not-allowed border border-surface-rim"
                    }`}
                  >
                    🚨 STOP CLOCK!
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-center">
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    Answers submitted! Waiting for round summary...
                  </p>
                </div>
              )}
            </div>
          </form>
        )}

        {/* Round Summary Phase */}
        {state.phase === "roundSummary" && state.allAnswers && (
          <div className="bg-surface-0 border border-surface-rim rounded-2xl p-6 shadow-xl space-y-6 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Round {state.round} Category Scoring Summary
              </h2>

              <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                {state.seatOrder.map((pid) => {
                  const player = state.players.find((p) => p.id === pid);
                  const pAns = state.allAnswers?.[pid];
                  const pCatScores = state.categoryScores?.[pid];
                  const pRoundTotal = state.roundScores?.[pid] ?? 0;

                  return (
                    <div
                      key={pid}
                      className={`p-4 rounded-xl border ${
                        pid === myPlayerId
                          ? "bg-amber-500/10 border-amber-500/40"
                          : "bg-surface-1 border-surface-rim"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-bold text-sm text-ink-hi">
                          {player?.id === myPlayerId ? "You" : `Player (${pid.slice(0, 5)})`}
                        </span>
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
                          +{pRoundTotal} pts
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {categoryKeys.map((cat, idx) => {
                          const label = categoryLabels[idx];
                          const word = pAns?.[cat] || "—";
                          const pts = pCatScores?.[cat] ?? 0;
                          return (
                            <div
                              key={cat}
                              className="bg-surface-0 p-2.5 rounded-lg border border-surface-rim flex justify-between items-center"
                            >
                              <span className="text-ink-mute uppercase text-xs font-bold">{label}:</span>
                              <span className="font-semibold text-ink-hi truncate max-w-[120px]">
                                {word}
                              </span>
                              <span
                                className={`text-xs font-bold ${
                                  pts === 10
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : pts === 5
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-red-600 dark:text-red-400"
                                }`}
                              >
                                ({pts} pts)
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
              className="w-full py-3.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 font-bold text-sm text-black shadow-lg transition active:scale-95 cursor-pointer"
            >
              Continue to Next Round →
            </button>
          </div>
        )}
      </div>

      {/* Right Column (Match Leaderboard & Scoring Rules) */}
      <div className="col-span-4 flex flex-col space-y-6">
        <div className="bg-surface-0 border border-surface-rim rounded-2xl p-6 shadow-xl flex-1 space-y-4">
          <h2 className="text-base font-bold text-ink-hi uppercase tracking-wider">
            Match Leaderboard
          </h2>

          <div className="space-y-3">
            {state.players.map((p) => (
              <div
                key={p.id}
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  p.id === myPlayerId
                    ? "bg-amber-500/10 border-amber-500/30"
                    : "bg-surface-1 border-surface-rim"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      p.hasSubmitted ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                    }`}
                  />
                  <div>
                    <div className="font-bold text-sm text-ink-hi">
                      {p.id === myPlayerId ? "You" : `Player (${p.id.slice(0, 5)})`}
                    </div>
                    <div className="text-xs text-ink-mute font-medium">
                      {p.hasSubmitted ? "Submitted" : "Filling..."}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-base text-amber-600 dark:text-amber-400">{p.score} pts</div>
                  <div className="text-xs text-ink-mute">{p.roundWins} round wins</div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-surface-rim text-xs text-ink-mid space-y-2">
            <div className="font-bold text-ink-hi uppercase tracking-wider text-[11px]">Scoring Guide:</div>
            <p>• <strong>10 pts</strong> for each correct category word.</p>
            <p>• <strong>5 pts</strong> if category clue was used (-50%).</p>
            <p>• <strong>0 pts</strong> for empty/invalid entries.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
