import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SAMETHALU_QUESTIONS } from "../../../../server/src/games/samethalu/questions";

export interface WisdomGalleryModalProps {
  onClose: () => void;
}

export function getUnlockedProverbs(): string[] {
  try {
    const raw = localStorage.getItem("bhalyam.unlockedProverbs");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function unlockProverb(id: string): void {
  try {
    const set = new Set(getUnlockedProverbs());
    set.add(id);
    localStorage.setItem("bhalyam.unlockedProverbs", JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

export default function WisdomGalleryModal({ onClose }: WisdomGalleryModalProps) {
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [selectedCard, setSelectedCard] = useState<typeof SAMETHALU_QUESTIONS[0] | null>(null);

  useEffect(() => {
    setUnlockedIds(getUnlockedProverbs());
  }, []);

  const totalCount = SAMETHALU_QUESTIONS.length;
  const unlockedCount = unlockedIds.length;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-[#1A140E] border-2 border-amber-500/40 rounded-3xl p-6 max-w-2xl w-full max-h-[85vh] flex flex-col space-y-4 shadow-2xl relative overflow-hidden text-amber-100"
        >
          {/* Ornate Gold Header */}
          <div className="flex justify-between items-center border-b border-amber-500/20 pb-4">
            <div>
              <h2 className="text-xl font-bold text-amber-400 font-display flex items-center gap-2">
                <span>🎨</span> Wisdom Gallery / సామెతల నిధి
              </h2>
              <p className="text-xs text-amber-200/70">
                Unlocked {unlockedCount} of {totalCount} Kalamkari Proverb Art Cards
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold flex items-center justify-center cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto pr-1 flex-1">
            {SAMETHALU_QUESTIONS.map((q, idx) => {
              const isUnlocked = unlockedIds.includes(q.id);
              const fullText = q.proverb.replace("______", q.options[0]);

              return (
                <motion.div
                  key={q.id}
                  whileHover={{ scale: isUnlocked ? 1.03 : 1 }}
                  whileTap={{ scale: isUnlocked ? 0.97 : 1 }}
                  onClick={() => isUnlocked && setSelectedCard(q)}
                  className={`p-3 rounded-2xl border flex flex-col justify-between h-36 relative overflow-hidden transition shadow-lg ${
                    isUnlocked
                      ? "bg-gradient-to-br from-amber-950/60 to-amber-900/40 border-amber-500/60 text-amber-100 cursor-pointer hover:border-amber-400"
                      : "bg-stone-900/60 border-stone-800 text-stone-500 cursor-not-allowed"
                  }`}
                >
                  {isUnlocked ? (
                    <>
                      <div className="flex justify-between items-center text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                        <span>Card #{idx + 1}</span>
                        <span className="text-xs">📜</span>
                      </div>
                      <p className="text-xs font-bold line-clamp-3 my-1 leading-relaxed text-amber-200 font-display">
                        {fullText}
                      </p>
                      <div className="text-[10px] text-amber-400/80 font-medium truncate">
                        {q.meaning}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full space-y-1 text-center">
                      <span className="text-xl">🔒</span>
                      <span className="text-[10px] font-semibold text-stone-400">Locked Card #{idx + 1}</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Card Detail Popup */}
          <AnimatePresence>
            {selectedCard && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-4 bg-[#261D13] border-2 border-amber-400 rounded-2xl p-6 flex flex-col justify-between shadow-2xl z-20"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs text-amber-400 font-bold uppercase tracking-widest">
                    <span>Kalamkari Wisdom Card 📜</span>
                    <button
                      onClick={() => setSelectedCard(null)}
                      className="text-amber-400 text-lg font-bold px-2 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="p-4 bg-amber-500/10 border border-amber-400/40 rounded-xl text-center space-y-2">
                    <h3 className="text-xl font-bold text-amber-200 font-display">
                      {selectedCard.proverb.replace("______", selectedCard.options[0])}
                    </h3>
                  </div>

                  <div className="space-y-1 text-xs text-amber-100/90">
                    <div className="font-bold text-amber-400 uppercase tracking-wider">Meaning & Cultural Wisdom:</div>
                    <p className="leading-relaxed bg-black/30 p-3 rounded-xl border border-amber-500/20">
                      {selectedCard.meaning}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedCard(null)}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 font-bold text-xs text-black uppercase tracking-wider transition cursor-pointer"
                >
                  Close Card
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}