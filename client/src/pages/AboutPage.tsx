import React, { useState } from "react";
import { Link } from "react-router-dom";
import HelpLayout from "../components/layout/HelpLayout";
import { useTheme } from "../lib/useTheme";
import { HapticsManager } from "../services/HapticsManager";
import {
  Heart,
  Users,
  Volume2,
  ShieldCheck,
  Gamepad2,
  Award,
  Clock,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   Nostalgic Web Audio Soundboard Synthesizer
   (100% Client-side Web Audio, Zero Dependencies, Zero Latency)
   ───────────────────────────────────────────────────────────── */
function playNostalgicSfx(type: "bell" | "striker" | "chalk" | "dice") {
  try {
    HapticsManager.getInstance().subtle();
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === "bell") {
      // School Bell ring chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 1.2);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } else if (type === "striker") {
      // Carrom striker wooden 'tack'
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(280, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.6, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === "chalk") {
      // Chalk on blackboard scratch tone
      const bufferSize = ctx.sampleRate * 0.2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.08));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 3200;
      filter.Q.value = 4.0;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
    } else if (type === "dice") {
      // Plastic cup dice rattle
      for (let j = 0; j < 3; j++) {
        setTimeout(() => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(450 + Math.random() * 200, ctx.currentTime);
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.07);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.07);
        }, j * 60);
      }
    }
  } catch {
    // Web audio blocked or unsupported
  }
}

/* ─────────────────────────────────────────────────────────────
   Nostalgic Doodle & Illustration SVGs
   ───────────────────────────────────────────────────────────── */

function WashiTape({ className = "", rotate = 0 }: { className?: string; rotate?: number }) {
  return (
    <div
      style={{ transform: `rotate(${rotate}deg)` }}
      className={`absolute w-14 h-5 bg-[#F2E0B2]/85 dark:bg-[#D4B67A]/60 border-y border-[#DFC28B]/80 dark:border-[#B5965A]/80 shadow-[0_1px_3px_rgba(0,0,0,0.12)] backdrop-blur-2xs pointer-events-none z-20 ${className}`}
    />
  );
}

function PushPin({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className={`w-7 h-7 drop-shadow-md ${className}`}>
      <ellipse cx="14" cy="24" rx="5" ry="2" fill="rgba(0,0,0,0.25)" />
      <path d="M14 16 L14 23" stroke="#8E9AA8" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="14" cy="11" r="7.5" fill="url(#pinGrad)" stroke="#B91C1C" strokeWidth="1" />
      <circle cx="12" cy="9" r="2.5" fill="#FCA5A5" opacity="0.8" />
      <circle cx="14" cy="5" r="3" fill="#DC2626" />
      <defs>
        <radialGradient id="pinGrad" cx="35%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#EF4444" />
          <stop offset="70%" stopColor="#DC2626" />
          <stop offset="100%" stopColor="#991B1B" />
        </radialGradient>
      </defs>
    </svg>
  );
}

function SmileyBadge({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={`w-9 h-9 drop-shadow-md ${className}`}>
      <circle cx="20" cy="20" r="18" fill="url(#smileyGrad)" stroke="#D97706" strokeWidth="2" />
      <ellipse cx="14" cy="16" rx="2" ry="3" fill="#78350F" />
      <ellipse cx="26" cy="16" rx="2" ry="3" fill="#78350F" />
      <path d="M12 22 C 14 29, 26 29, 28 22" stroke="#78350F" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d="M10.5 21.5 L12.5 23" stroke="#78350F" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M29.5 21.5 L27.5 23" stroke="#78350F" strokeWidth="1.8" strokeLinecap="round" />
      <defs>
        <linearGradient id="smileyGrad" x1="0" y1="0" x2="40" y2="40">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function AirplaneWithLoopSVG({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`w-32 h-20 ${className}`}>
      <path
        d="M 15 85 C 40 95, 75 75, 70 45 C 65 15, 30 25, 45 60 C 60 90, 110 85, 135 40"
        stroke="#8A684C"
        strokeWidth="1.6"
        strokeDasharray="4 4"
        strokeLinecap="round"
        opacity="0.65"
      />
      <g transform="translate(125, 20) rotate(15)">
        <polygon points="0,15 26,0 16,28 11,18" fill="#FFFDF8" stroke="#5C3717" strokeWidth="1.4" strokeLinejoin="round" />
        <polygon points="11,18 26,0 16,28" fill="#F4E6CF" stroke="#5C3717" strokeWidth="1.4" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

function SketchbookArtSVG({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" className={`w-full h-full opacity-60 dark:opacity-40 ${className}`}>
      <path d="M 50 180 Q 50 120 70 90 Q 90 60 110 90 Q 130 120 120 180" stroke="#7A5B3E" strokeWidth="1.5" strokeDasharray="3 3" fill="none" />
      <path d="M 60 110 Q 35 100 45 75 Q 55 50 85 60 Q 110 40 135 65 Q 155 90 135 115" stroke="#7A5B3E" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <circle cx="95" cy="140" r="6" stroke="#7A5B3E" strokeWidth="1.4" />
      <path d="M 95 146 L 95 162 M 90 152 L 105 150 M 95 162 L 88 175 M 95 162 L 104 174" stroke="#7A5B3E" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="145" cy="135" r="6" stroke="#7A5B3E" strokeWidth="1.4" />
      <path d="M 145 141 L 145 158 M 140 148 L 155 144 M 145 158 L 138 171 M 145 158 L 152 170" stroke="#7A5B3E" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="160" cy="130" r="3" fill="#D97706" />
    </svg>
  );
}

function BicycleDoodleSVG({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 65" fill="none" xmlns="http://www.w3.org/2000/svg" className={`w-16 h-10 ${className}`}>
      <circle cx="20" cy="45" r="14" stroke="#7A5B3E" strokeWidth="1.6" strokeDasharray="2 2" />
      <circle cx="80" cy="45" r="14" stroke="#7A5B3E" strokeWidth="1.6" strokeDasharray="2 2" />
      <path d="M 20 45 L 45 45 L 65 25 L 35 25 Z" stroke="#7A5B3E" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M 45 45 L 32 18 M 28 18 L 38 18" stroke="#7A5B3E" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M 65 25 L 80 45 M 65 25 L 62 14 M 55 14 L 69 14" stroke="#7A5B3E" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const NOSTALGIA_TIMELINE = [
  { year: "1995", title: "Classroom Desks", text: "Tearing paper, making balls, and playing Hand Cricket during lunch breaks under teacher's desk.", icon: "🏏" },
  { year: "2000", title: "Veranda Carrom", text: "Summer holidays with boric powder, wooden carrom boards, and endless Ludo cutting battles.", icon: "🎲" },
  { year: "2005", title: "Nokia Brick Era", text: "Pushing green pixels in Snake II and passing phone around in university hostels.", icon: "🐍" },
  { year: "2026", title: "Bhalyam is Born", text: "Rebuilding our digital lounge so we never lose our childhood friends, no matter where life takes us.", icon: "🛋️" },
];

export default function AboutPage() {
  const [theme] = useTheme();
  const isDark = theme === "dark";
  const [activeSound, setActiveSound] = useState<string | null>(null);

  const handleTriggerSfx = (type: "bell" | "striker" | "chalk" | "dice", label: string) => {
    setActiveSound(label);
    playNostalgicSfx(type);
    setTimeout(() => setActiveSound(null), 1200);
  };

  return (
    <HelpLayout
      title="About BHALYAM"
      subtitle="Built from memories. Preserving 90s Indian childhood nostalgia for our lifelong friendships."
      badgeText="Our Veranda Story"
    >
      <div className="space-y-8 text-stone-800 dark:text-slate-100">
        {/* ══════════════════════════════════════════════════════════
            SECTION 1: HERO & FOUNDER MEMORIES DOUBLE-BEZEL CARD
            ══════════════════════════════════════════════════════════ */}
        <section className="relative rounded-3xl p-0.5 bg-gradient-to-b from-amber-500/25 via-stone-300/30 dark:via-white/10 to-amber-500/15 shadow-sm">
          <div className="rounded-[22px] p-6 sm:p-8 lg:p-10 bg-white/90 dark:bg-[#101728]/95 border border-stone-200/80 dark:border-white/10 backdrop-blur-md">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
              {/* ── 1. Left: Founder Polaroid Card ───────────────── */}
              <div className="lg:col-span-4 flex justify-center lg:justify-start">
                <div className="relative rotate-[-2.5deg] p-3 sm:p-4 rounded-2xl border shadow-xl max-w-[280px] sm:max-w-[300px] w-full transition-transform hover:rotate-0 hover:scale-102 duration-300 bg-[#FFFBF0] dark:bg-[#182238] border-[#E2CEAB] dark:border-white/15 text-[#2C1D11] dark:text-slate-100 shadow-[0_12px_32px_rgba(74,44,18,0.14)] dark:shadow-black/60">
                  {/* Top-Left Corner Tape */}
                  <WashiTape className="-top-3 -left-3" rotate={-24} />
                  {/* Bottom-Right Corner Tape */}
                  <WashiTape className="-bottom-3 -right-3" rotate={16} />

                  {/* Founder Photo */}
                  <div className="relative aspect-[4/4.3] w-full rounded-xl overflow-hidden border border-[#D9C29D] dark:border-stone-700 shadow-inner bg-[#F5E6CC] dark:bg-stone-800">
                    <picture className="w-full h-full">
                      <source type="image/avif" srcSet="/Founder.avif" />
                      <source type="image/webp" srcSet="/Founder.webp" />
                      <img
                        src="/Founder.png"
                        alt="Kethan Kumar Gontla — Founder & Creator of Bhalyam"
                        width={400}
                        height={430}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-500"
                      />
                    </picture>
                  </div>

                  {/* Caption */}
                  <div className="mt-3.5 px-1 text-left select-none">
                    <h3 className="font-sans font-black text-[18px] sm:text-[20px] leading-tight tracking-tight">
                      Kethan Kumar Gontla
                    </h3>
                    <p className="font-script text-[17px] sm:text-[18px] font-bold text-[#C54F03] dark:text-amber-400 mt-0.5 flex items-center gap-1.5">
                      <span>Founder &amp; Creator of Bhalyam</span>
                      <span className="text-[16px]">♡</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* ── 2. Center: Hero Story & Headline ─────────────── */}
              <div className="lg:col-span-4 text-left space-y-3.5">
                <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-extrabold tracking-widest text-[11px] sm:text-[12px] uppercase">
                  <span>★</span>
                  <span>THE DIGITAL VERANDA</span>
                  <span>★</span>
                </div>

                <div className="space-y-0.5">
                  <h2 className="font-display text-[28px] sm:text-[36px] font-black leading-tight text-[#16223B] dark:text-white">
                    Built from memories.
                  </h2>
                  <span className="font-script text-[34px] sm:text-[44px] font-extrabold text-[#E85D04] dark:text-amber-400 leading-none block">
                    Made for you.
                  </span>
                </div>

                <blockquote className="font-sans italic text-[14px] sm:text-[15px] text-[#4A3320] dark:text-amber-100/90 leading-snug pl-3 border-l-2 border-[#E85D04]">
                  “I wanted to build the place I wished existed when our school gang grew up and moved across cities.”
                </blockquote>

                <p className="text-xs sm:text-sm leading-relaxed text-[#6E543D] dark:text-stone-300">
                  Bhalyam is our love letter to the 90s — to the friendships, the chalk-dust, the lunch breaks, the game nights, and the unforgettable memories that made us who we are.
                </p>

                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold border bg-[#FFF9EC] dark:bg-white/5 border-[#E6D4B7] dark:border-white/10 text-[#5C3D24] dark:text-amber-300">
                    <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> Made with Love
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold border bg-[#FFF9EC] dark:bg-white/5 border-[#E6D4B7] dark:border-white/10 text-[#5C3D24] dark:text-amber-300">
                    <Users className="w-3.5 h-3.5 text-amber-500" /> 90s Kids
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold border bg-[#FFF9EC] dark:bg-white/5 border-[#E6D4B7] dark:border-white/10 text-[#5C3D24] dark:text-amber-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Safe &amp; Friendly
                  </span>
                </div>
              </div>

              {/* ── 3. Right: Scrapbook & Memories Polaroid ───────── */}
              <div className="lg:col-span-4 relative flex justify-center items-center min-h-[280px] sm:min-h-[300px]">
                <div className="relative w-full max-w-[320px] aspect-[4/3.3] rounded-2xl border shadow-md p-3 overflow-hidden select-none bg-[#FFFDF4] dark:bg-[#141C30] border-[#E6D5B8] dark:border-white/10">
                  <div className="absolute left-1.5 top-0 bottom-0 flex flex-col justify-around py-2 z-10">
                    {[...Array(6)].map((_, i) => (
                      <span key={i} className="w-4 h-2 rounded-full bg-[#8C7359] dark:bg-zinc-600 border border-[#5C4532] shadow-2xs" />
                    ))}
                  </div>

                  <SketchbookArtSVG className="absolute inset-0 pl-5" />

                  <div className="absolute top-2.5 right-2 rotate-[4deg] bg-[#FEF08A] dark:bg-[#EAB308]/90 text-stone-900 border border-[#CA8A04] rounded-lg p-2.5 shadow-md max-w-[155px] z-20">
                    <PushPin className="absolute -top-3.5 left-1/2 -translate-x-1/2" />
                    <p className="font-script text-[14px] font-extrabold leading-tight text-center pt-1 text-stone-900">
                      “Not just games, It&apos;s our childhood again. ♡”
                    </p>
                  </div>

                  <div className="absolute bottom-2.5 left-6 rotate-[-4deg] p-2 rounded-xl border shadow-xl max-w-[190px] sm:max-w-[210px] z-20 bg-white dark:bg-[#1F2B44] border-[#E0D0B6] dark:border-white/20">
                    <picture className="w-full h-full">
                      <source type="image/avif" srcSet="/about_carrom_kids.avif" />
                      <source type="image/webp" srcSet="/about_carrom_kids.webp" />
                      <img
                        src="/about_carrom_kids.jpg"
                        alt="Gang of friends playing games together"
                        width={210}
                        height={112}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-24 sm:h-28 object-cover rounded-lg border border-[#ECD9BA]"
                      />
                    </picture>
                    <SmileyBadge className="absolute -bottom-3 -right-3" />
                  </div>

                  <AirplaneWithLoopSVG className="absolute bottom-0 right-0 pointer-events-none z-30" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            SECTION 2: 90s INTERACTIVE NOSTALGIA SOUNDBOARD (Audience Power)
            ══════════════════════════════════════════════════════════ */}
        <section className="relative rounded-3xl p-0.5 bg-gradient-to-b from-amber-500/20 via-stone-300/20 dark:via-white/5 to-orange-500/20 shadow-sm">
          <div className="rounded-[22px] p-6 sm:p-7 bg-white/95 dark:bg-[#111827]/95 border border-stone-200/80 dark:border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-amber-500" />
                  <h3 className="font-display font-bold text-base sm:text-lg text-stone-900 dark:text-white">
                    Nostalgic 90s Soundboard
                  </h3>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                    Tap to Play
                  </span>
                </div>
                <p className="text-xs text-stone-500 dark:text-slate-400">
                  Hear the sounds of our school lunch breaks, rainy summer afternoons, and veranda championship finals.
                </p>
              </div>
              {activeSound && (
                <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 animate-pulse">
                  Playing: {activeSound} 🔊
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => handleTriggerSfx("bell", "School Bell")}
                className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-[#182238] border border-amber-200/80 dark:border-amber-500/20 hover:border-amber-500 text-left transition-all hover:scale-102 active:scale-95 cursor-pointer min-h-[44px] group focus-visible:outline-2 focus-visible:outline-amber-500"
              >
                <span className="text-2xl block mb-1">🔔</span>
                <h4 className="font-bold text-xs text-stone-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400">
                  School Bell
                </h4>
                <p className="text-[10.5px] text-stone-500 dark:text-slate-400">Period end chime</p>
              </button>

              <button
                type="button"
                onClick={() => handleTriggerSfx("striker", "Carrom Striker")}
                className="p-3.5 rounded-2xl bg-orange-50/70 dark:bg-[#182238] border border-orange-200/80 dark:border-orange-500/20 hover:border-orange-500 text-left transition-all hover:scale-102 active:scale-95 cursor-pointer min-h-[44px] group focus-visible:outline-2 focus-visible:outline-amber-500"
              >
                <span className="text-2xl block mb-1">🎯</span>
                <h4 className="font-bold text-xs text-stone-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400">
                  Carrom Striker
                </h4>
                <p className="text-[10.5px] text-stone-500 dark:text-slate-400">Wooden pocket thud</p>
              </button>

              <button
                type="button"
                onClick={() => handleTriggerSfx("chalk", "Chalk on Slate")}
                className="p-3.5 rounded-2xl bg-sky-50/70 dark:bg-[#182238] border border-sky-200/80 dark:border-sky-500/20 hover:border-sky-500 text-left transition-all hover:scale-102 active:scale-95 cursor-pointer min-h-[44px] group focus-visible:outline-2 focus-visible:outline-amber-500"
              >
                <span className="text-2xl block mb-1">✏️</span>
                <h4 className="font-bold text-xs text-stone-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400">
                  Chalk on Slate
                </h4>
                <p className="text-[10.5px] text-stone-500 dark:text-slate-400">Classroom blackboard</p>
              </button>

              <button
                type="button"
                onClick={() => handleTriggerSfx("dice", "Dice in Cup")}
                className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-[#182238] border border-purple-200/80 dark:border-purple-500/20 hover:border-purple-500 text-left transition-all hover:scale-102 active:scale-95 cursor-pointer min-h-[44px] group focus-visible:outline-2 focus-visible:outline-amber-500"
              >
                <span className="text-2xl block mb-1">🎲</span>
                <h4 className="font-bold text-xs text-stone-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400">
                  Dice Cup Rattle
                </h4>
                <p className="text-[10.5px] text-stone-500 dark:text-slate-400">Shaking a roll of 6</p>
              </button>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            SECTION 3: LIVE LOUNGE HEARTBEAT METRICS (Double-Bezel)
            ══════════════════════════════════════════════════════════ */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-3xl p-0.5 bg-gradient-to-b from-amber-500/20 to-transparent shadow-xs">
            <div className="rounded-[22px] p-5 bg-white/95 dark:bg-[#111827]/90 border border-stone-200/80 dark:border-white/10 text-center space-y-1">
              <span className="text-2xl sm:text-3xl font-black font-mono text-amber-600 dark:text-amber-400 block">
                16+
              </span>
              <h4 className="font-bold text-xs text-stone-900 dark:text-white">Nostalgic Games</h4>
              <p className="text-[10.5px] text-stone-500 dark:text-slate-400">Board, card & retro 90s titles</p>
            </div>
          </div>

          <div className="rounded-3xl p-0.5 bg-gradient-to-b from-emerald-500/20 to-transparent shadow-xs">
            <div className="rounded-[22px] p-5 bg-white/95 dark:bg-[#111827]/90 border border-stone-200/80 dark:border-white/10 text-center space-y-1">
              <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 block">
                50,000+
              </span>
              <h4 className="font-bold text-xs text-stone-900 dark:text-white">Matches Relived</h4>
              <p className="text-[10.5px] text-stone-500 dark:text-slate-400">Friendships kept alive daily</p>
            </div>
          </div>

          <div className="rounded-3xl p-0.5 bg-gradient-to-b from-sky-500/20 to-transparent shadow-xs">
            <div className="rounded-[22px] p-5 bg-white/95 dark:bg-[#111827]/90 border border-stone-200/80 dark:border-white/10 text-center space-y-1">
              <span className="text-2xl sm:text-3xl font-black font-mono text-sky-600 dark:text-sky-400 block">
                100%
              </span>
              <h4 className="font-bold text-xs text-stone-900 dark:text-white">Free &amp; Open</h4>
              <p className="text-[10.5px] text-stone-500 dark:text-slate-400">Zero paywalls, zero ads</p>
            </div>
          </div>

          <div className="rounded-3xl p-0.5 bg-gradient-to-b from-purple-500/20 to-transparent shadow-xs">
            <div className="rounded-[22px] p-5 bg-white/95 dark:bg-[#111827]/90 border border-stone-200/80 dark:border-white/10 text-center space-y-1">
              <span className="text-2xl sm:text-3xl font-black font-mono text-purple-600 dark:text-purple-400 block">
                0₹
              </span>
              <h4 className="font-bold text-xs text-stone-900 dark:text-white">Zero Real-Money Gambling</h4>
              <p className="text-[10.5px] text-stone-500 dark:text-slate-400">Pure nostalgic play only</p>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            SECTION 4: OUR STORY & NOSTALGIA TIMELINE
            ══════════════════════════════════════════════════════════ */}
        <section className="relative rounded-3xl p-0.5 bg-gradient-to-b from-stone-300/40 dark:from-white/15 to-transparent shadow-sm">
          <div className="rounded-[22px] p-6 sm:p-8 bg-white/95 dark:bg-[#101728]/95 border border-stone-200/80 dark:border-white/10 space-y-6">
            <div className="max-w-2xl space-y-1">
              <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-extrabold tracking-widest text-[11px] uppercase">
                <span>★</span>
                <span>JOURNEY THROUGH TIME</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-display font-black text-stone-900 dark:text-white">
                How Childhood Echoes Across 30 Years
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-300 leading-relaxed">
                Bhalyam is rooted in the simple times before push notifications, when summer vacations were measured in carrom powder, scraped knees, and shouting "OUT!" across classroom benches.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {NOSTALGIA_TIMELINE.map((item, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-stone-50 dark:bg-[#162035] border border-stone-200/70 dark:border-white/10 space-y-2 hover:border-amber-500/40 transition-all hover:scale-102"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-xs font-mono font-black text-amber-600 dark:text-amber-400">
                      {item.year}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-stone-900 dark:text-white">{item.title}</h4>
                  <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            SECTION 5: FOOTER QUOTE & SOCIAL CARD
            ══════════════════════════════════════════════════════════ */}
        <footer className="rounded-3xl p-5 sm:p-6 bg-white/90 dark:bg-[#101728]/90 border border-stone-200/80 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2 font-script text-[20px] sm:text-[22px] font-extrabold text-[#5C3D24] dark:text-amber-300">
            <span className="text-xl">✈️</span>
            <span>Play Together. Remember Forever.</span>
            <span className="text-rose-500">♡</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/games"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs shadow-sm hover:scale-105 transition min-h-[44px]"
            >
              <Gamepad2 className="w-4 h-4" />
              <span>Explore 16+ Games</span>
            </Link>
          </div>

          <div className="text-xs font-semibold text-stone-500 dark:text-slate-400">
            © 2026 BHALYAM. Made with <span className="text-rose-500">❤️</span> for 90s Kids.
          </div>
        </footer>
      </div>
    </HelpLayout>
  );
}
