import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Lightbulb, Sparkles, Users, DoorOpen } from "lucide-react";
import { useTheme } from "../../lib/useTheme";
import { motion, AnimatePresence } from "framer-motion";

interface SchoolGangWaitingBannerProps {
  onOpenJoinModal?: () => void;
}

export default function SchoolGangWaitingBanner({
  onOpenJoinModal,
}: SchoolGangWaitingBannerProps) {
  const [theme] = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  const [roomCode, setRoomCode] = useState("");
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  const handleJoin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = roomCode.trim().toUpperCase();
    if (clean.length >= 4) {
      navigate(`/room/${clean}`);
    } else if (onOpenJoinModal) {
      onOpenJoinModal();
    }
  };

  return (
    <>
      <section
        className={`my-5 sm:my-6 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border shadow-xs transition-all ${
          isDark
            ? "bg-[#0E1527] border-white/10 text-white"
            : "bg-[#FFFDF8] border-[#E8D8BE] text-[#3D2005]"
        }`}
      >
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 sm:gap-6">
          {/* Left: Cartoon Gang Illustration + Text */}
          <div className="flex items-center gap-3.5 sm:gap-4.5 w-full lg:w-auto">
            {/* Gang Illustration */}
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0">
              <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
                {/* 3 smiling kids standing together */}
                <circle cx="28" cy="38" r="14" fill="#FCD34D" stroke="#5C3717" strokeWidth="2.5" />
                <circle cx="50" cy="32" r="16" fill="#FBBF24" stroke="#5C3717" strokeWidth="2.5" />
                <circle cx="72" cy="38" r="14" fill="#FCD34D" stroke="#5C3717" strokeWidth="2.5" />
                
                {/* Smiles */}
                <path d="M22 42 Q 28 48 34 42" stroke="#5C3717" strokeWidth="2" strokeLinecap="round" fill="none" />
                <path d="M43 36 Q 50 44 57 36" stroke="#5C3717" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <path d="M66 42 Q 72 48 78 42" stroke="#5C3717" strokeWidth="2" strokeLinecap="round" fill="none" />
                
                {/* Eyes */}
                <circle cx="24" cy="36" r="2" fill="#5C3717" />
                <circle cx="32" cy="36" r="2" fill="#5C3717" />
                <circle cx="45" cy="30" r="2.5" fill="#5C3717" />
                <circle cx="55" cy="30" r="2.5" fill="#5C3717" />
                <circle cx="68" cy="36" r="2" fill="#5C3717" />
                <circle cx="76" cy="36" r="2" fill="#5C3717" />

                {/* Bodies / Uniforms */}
                <path d="M12 78 C 12 55, 44 55, 44 78 Z" fill="#3B82F6" stroke="#5C3717" strokeWidth="2.5" />
                <path d="M30 78 C 30 50, 70 50, 70 78 Z" fill="#F59E0B" stroke="#5C3717" strokeWidth="2.5" />
                <path d="M56 78 C 56 55, 88 55, 88 78 Z" fill="#10B981" stroke="#5C3717" strokeWidth="2.5" />
              </svg>
              <span className="absolute -top-1 -right-1 text-sm">✨</span>
            </div>

            {/* Text Copy */}
            <div className="text-left leading-tight">
              <h3 className="bhalyam-display text-[17px] sm:text-[20px] font-black text-[#2A221B] dark:text-white">
                Your school gang is waiting!
              </h3>
              <p className="text-[12px] sm:text-[13px] font-medium text-[#7A5B3E] dark:text-zinc-300 mt-1">
                Create a room, share the code and start the fun.
              </p>
            </div>
          </div>

          {/* Center / Right: Room Code Input + Join Button */}
          <form
            onSubmit={handleJoin}
            className="flex items-center gap-2 w-full lg:w-auto flex-1 max-w-md justify-start lg:justify-center"
          >
            <div
              className={`relative flex items-center h-11 px-3.5 rounded-xl border flex-1 max-w-[200px] transition-all ${
                isDark
                  ? "bg-[#131C31] border-white/15 focus-within:border-purple-400"
                  : "bg-white border-[#E8D8BE] focus-within:border-purple-500 shadow-2xs"
              }`}
            >
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="Enter Room Code"
                maxLength={6}
                className={`w-full bg-transparent text-[13px] font-mono font-bold tracking-wider outline-none text-center ${
                  isDark ? "text-white placeholder:text-zinc-500" : "text-[#3D2005] placeholder:text-[#A89078]"
                }`}
              />
            </div>

            <button
              type="submit"
              className="h-11 px-5 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:brightness-110 active:scale-98 text-white font-extrabold text-[12.5px] sm:text-[13px] shadow-md transition cursor-pointer flex items-center justify-center gap-1.5 flex-shrink-0"
            >
              <DoorOpen className="w-4 h-4" />
              <span>Join Now</span>
            </button>
          </form>

          {/* Far Right: "How it works? 3 simple steps ->" */}
          <button
            type="button"
            onClick={() => setHowItWorksOpen(true)}
            className={`hidden sm:flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border transition hover:scale-102 active:scale-98 cursor-pointer flex-shrink-0 ${
              isDark
                ? "bg-[#131C31] border-amber-400/30 text-amber-300 hover:bg-white/10"
                : "bg-[#FFF9EA] border-[#ECD9BA] text-[#B45309] hover:bg-[#FFF2D6]"
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-amber-400/20 text-amber-500 flex items-center justify-center text-sm">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div className="text-left leading-tight">
              <div className="text-[11.5px] font-extrabold">How it works?</div>
              <div className="text-[9.5px] font-medium opacity-80">3 simple steps</div>
            </div>
            <ArrowRight className="w-4 h-4 text-amber-500 ml-0.5" />
          </button>
        </div>
      </section>

      {/* "How it Works" Modal */}
      <AnimatePresence>
        {howItWorksOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setHowItWorksOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className={`max-w-md w-full p-6 rounded-3xl border shadow-2xl text-left ${
                  isDark
                    ? "bg-[#0E1527] border-white/15 text-white"
                    : "bg-[#FFFDF8] border-[#ECD9BA] text-[#3D2005]"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">✨</span>
                    <h3 className="bhalyam-display text-[22px] font-black text-amber-600 dark:text-amber-400">
                      How BHALYAM Works
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHowItWorksOpen(false)}
                    className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3.5">
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                    <div className="w-7 h-7 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                      1
                    </div>
                    <div>
                      <div className="text-[13.5px] font-black">Pick a 90s Game</div>
                      <p className="text-[12px] opacity-85 mt-0.5">
                        Choose UNO, Ludo, Hand Cricket, Rummy, or any nostalgic game.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                    <div className="w-7 h-7 rounded-full bg-purple-500 text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                      2
                    </div>
                    <div>
                      <div className="text-[13.5px] font-black">Share the 6-Letter Code</div>
                      <p className="text-[12px] opacity-85 mt-0.5">
                        Send the room code or 1-tap WhatsApp link to your friends.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                    <div className="w-7 h-7 rounded-full bg-emerald-500 text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                      3
                    </div>
                    <div>
                      <div className="text-[13.5px] font-black">Play Instantly Anywhere</div>
                      <p className="text-[12px] opacity-85 mt-0.5">
                        Zero login required. Seamless realtime multiplayer on any mobile or laptop!
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setHowItWorksOpen(false)}
                  className="w-full mt-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-[13.5px] shadow-md hover:brightness-110 active:scale-98 transition cursor-pointer"
                >
                  Got it, let's play!
                </button>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
