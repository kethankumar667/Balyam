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
  const [now, setNow] = useState(Date.now());

  // Reset form when a new round starts (letter/round changes)
  useEffect(() => {
    setForm({ name: "", place: "", animal: "", thing: "" });
    setShowClues(false);
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

  const clues = SAMPLE_CLUES[letter.toUpperCase()] ?? {
    name: `Name starting with ${letter}`,
    place: `City/Country starting with ${letter}`,
    animal: `Animal starting with ${letter}`,
    thing: `Object starting with ${letter}`,
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
    onMove("submitAnswers", form);
  };

  const handleStop = () => {
    if (!isAllFilled) return;
    handleSubmit();
    onMove("stopClock");
  };

  return (
    <div className="min-h-[calc(100vh-6rem)] max-w-6xl mx-auto p-6 text-ink-hi font-sans grid grid-cols-12 gap-6">
      {/* Left Workspace Column (Inputs & Controls) */}
      <div className="col-span-7 flex flex-col justify-between space-y-6">
        {/* Banner Header with 30s Live Countdown Timer */}
        <div className="bg-surface-0 border border-brand-500/30 rounded-2xl p-6 shadow-xl space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <span>Round {state.round} of {state.totalRounds}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300">
                  30s Speed Round
                </span>
              </div>
              <h1 className="text-2xl font-display text-ink-hi mt-1">Name Place Animal Thing</h1>
              <p className="text-xs text-ink-mid mt-1">
                Fill all categories with words starting with{" "}
                <strong className="text-amber-600 dark:text-amber-300 font-bold">{letter}</strong>.
              </p>
            </div>

            {/* Letter Badge */}
            <motion.div
              key={letter}
              initial={{ rotateY: 180, scale: 0.3, opacity: 0 }}
              animate={{ rotateY: 360, scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 15 }}
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 flex items-center justify-center text-5xl font-display text-white shadow-2xl border-2 border-amber-200/50 animate-glow-pulse"
            >
              {letter}
            </motion.div>
          </div>

          {/* 30-Second Countdown Timer & Progress Bar */}
          {state.phase === "playing" && (
            <div className="space-y-1.5 pt-2 border-t border-surface-rim">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className={`flex items-center gap-1.5 ${secondsLeft <= 10 ? "text-red-500 animate-pulse font-extrabold" : "text-amber-600 dark:text-amber-400"}`}>
                  ⏱️ {secondsLeft}s Remaining
                </span>
                <button
                  onClick={() => setShowClues(!showClues)}
                  className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500/30 text-xs font-bold cursor-pointer transition flex items-center gap-1"
                >
                  💡 {showClues ? "Hide Clues" : "Need a Clue?"}
                </button>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 bg-surface-1 rounded-full overflow-hidden border border-surface-rim">
                <motion.div
                  className={`h-full transition-all duration-1000 ${
                    secondsLeft <= 10 ? "bg-red-500" : "bg-gradient-to-r from-amber-400 to-orange-500"
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Collapsible Clues Drawer */}
        <AnimatePresence>
          {showClues && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 shadow-lg space-y-3 overflow-hidden"
            >
              <div className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider flex items-center gap-2">
                <span>💡 Helpful Clues for Letter "{letter}"</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-surface-0 p-3 rounded-xl border border-surface-rim space-y-1">
                  <div className="font-bold text-amber-600 dark:text-amber-400 uppercase text-[10px]">Name Clue</div>
                  <div className="text-ink-hi font-medium">{clues.name}</div>
                </div>
                <div className="bg-surface-0 p-3 rounded-xl border border-surface-rim space-y-1">
                  <div className="font-bold text-amber-600 dark:text-amber-400 uppercase text-[10px]">Place Clue</div>
                  <div className="text-ink-hi font-medium">{clues.place}</div>
                </div>
                <div className="bg-surface-0 p-3 rounded-xl border border-surface-rim space-y-1">
                  <div className="font-bold text-amber-600 dark:text-amber-400 uppercase text-[10px]">Animal Clue</div>
                  <div className="text-ink-hi font-medium">{clues.animal}</div>
                </div>
                <div className="bg-surface-0 p-3 rounded-xl border border-surface-rim space-y-1">
                  <div className="font-bold text-amber-600 dark:text-amber-400 uppercase text-[10px]">Thing Clue</div>
                  <div className="text-ink-hi font-medium">{clues.thing}</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Form Phase */}
        {state.phase === "playing" && (
          <form onSubmit={handleSubmit} className="bg-surface-0 border border-surface-rim rounded-2xl p-6 shadow-xl space-y-5 flex-1 flex flex-col justify-between">
            <div className="grid grid-cols-2 gap-4">
              {(["name", "place", "animal", "thing"] as const).map((cat) => {
                const val = form[cat];
                const isValidLetter = !val.trim() || val.trim()[0].toUpperCase() === letter;
                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300">
                        {cat}
                      </label>
                      <span className="text-[10px] text-ink-mute">Hint: {clues[cat]}</span>
                    </div>
                    <input
                      type="text"
                      disabled={hasSubmitted}
                      placeholder={`Starts with ${letter}...`}
                      value={val}
                      onChange={(e) => handleChange(cat, e.target.value)}
                      className={`w-full px-4 py-3 bg-surface-1 border ${
                        !isValidLetter ? "border-red-500 text-red-600 dark:text-red-300" : "border-surface-rim text-ink-hi"
                      } rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-60 transition`}
                    />
                    {!isValidLetter && (
                      <span className="text-[11px] text-red-500 dark:text-red-400 block">Must start with {letter}</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-4 pt-4 border-t border-surface-rim">
              {!hasSubmitted ? (
                <>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 px-6 rounded-xl bg-brand-500 hover:bg-brand-600 font-bold text-sm text-white shadow-lg transition active:scale-95 cursor-pointer"
                  >
                    Submit Answers
                  </button>
                  <button
                    type="button"
                    onClick={handleStop}
                    disabled={!isAllFilled}
                    className={`flex-1 py-3.5 px-6 rounded-xl font-bold text-sm text-white shadow-lg transition active:scale-95 ${
                      isAllFilled
                        ? "bg-red-600 hover:bg-red-700 animate-pulse cursor-pointer"
                        : "bg-surface-1 text-ink-mute opacity-50 cursor-not-allowed border border-surface-rim"
                    }`}
                  >
                    Call STOP!
                  </button>
                </>
              ) : (
                <div className="w-full p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-center">
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    Answers locked in! Waiting for round timer or players to finish...
                  </p>
                </div>
              )}
            </div>
          </form>
        )}

        {/* Round Summary */}
        {state.phase === "roundSummary" && (
          <div className="bg-surface-0 border border-surface-rim rounded-2xl p-6 shadow-xl flex-1 flex flex-col justify-between space-y-4">
            <h2 className="text-lg font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Round {state.round} Scoring Recap
            </h2>

            <div className="space-y-3 overflow-y-auto max-h-96 pr-2">
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
                        +{pRoundTotal} pts this round
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-3 text-xs">
                      {(["name", "place", "animal", "thing"] as const).map((cat) => {
                        const word = pAns?.[cat] || "—";
                        const pts = pCatScores?.[cat] ?? 0;
                        return (
                          <div
                            key={cat}
                            className="bg-surface-0 p-2.5 rounded-lg border border-surface-rim space-y-1"
                          >
                            <div className="text-[10px] text-ink-mute uppercase">{cat}</div>
                            <div className="font-medium text-ink-hi truncate">{word}</div>
                            <div
                              className={`text-[10px] font-bold ${
                                pts === 10
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : pts === 5
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {pts} pts
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
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

      {/* Right Column (Live Standings & Player Progress) */}
      <div className="col-span-5 flex flex-col space-y-6">
        <div className="bg-surface-0 border border-surface-rim rounded-2xl p-6 shadow-xl flex-1 space-y-4">
          <h2 className="text-base font-bold text-ink-hi uppercase tracking-wider">
            Player Standings
          </h2>

          <div className="space-y-3">
            {state.players.map((p) => (
              <div
                key={p.id}
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
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
                      {p.hasSubmitted ? "Submitted" : "Thinking..."}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-sm text-amber-600 dark:text-amber-400">{p.score} pts</div>
                  <div className="text-[11px] text-ink-mute">{p.roundWins} round wins</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scoring Guide */}
        <div className="bg-surface-0/80 border border-surface-rim rounded-2xl p-4 text-xs space-y-2 text-ink-mid">
          <div className="font-bold uppercase tracking-wider text-ink-hi">Scoring Rules:</div>
          <ul className="space-y-1 list-disc list-inside">
            <li><strong className="text-emerald-600 dark:text-emerald-400">10 pts</strong>: Unique valid word</li>
            <li><strong className="text-amber-600 dark:text-amber-400">5 pts</strong>: Matching word with another player</li>
            <li><strong className="text-red-600 dark:text-red-400">0 pts</strong>: Invalid word or empty field</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
