import { useState, useEffect } from "react";
import type { NamePlaceAnimalAnswers, NamePlaceAnimalCategory, NamePlaceAnimalPublicState } from "@shared/types";
import { motion, AnimatePresence } from "framer-motion";

export interface NamePlaceAnimalBoardProps {
  state: NamePlaceAnimalPublicState;
  myAnswers: NamePlaceAnimalAnswers;
  myPlayerId: string;
  onMove: (type: string, data?: unknown) => void;
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
    <div className="flex flex-col min-h-[calc(100vh-5rem)] max-w-md mx-auto p-4 text-ink-hi font-sans space-y-4">
      {/* Header Banner with 30s Countdown */}
      <div className="bg-surface-0 border border-brand-500/30 rounded-2xl p-4 shadow-lg text-center relative overflow-hidden space-y-3">
        <div className="flex justify-between items-center text-xs">
          <span className="font-semibold uppercase tracking-wider text-ink-mid">
            Round {state.round} of {state.totalRounds}
          </span>
          <button
            onClick={() => setShowClues(!showClues)}
            className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold cursor-pointer text-[11px]"
          >
            💡 {showClues ? "Hide Clues" : "Need a Clue?"}
          </button>
        </div>

        {/* Big Letter Badge with 3D Roulette Rotation */}
        <motion.div
          key={letter}
          initial={{ rotateY: 180, scale: 0.3, opacity: 0 }}
          animate={{ rotateY: 360, scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 15 }}
          className="my-1 inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 text-white font-display text-4xl shadow-2xl border-2 border-amber-200/50 animate-glow-pulse"
        >
          {letter}
        </motion.div>

        {/* 30-Second Countdown & Progress Bar */}
        {state.phase === "playing" && (
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className={`flex items-center gap-1 ${secondsLeft <= 10 ? "text-red-500 animate-pulse font-extrabold" : "text-amber-600 dark:text-amber-400"}`}>
                ⏱️ {secondsLeft}s Left
              </span>
              <span className="text-[10px] text-ink-mute">Starts with '{letter}'</span>
            </div>
            <div className="w-full h-2 bg-surface-1 rounded-full overflow-hidden border border-surface-rim">
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
            className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 shadow-lg space-y-2 overflow-hidden text-xs"
          >
            <div className="font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider text-[11px]">
              💡 Clues for Letter "{letter}"
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-surface-0 p-2 rounded-lg border border-surface-rim">
                <span className="font-bold text-amber-600 dark:text-amber-400 block text-[9px] uppercase">Name</span>
                <span className="truncate block font-medium">{clues.name}</span>
              </div>
              <div className="bg-surface-0 p-2 rounded-lg border border-surface-rim">
                <span className="font-bold text-amber-600 dark:text-amber-400 block text-[9px] uppercase">Place</span>
                <span className="truncate block font-medium">{clues.place}</span>
              </div>
              <div className="bg-surface-0 p-2 rounded-lg border border-surface-rim">
                <span className="font-bold text-amber-600 dark:text-amber-400 block text-[9px] uppercase">Animal</span>
                <span className="truncate block font-medium">{clues.animal}</span>
              </div>
              <div className="bg-surface-0 p-2 rounded-lg border border-surface-rim">
                <span className="font-bold text-amber-600 dark:text-amber-400 block text-[9px] uppercase">Thing</span>
                <span className="truncate block font-medium">{clues.thing}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Playing Phase */}
      {state.phase === "playing" && (
        <form onSubmit={handleSubmit} className="space-y-3 flex-1 flex flex-col justify-between">
          <div className="space-y-3">
            {/* Category Cards */}
            {(["name", "place", "animal", "thing"] as const).map((cat) => {
              const val = form[cat];
              const isValidLetter = !val.trim() || val.trim()[0].toUpperCase() === letter;
              return (
                <div key={cat} className="bg-surface-0 border border-surface-rim rounded-xl p-3 shadow-md">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300">
                      {cat}
                    </label>
                    <span className="text-[10px] text-ink-mute truncate max-w-[150px]">{clues[cat]}</span>
                  </div>
                  <input
                    type="text"
                    disabled={hasSubmitted}
                    placeholder={`e.g. ${letter}...`}
                    value={val}
                    onChange={(e) => handleChange(cat, e.target.value)}
                    className={`w-full px-3 py-2 bg-surface-1 border ${
                      !isValidLetter ? "border-red-500 text-red-600 dark:text-red-300" : "border-surface-rim text-ink-hi"
                    } rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-60`}
                  />
                  {!isValidLetter && (
                    <span className="text-[10px] text-red-500 dark:text-red-400 mt-1 block">
                      Must start with {letter}
                    </span>
                  )}
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
                  className="w-full py-3 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 font-bold text-sm text-white shadow-lg transition active:scale-95"
                >
                  Submit
                </button>
                <button
                  type="button"
                  onClick={handleStop}
                  disabled={!isAllFilled}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-sm text-white shadow-lg transition active:scale-95 ${
                    isAllFilled
                      ? "bg-red-600 hover:bg-red-700 animate-pulse cursor-pointer"
                      : "bg-surface-1 text-ink-mute opacity-50 cursor-not-allowed border border-surface-rim"
                  }`}
                >
                  STOP!
                </button>
              </div>
            ) : (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-center">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  Answers submitted! Waiting for round timer...
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
                      {(["name", "place", "animal", "thing"] as const).map((cat) => {
                        const word = pAns?.[cat] || "—";
                        const pts = pCatScores?.[cat] ?? 0;
                        return (
                          <div
                            key={cat}
                            className="bg-surface-0 p-1.5 rounded border border-surface-rim flex justify-between items-center"
                          >
                            <span className="text-ink-mute uppercase text-[9px]">{cat}:</span>
                            <span className="font-medium text-ink-hi truncate max-w-[80px]">
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
            className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 font-bold text-sm text-black shadow-lg transition active:scale-95"
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
    </div>
  );
}
