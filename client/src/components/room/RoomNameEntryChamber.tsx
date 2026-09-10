import React, { useState, useCallback, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  User,
  Dices,
  ArrowRight,
  ArrowLeft,
  Check,
} from "lucide-react";
import { HapticsManager } from "../../services/HapticsManager";

export interface RoomNameEntryChamberProps {
  code: string;
  onSubmit: (name: string) => void;
  initialName?: string;
  guest?: boolean;
}

const NOSTALGIC_NICKNAMES = [
  "GullyCricketer",
  "LudoKing",
  "GoldStriker",
  "SuperSixer",
  "CarromAce",
  "MasterMind",
  "SpeedySnake",
  "DeckMaster",
  "StarBowler",
  "LuckyAce",
  "ChaiChampion",
  "StreetRacer",
];

/**
 * True 3D Isometric Gaming Dice Component
 * Constructed with 6 CSS 3D transformed planes
 */
function Isometric3DDice({ isRolling }: { isRolling: boolean }) {
  return (
    <div className="relative w-16 h-16 flex items-center justify-center select-none" style={{ perspective: 800 }}>
      {/* Dynamic Ground Shadow */}
      <motion.div
        className="absolute -bottom-2 w-12 h-3 rounded-full bg-amber-950/25 dark:bg-black/60 blur-xs pointer-events-none"
        animate={{
          scale: [0.85, 1.15, 0.85],
          opacity: [0.35, 0.65, 0.35],
        }}
        transition={{
          duration: 3.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* 3D Floating & Rotating Cube */}
      <motion.div
        className="relative w-12 h-12"
        style={{
          transformStyle: "preserve-3d",
        }}
        animate={
          isRolling
            ? {
                rotateX: [0, 720],
                rotateY: [0, 1080],
                rotateZ: [0, 360],
                y: [0, -18, 0],
              }
            : {
                rotateX: [20, 380],
                rotateY: [35, 395],
                y: [0, -8, 0],
              }
        }
        transition={
          isRolling
            ? { duration: 0.8, ease: "easeOut" }
            : {
                rotateX: { duration: 12, repeat: Infinity, ease: "linear" },
                rotateY: { duration: 9, repeat: Infinity, ease: "linear" },
                y: { duration: 3.2, repeat: Infinity, ease: "easeInOut" },
              }
        }
      >
        {/* Face 1: Front (1 Pip) */}
        <div
          className="absolute inset-0 rounded-lg bg-gradient-to-br from-[#FFFBEB] via-[#FEF3C7] to-[#FDE68A] dark:from-[#334155] dark:via-[#1E293B] dark:to-[#0F172A] border border-amber-400/70 dark:border-amber-400/40 shadow-inner flex items-center justify-center"
          style={{ transform: "rotateY(0deg) translateZ(24px)" }}
        >
          <div className="w-3.5 h-3.5 rounded-full bg-amber-600 dark:bg-amber-400 shadow-xs" />
        </div>

        {/* Face 2: Back (6 Pips) */}
        <div
          className="absolute inset-0 rounded-lg bg-gradient-to-br from-[#FFFBEB] via-[#FEF3C7] to-[#FDE68A] dark:from-[#334155] dark:via-[#1E293B] dark:to-[#0F172A] border border-amber-400/70 dark:border-amber-400/40 shadow-inner p-1.5 grid grid-cols-2 gap-1.5 items-center justify-items-center"
          style={{ transform: "rotateY(180deg) translateZ(24px)" }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-amber-700 dark:bg-amber-300" />
          ))}
        </div>

        {/* Face 3: Right (3 Pips) */}
        <div
          className="absolute inset-0 rounded-lg bg-gradient-to-br from-[#FEF3C7] via-[#FDE68A] to-[#FCD34D] dark:from-[#1E293B] dark:via-[#0F172A] dark:to-[#020617] border border-amber-400/70 dark:border-amber-400/40 shadow-inner p-1.5 flex flex-col justify-between"
          style={{ transform: "rotateY(90deg) translateZ(24px)" }}
        >
          <div className="w-2 h-2 rounded-full bg-amber-700 dark:bg-amber-300 self-start" />
          <div className="w-2 h-2 rounded-full bg-amber-700 dark:bg-amber-300 self-center" />
          <div className="w-2 h-2 rounded-full bg-amber-700 dark:bg-amber-300 self-end" />
        </div>

        {/* Face 4: Left (4 Pips) */}
        <div
          className="absolute inset-0 rounded-lg bg-gradient-to-br from-[#FEF3C7] via-[#FDE68A] to-[#FCD34D] dark:from-[#1E293B] dark:via-[#0F172A] dark:to-[#020617] border border-amber-400/70 dark:border-amber-400/40 shadow-inner p-1.5 grid grid-cols-2 gap-2 items-center justify-items-center"
          style={{ transform: "rotateY(-90deg) translateZ(24px)" }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-amber-700 dark:bg-amber-300" />
          ))}
        </div>

        {/* Face 5: Top (5 Pips) */}
        <div
          className="absolute inset-0 rounded-lg bg-gradient-to-br from-white via-[#FFFBEB] to-[#FEF3C7] dark:from-[#475569] dark:via-[#334155] dark:to-[#1E293B] border border-amber-300 dark:border-amber-400/50 shadow-inner p-1.5 relative"
          style={{ transform: "rotateX(90deg) translateZ(24px)" }}
        >
          <div className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-amber-600 dark:bg-amber-300" />
          <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-600 dark:bg-amber-300" />
          <div className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-amber-700 dark:bg-amber-200" />
          <div className="absolute bottom-1.5 left-1.5 w-2 h-2 rounded-full bg-amber-600 dark:bg-amber-300" />
          <div className="absolute bottom-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-600 dark:bg-amber-300" />
        </div>

        {/* Face 6: Bottom (2 Pips) */}
        <div
          className="absolute inset-0 rounded-lg bg-gradient-to-br from-[#FDE68A] to-[#F59E0B] dark:from-[#0F172A] dark:to-black border border-amber-500/70 dark:border-amber-500/40 shadow-inner p-2 flex flex-col justify-between"
          style={{ transform: "rotateX(-90deg) translateZ(24px)" }}
        >
          <div className="w-2 h-2 rounded-full bg-amber-800 dark:bg-amber-200 self-start" />
          <div className="w-2 h-2 rounded-full bg-amber-800 dark:bg-amber-200 self-end" />
        </div>
      </motion.div>
    </div>
  );
}

export default function RoomNameEntryChamber({
  code,
  onSubmit,
  initialName = "",
  guest = false,
}: RoomNameEntryChamberProps) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(initialName);
  const [copied, setCopied] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // 3D Tilt Motion Values
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-150, 150], [10, -10]), { stiffness: 220, damping: 20 });
  const rotateY = useSpring(useTransform(x, [-150, 150], [-10, 10]), { stiffness: 220, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set(e.clientX - centerX);
    y.set(e.clientY - centerY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const trimmed = draft.trim().slice(0, 20);
  const canSubmit = trimmed.length >= 1;

  const handleRollNickname = () => {
    HapticsManager.getInstance().subtle();
    setIsRolling(true);
    setTimeout(() => {
      const randomNick = NOSTALGIC_NICKNAMES[Math.floor(Math.random() * NOSTALGIC_NICKNAMES.length)];
      setDraft(randomNick);
      setIsRolling(false);
    }, 450);
  };

  const handleCopyCode = useCallback(async () => {
    if (!code) return;
    try {
      HapticsManager.getInstance().subtle();
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code.toUpperCase());
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Ignore clipboard write issues
    }
  }, [code]);

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) {
      HapticsManager.getInstance().subtle();
      onSubmit(trimmed);
    }
  };

  const codeChars = (code || "••••••").toUpperCase().slice(0, 6).split("");

  return (
    <div
      className="relative w-full flex-1 min-h-[600px] flex items-center justify-center p-4 sm:p-6 overflow-hidden select-none"
      style={{ perspective: 1200 }}
    >
      {/* ── Layer 1: Ambient Calibrated Radial Glow ── */}
      <div
        className="pointer-events-none absolute inset-0 opacity-80 dark:opacity-40"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, rgba(245, 158, 11, 0.18) 0%, rgba(251, 191, 36, 0.06) 40%, transparent 75%)",
        }}
      />

      {/* ── Layer 2: Main 3D Tilt Double-Bezel Chamber Card ── */}
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative w-full max-w-md rounded-3xl p-2 sm:p-2.5 bg-gradient-to-b from-amber-400/40 via-amber-200/20 to-amber-500/30 dark:from-amber-500/25 dark:via-slate-800/40 dark:to-amber-500/20 shadow-[0_25px_60px_-15px_rgba(217,119,6,0.25)] dark:shadow-[0_30px_70px_-20px_rgba(0,0,0,0.85)] border border-amber-300/80 dark:border-amber-400/30"
      >
        {/* Inner Frosted Glass Chamber Core */}
        <div
          className="rounded-[22px] bg-gradient-to-b from-white/95 via-amber-50/90 to-[#F9F4E8]/95 dark:from-[#151D2F]/95 dark:via-[#101726]/95 dark:to-[#0B101D]/98 p-5 sm:p-7 space-y-5 border border-white/60 dark:border-slate-700/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] backdrop-blur-xl"
          style={{ transform: "translateZ(25px)" }}
        >
          {/* Header & 3D Rotating Dice Emblem */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div style={{ transform: "translateZ(50px)" }}>
              <Isometric3DDice isRolling={isRolling} />
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                <Dices className="w-3 h-3" />
                <span>{guest ? "GUEST TABLE CHECK-IN" : "LOUNGE TABLE SEAT"}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-display font-black text-slate-900 dark:text-amber-100 tracking-tight">
                {guest ? "Welcome to the Table" : "Take Your Seat"}
              </h2>
              <p className="text-xs text-[#6E5E4D] dark:text-slate-300 max-w-xs leading-relaxed">
                {guest
                  ? "This is a private table. Introduce yourself so players know who is sitting down."
                  : "Enter your player name to join your friends in the active lounge."}
              </p>
            </div>
          </div>

          {/* ── 3D Physical Extruded Key Tiles for Room Code ── */}
          <div className="flex flex-col items-center space-y-1.5" style={{ transform: "translateZ(35px)" }}>
            <span className="text-[10px] font-black tracking-widest uppercase text-amber-700 dark:text-amber-400/80">
              ROOM CODE
            </span>
            <div
              onClick={handleCopyCode}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleCopyCode();
                }
              }}
              title="Click to copy code"
              className="flex items-center justify-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-2xl bg-amber-50/80 dark:bg-black/30 border border-amber-300/70 dark:border-slate-800 cursor-pointer group hover:border-amber-400 transition"
            >
              {codeChars.map((ch, i) => (
                <div
                  key={i}
                  className="w-8 h-11 sm:w-10 sm:h-13 flex items-center justify-center rounded-xl bg-gradient-to-b from-white via-amber-50 to-amber-100 dark:from-[#253248] dark:via-[#1A2332] dark:to-[#111722] border-t border-x border-amber-200 dark:border-amber-400/30 border-b-[5px] border-amber-600/90 dark:border-amber-700/80 shadow-[0_5px_0_rgba(180,83,9,0.85),0_10px_16px_rgba(0,0,0,0.15)] dark:shadow-[0_5px_0_rgba(180,83,9,0.6),0_10px_20px_rgba(0,0,0,0.5)] active:translate-y-[4px] active:border-b-[1px] active:shadow-[0_1px_0_rgba(180,83,9,0.85)] transition-all"
                >
                  <span className="font-mono text-lg sm:text-xl font-black text-[#2A231C] dark:text-amber-100">
                    {ch}
                  </span>
                </div>
              ))}
            </div>

            {/* Micro-Feedback Pill */}
            <button
              type="button"
              onClick={handleCopyCode}
              className="text-[11px] font-bold text-amber-800 dark:text-amber-300 hover:underline inline-flex items-center gap-1 mt-0.5 cursor-pointer"
            >
              {copied ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-black inline-flex items-center gap-1">
                  <Check className="w-3 h-3 stroke-[3]" /> Copied!
                </span>
              ) : (
                <span>Click code to copy</span>
              )}
            </button>
          </div>

          {/* ── Interactive Name Input Form ── */}
          <form onSubmit={handleSubmitForm} className="space-y-4" style={{ transform: "translateZ(40px)" }}>
            <div className="space-y-1.5 text-left">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="room-player-name"
                  className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1"
                >
                  <User className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Your Player Name</span>
                </label>
                <span className="text-[10px] font-mono font-bold text-slate-400">
                  {trimmed.length}/20
                </span>
              </div>

              <div className="relative flex items-center">
                <input
                  id="room-player-name"
                  autoFocus
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="e.g. MasterBlaster"
                  maxLength={20}
                  className="w-full pl-4 pr-11 py-3 rounded-xl bg-white dark:bg-[#0A0E18] text-slate-900 dark:text-white border-2 border-amber-300/80 dark:border-slate-700 focus:border-amber-500 dark:focus:border-amber-400 outline-none font-bold text-base shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] transition focus:ring-4 focus:ring-amber-400/20"
                />
                {/* 3D Dice Roll Nickname Shortcut */}
                <button
                  type="button"
                  onClick={handleRollNickname}
                  title="Roll a random 90s gaming nickname"
                  className="absolute right-2 p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 transition active:scale-90 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  <Dices className={`w-5 h-5 ${isRolling ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {/* 3D Physical Extruded Submit CTA Button */}
            <div className="space-y-2 pt-1">
              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full py-3.5 px-6 rounded-xl font-black text-sm uppercase tracking-wider text-white bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 border-t border-amber-300/60 border-b-[4px] border-[#9A3412] hover:brightness-105 active:border-b-[1px] active:translate-y-[3px] shadow-[0_6px_16px_rgba(217,119,6,0.35)] disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <span>{guest ? "Enter the Game Table" : "Join Lounge Room"}</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>

              <button
                type="button"
                onClick={() => navigate("/")}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition flex items-center justify-center gap-1 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Lounge</span>
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
