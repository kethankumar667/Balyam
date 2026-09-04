import { Link } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import { useTheme } from "../lib/useTheme";

/* ─────────────────────────────────────────────────────────────
   Nostalgic Doodle & Illustration SVGs
   ───────────────────────────────────────────────────────────── */

/** Translucent washi tape with ragged torn edges */
function WashiTape({ className = "", rotate = 0 }: { className?: string; rotate?: number }) {
  return (
    <div
      style={{ transform: `rotate(${rotate}deg)` }}
      className={`absolute w-14 h-5.5 bg-[#F2E0B2]/85 dark:bg-[#D4B67A]/60 border-y border-[#DFC28B]/80 dark:border-[#B5965A]/80 shadow-[0_1px_3px_rgba(0,0,0,0.12)] backdrop-blur-2xs pointer-events-none z-20 ${className}`}
    />
  );
}

/** 3D Red Pushpin with cast shadow */
function PushPin({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className={`w-7 h-7 drop-shadow-md ${className}`}>
      {/* Pin Shadow */}
      <ellipse cx="14" cy="24" rx="5" ry="2" fill="rgba(0,0,0,0.25)" />
      {/* Pin Needle */}
      <path d="M14 16 L14 23" stroke="#8E9AA8" strokeWidth="1.8" strokeLinecap="round" />
      {/* Red Plastic Cap */}
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

/** Yellow Smiley Face Sticker */
function SmileyBadge({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={`w-9 h-9 drop-shadow-md ${className}`}>
      <circle cx="20" cy="20" r="18" fill="url(#smileyGrad)" stroke="#D97706" strokeWidth="2" />
      {/* Eyes */}
      <ellipse cx="14" cy="16" rx="2" ry="3" fill="#78350F" />
      <ellipse cx="26" cy="16" rx="2" ry="3" fill="#78350F" />
      {/* Smile with cheek dimples */}
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

/** Dotted loop trail paper airplane */
function AirplaneWithLoopSVG({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`w-32 h-20 ${className}`}>
      {/* Dotted Swooping Loop */}
      <path
        d="M 15 85 C 40 95, 75 75, 70 45 C 65 15, 30 25, 45 60 C 60 90, 110 85, 135 40"
        stroke="#8A684C"
        strokeWidth="1.6"
        strokeDasharray="4 4"
        strokeLinecap="round"
        opacity="0.65"
      />
      {/* Paper Plane */}
      <g transform="translate(125, 20) rotate(15)">
        <polygon points="0,15 26,0 16,28 11,18" fill="#FFFDF8" stroke="#5C3717" strokeWidth="1.4" strokeLinejoin="round" />
        <polygon points="11,18 26,0 16,28" fill="#F4E6CF" stroke="#5C3717" strokeWidth="1.4" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

/** Open Spiral Sketchbook Background Artwork */
function SketchbookArtSVG({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" className={`w-full h-full opacity-60 dark:opacity-40 ${className}`}>
      {/* School / Playground Tree Doodle */}
      <path d="M 50 180 Q 50 120 70 90 Q 90 60 110 90 Q 130 120 120 180" stroke="#7A5B3E" strokeWidth="1.5" strokeDasharray="3 3" fill="none" />
      <path d="M 60 110 Q 35 100 45 75 Q 55 50 85 60 Q 110 40 135 65 Q 155 90 135 115" stroke="#7A5B3E" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      
      {/* Kids Playing in Field Doodle */}
      {/* Kid 1 - Running */}
      <circle cx="95" cy="140" r="6" stroke="#7A5B3E" strokeWidth="1.4" />
      <path d="M 95 146 L 95 162 M 90 152 L 105 150 M 95 162 L 88 175 M 95 162 L 104 174" stroke="#7A5B3E" strokeWidth="1.4" strokeLinecap="round" />
      
      {/* Kid 2 - Throwing Ball */}
      <circle cx="145" cy="135" r="6" stroke="#7A5B3E" strokeWidth="1.4" />
      <path d="M 145 141 L 145 158 M 138 145 L 155 142 M 145 158 L 139 172 M 145 158 L 152 172" stroke="#7A5B3E" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="162" cy="136" r="2.5" fill="#7A5B3E" />

      {/* Sun in Sky */}
      <circle cx="210" cy="50" r="14" stroke="#D97706" strokeWidth="1.4" strokeDasharray="3 2" fill="none" />
      <line x1="210" y1="30" x2="210" y2="24" stroke="#D97706" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="230" y1="50" x2="236" y2="50" stroke="#D97706" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="190" y1="50" x2="184" y2="50" stroke="#D97706" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="224" y1="36" x2="228" y2="32" stroke="#D97706" strokeWidth="1.4" strokeLinecap="round" />

      {/* Classic Car / Scooter doodle in background */}
      <path d="M 190 175 L 230 175 Q 235 170 230 162 L 218 162 L 210 152 L 195 152 L 188 162 L 182 162 Q 180 170 190 175 Z" stroke="#7A5B3E" strokeWidth="1.3" fill="none" />
      <circle cx="195" cy="175" r="4" stroke="#7A5B3E" strokeWidth="1.3" />
      <circle cx="222" cy="175" r="4" stroke="#7A5B3E" strokeWidth="1.3" />
    </svg>
  );
}

/** Two Kids Riding a Bicycle Pencil Doodle */
function BicycleDoodleSVG({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 110 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={`w-24 h-18 ${className}`}>
      {/* Wheels */}
      <circle cx="28" cy="56" r="16" stroke="#5C4532" strokeWidth="1.8" />
      <circle cx="28" cy="56" r="2.5" fill="#5C4532" />
      <circle cx="82" cy="56" r="16" stroke="#5C4532" strokeWidth="1.8" />
      <circle cx="82" cy="56" r="2.5" fill="#5C4532" />
      
      {/* Frame */}
      <path d="M 28 56 L 48 38 L 74 38 L 82 56 M 48 38 L 56 56 L 82 56 M 48 38 L 52 28 M 74 38 L 72 26" stroke="#5C4532" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {/* Handlebar & Seat */}
      <path d="M 68 24 L 78 24 M 46 28 L 56 28" stroke="#5C4532" strokeWidth="2" strokeLinecap="round" />

      {/* Driver Kid */}
      <circle cx="68" cy="14" r="5.5" stroke="#5C4532" strokeWidth="1.6" fill="#FFFDF8" />
      <path d="M 68 19.5 L 64 36 M 68 25 L 74 24" stroke="#5C4532" strokeWidth="1.6" strokeLinecap="round" />

      {/* Passenger Kid on back carrier */}
      <circle cx="44" cy="18" r="5" stroke="#5C4532" strokeWidth="1.6" fill="#FFFDF8" />
      <path d="M 44 23 L 42 38 M 44 27 L 56 26" stroke="#5C4532" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main About Page Component
   ───────────────────────────────────────────────────────────── */

export default function AboutPage() {
  const [theme] = useTheme();
  const isDark = theme === "dark";

  return (
    <AppLayout showFallingPetals>
      <div className={`min-h-full font-sans pb-16 transition-colors duration-200 ${
        isDark ? "bg-[#0A0F1D] text-slate-100" : "bg-[#F7EFE1] text-[#3D2612]"
      }`}>
        <main className="max-w-[1240px] mx-auto px-3.5 sm:px-6 pt-5 sm:pt-7 space-y-6 sm:space-y-7">

          {/* ══════════════════════════════════════════════════════════
              SECTION 1: HERO & FOUNDER MEMORIES CARD
              ══════════════════════════════════════════════════════════ */}
          <section className={`relative rounded-3xl sm:rounded-[36px] border p-5 sm:p-8 lg:p-10 shadow-[0_8px_30px_rgba(74,44,18,0.06)] overflow-hidden transition-colors ${
            isDark
              ? "bg-[#101728]/95 border-white/10"
              : "bg-[#FFFDF8] border-[#ECD9BA]"
          }`}>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">

              {/* ── 1. Left: Founder Polaroid Card ───────────────── */}
              <div className="lg:col-span-4 flex justify-center lg:justify-start">
                <div className={`relative rotate-[-2.5deg] p-3 sm:p-4 rounded-2xl border shadow-xl max-w-[280px] sm:max-w-[300px] w-full transition-transform hover:rotate-0 hover:scale-102 duration-300 ${
                  isDark
                    ? "bg-[#182238] border-white/15 text-slate-100 shadow-black/60"
                    : "bg-[#FFFBF0] border-[#E2CEAB] text-[#2C1D11] shadow-[0_12px_32px_rgba(74,44,18,0.14)]"
                }`}>
                  
                  {/* Top-Left Corner Tape */}
                  <WashiTape className="-top-3 -left-3" rotate={-24} />
                  {/* Bottom-Right Corner Tape */}
                  <WashiTape className="-bottom-3 -right-3" rotate={16} />

                  {/* Founder Photo */}
                  <div className="relative aspect-[4/4.3] w-full rounded-xl overflow-hidden border border-[#D9C29D] shadow-inner bg-[#F5E6CC]">
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
                
                {/* Badge Header */}
                <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-400 font-extrabold tracking-widest text-[11px] sm:text-[12px] uppercase">
                  <span>★</span>
                  <span>ABOUT BHALYAM</span>
                  <span>★</span>
                </div>

                {/* Main Headline */}
                <div className="space-y-0.5">
                  <h1 className="font-display text-[30px] sm:text-[38px] font-black leading-tight text-[#16223B] dark:text-white">
                    Built from memories.
                  </h1>
                  <span className="font-script text-[36px] sm:text-[46px] font-extrabold text-[#E85D04] dark:text-amber-400 leading-none block">
                    Made for you.
                  </span>
                </div>

                {/* Founder Quote */}
                <blockquote className="font-sans italic text-[15px] sm:text-[16px] text-[#4A3320] dark:text-amber-100/90 leading-snug pl-3 border-l-2 border-[#E85D04]">
                  “I wanted to build the place I wished existed when our school gang grew up.”
                </blockquote>

                {/* Prose */}
                <p className="text-sm sm:text-[15px] leading-relaxed text-[#6E543D] dark:text-zinc-300">
                  Bhalyam is our love letter to the 90s — to the friendships, the chalk-dust, the lunch breaks, the game nights, and the unforgettable memories that made us who we are.
                </p>

                {/* 4 Feature Badges Strip */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border transition-all ${
                    isDark
                      ? "bg-white/5 border-white/10 text-amber-300"
                      : "bg-[#FFF9EC] border-[#E6D4B7] text-[#5C3D24]"
                  }`}>
                    <span className="text-rose-500">♡</span> Made with Love
                  </span>

                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border transition-all ${
                    isDark
                      ? "bg-white/5 border-white/10 text-amber-300"
                      : "bg-[#FFF9EC] border-[#E6D4B7] text-[#5C3D24]"
                  }`}>
                    <span>👥</span> For 90s Kids
                  </span>

                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border transition-all ${
                    isDark
                      ? "bg-white/5 border-white/10 text-amber-300"
                      : "bg-[#FFF9EC] border-[#E6D4B7] text-[#5C3D24]"
                  }`}>
                    <span className="text-emerald-500">🛡️</span> Safe &amp; Friendly
                  </span>

                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border transition-all ${
                    isDark
                      ? "bg-white/5 border-white/10 text-amber-300"
                      : "bg-[#FFF9EC] border-[#E6D4B7] text-[#5C3D24]"
                  }`}>
                    <span>🏆</span> Play. Share. Remember.
                  </span>
                </div>

              </div>

              {/* ── 3. Right: Scrapbook & Memories Polaroid ───────── */}
              <div className="lg:col-span-4 relative flex justify-center items-center min-h-[290px] sm:min-h-[320px]">
                
                {/* Spiral Sketchbook Backing */}
                <div className={`relative w-full max-w-[320px] aspect-[4/3.3] rounded-2xl border shadow-md p-3 overflow-hidden select-none ${
                  isDark
                    ? "bg-[#141C30] border-white/10"
                    : "bg-[#FFFDF4] border-[#E6D5B8]"
                }`}>
                  {/* Sketchbook spiral binder rings on left edge */}
                  <div className="absolute left-1.5 top-0 bottom-0 flex flex-col justify-around py-2 z-10">
                    {[...Array(6)].map((_, i) => (
                      <span key={i} className="w-4 h-2 rounded-full bg-[#8C7359] dark:bg-zinc-600 border border-[#5C4532] shadow-2xs" />
                    ))}
                  </div>

                  {/* Hand-drawn Schoolyard Art SVG */}
                  <SketchbookArtSVG className="absolute inset-0 pl-5" />

                  {/* Yellow Taped Sticky Note with PushPin */}
                  <div className="absolute top-2.5 right-2 rotate-[4deg] bg-[#FEF08A] dark:bg-[#EAB308]/90 text-sand-800 border border-[#CA8A04] rounded-lg p-2.5 shadow-md max-w-[155px] z-20">
                    <PushPin className="absolute -top-3.5 left-1/2 -translate-x-1/2" />
                    {/*
                      Ink stated on the paragraph, and stated for BOTH themes.

                      The sticky note is yellow in dark mode too (`dark:bg-[#EAB308]/90`),
                      so it is one of the few surfaces that must NOT flip its ink when the
                      page does. Inheriting from the wrapper was not enough: in dark mode
                      the paragraph resolved to #F1F5F9 on #D5A40C — 2.10:1, measured.
                      That is the two-part rule failing in the usual way, one half flipping
                      without the other.
                    */}
                    <p className="font-script text-[15px] font-extrabold leading-tight text-center pt-1 text-sand-800 dark:text-sand-900">
                      “Not just games, It&apos;s our childhood again. ♡”
                    </p>
                  </div>

                  {/* Overlapping Kids Polaroid Photo */}
                  <div className={`absolute bottom-2.5 left-6 rotate-[-4deg] p-2 rounded-xl border shadow-xl max-w-[190px] sm:max-w-[210px] z-20 ${
                    isDark
                      ? "bg-[#1F2B44] border-white/20"
                      : "bg-[#FFFFFF] border-[#E0D0B6]"
                  }`}>
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
                    
                    {/* Smiley Badge on Polaroid bottom right */}
                    <SmileyBadge className="absolute -bottom-3 -right-3" />
                  </div>

                  {/* Swooping Paper Plane Trail */}
                  <AirplaneWithLoopSVG className="absolute bottom-0 right-0 pointer-events-none z-30" />

                </div>

              </div>

            </div>

          </section>


          {/* ══════════════════════════════════════════════════════════
              SECTION 2: OUR STORY & 5-STEP MILESTONES TIMELINE
              ══════════════════════════════════════════════════════════ */}
          <section className={`rounded-3xl sm:rounded-[36px] border p-5 sm:p-8 shadow-[0_6px_24px_rgba(74,44,18,0.05)] overflow-hidden transition-colors ${
            isDark
              ? "bg-[#101728]/95 border-white/10"
              : "bg-[#FFFDF8] border-[#ECD9BA]"
          }`}>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
              
              {/* Left: Our Story Narrative */}
              <div className="lg:col-span-4 text-left space-y-2.5">
                <div className="flex items-center gap-1.5 text-chest-700 dark:text-lamp-300 font-extrabold tracking-widest text-[11px] sm:text-[12px] uppercase">
                  <span>★</span>
                  <span>OUR STORY</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-display font-black text-[#2C1D11] dark:text-white">
                  Our Story
                </h2>

                <p className="text-sm sm:text-[15px] leading-relaxed text-[#4A3220] dark:text-zinc-200">
                  Bhalyam started as a simple thought: What if all the games we loved as kids could bring us together again?
                </p>

                <p className="text-sm sm:text-[15px] leading-relaxed text-[#6E543D] dark:text-zinc-400">
                  From cricket in the corridor to carrom championships, from paper games to board game battles — every memory is now a room you can join.
                </p>

                <p className="font-script text-[19px] sm:text-[22px] font-bold text-[#E85D04] dark:text-amber-400 pt-1">
                  Same 90s feels, new age magic.
                </p>
              </div>

              {/* Right: 5-Step Timeline */}
              <div className="lg:col-span-8">
                <div className="relative">
                  
                  {/* Connecting Dashed Line behind nodes */}
                  <div className="hidden sm:block absolute top-7 left-8 right-8 h-0.5 border-t-2 border-dashed border-[#D9BE9B] dark:border-white/20 z-0" />

                  {/* 5 Milestone Nodes */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 sm:gap-2 relative z-10">
                    
                    {/* Node 1: The Idea */}
                    <div className="flex flex-col items-center text-center group">
                      <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shadow-md mb-2.5 transition-transform group-hover:scale-110 ${
                        isDark ? "bg-[#182238] border-amber-400/40 text-amber-300" : "bg-[#FFF9EA] border-[#E8D4B0] text-amber-600"
                      }`}>
                        <span className="text-2xl">💡</span>
                      </div>
                      <h3 className="font-sans font-bold text-[13px] sm:text-[14px] text-[#2C1D11] dark:text-white">
                        The Idea
                      </h3>
                      <p className="text-xs text-[#7A5E45] dark:text-zinc-400 leading-snug mt-1 max-w-[130px]">
                        A dream to recreate our childhood playground.
                      </p>
                    </div>

                    {/* Node 2: Built with Passion */}
                    <div className="flex flex-col items-center text-center group">
                      <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shadow-md mb-2.5 transition-transform group-hover:scale-110 ${
                        isDark ? "bg-[#182238] border-orange-400/40 text-orange-300" : "bg-[#FFF9EA] border-[#E8D4B0] text-orange-600"
                      }`}>
                        <span className="text-2xl">✏️</span>
                      </div>
                      <h3 className="font-sans font-bold text-[13px] sm:text-[14px] text-[#2C1D11] dark:text-white">
                        Built with Passion
                      </h3>
                      <p className="text-xs text-[#7A5E45] dark:text-zinc-400 leading-snug mt-1 max-w-[130px]">
                        Countless sketches, cups of chai and late night coding.
                      </p>
                    </div>

                    {/* Node 3: Testing with Friends */}
                    <div className="flex flex-col items-center text-center group">
                      <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shadow-md mb-2.5 transition-transform group-hover:scale-110 ${
                        isDark ? "bg-[#182238] border-sky-400/40 text-sky-300" : "bg-[#FFF9EA] border-[#E8D4B0] text-sky-600"
                      }`}>
                        <span className="text-2xl">👦👧</span>
                      </div>
                      <h3 className="font-sans font-bold text-[13px] sm:text-[14px] text-[#2C1D11] dark:text-white">
                        Testing with Friends
                      </h3>
                      <p className="text-xs text-[#7A5E45] dark:text-zinc-400 leading-snug mt-1 max-w-[130px]">
                        Friends, school gangs and endless game nights.
                      </p>
                    </div>

                    {/* Node 4: Bhalyam is Born */}
                    <div className="flex flex-col items-center text-center group">
                      <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shadow-md mb-2.5 transition-transform group-hover:scale-110 ${
                        isDark ? "bg-[#182238] border-amber-400/40 text-amber-300" : "bg-[#FFF9EA] border-[#E8D4B0] text-amber-600"
                      }`}>
                        <span className="text-2xl">🏆</span>
                      </div>
                      <h3 className="font-sans font-bold text-[13px] sm:text-[14px] text-[#2C1D11] dark:text-white">
                        Bhalyam is Born
                      </h3>
                      <p className="text-xs text-[#7A5E45] dark:text-zinc-400 leading-snug mt-1 max-w-[130px]">
                        A platform to relive, reconnect and recreate memories.
                      </p>
                    </div>

                    {/* Node 5: The Journey Continues */}
                    <div className="col-span-2 sm:col-span-1 flex flex-col items-center text-center group">
                      <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shadow-md mb-2.5 transition-transform group-hover:scale-110 ${
                        isDark ? "bg-[#182238] border-rose-400/40 text-rose-300" : "bg-[#FFF9EA] border-[#E8D4B0] text-rose-600"
                      }`}>
                        <span className="text-2xl">💌</span>
                      </div>
                      <h3 className="font-sans font-bold text-[13px] sm:text-[14px] text-[#2C1D11] dark:text-white">
                        The Journey Continues
                      </h3>
                      <p className="text-xs text-[#7A5E45] dark:text-zinc-400 leading-snug mt-1 max-w-[130px]">
                        This is just the beginning...
                      </p>
                    </div>

                  </div>

                </div>
              </div>

            </div>

          </section>


          {/* ══════════════════════════════════════════════════════════
              SECTION 3: TWO SPLIT CARDS (CORE VALUES + DIFFERENTIATORS)
              ══════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-7">
            
            {/* ── Left Card: ★ OUR CORE VALUES (5 Cols) ─────────── */}
            <section className={`lg:col-span-6 rounded-3xl sm:rounded-[36px] border p-5 sm:p-7 shadow-[0_6px_24px_rgba(74,44,18,0.05)] flex flex-col justify-between transition-colors ${
              isDark
                ? "bg-[#101728]/95 border-white/10"
                : "bg-[#FFFDF8] border-[#ECD9BA]"
            }`}>
              <div>
                <div className="flex items-center gap-1.5 text-chest-700 dark:text-lamp-300 font-extrabold tracking-widest text-[11px] sm:text-[12px] uppercase mb-4">
                  <span>★</span>
                  <span>OUR CORE VALUES</span>
                </div>

                {/* 5 Core Values Pill Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  
                  {/* 1. Safe First */}
                  <div className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-between transition-all hover:-translate-y-1 ${
                    isDark ? "bg-[#182238]/80 border-white/10" : "bg-[#FFFBF2] border-[#ECE0C8]"
                  }`}>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-lg mb-2">
                      🛡️
                    </div>
                    <div>
                      <h5 className="font-sans font-bold text-[12px] text-[#2C1D11] dark:text-white">
                        Safe First
                      </h5>
                      <p className="text-[10px] text-[#7A5E45] dark:text-zinc-400 leading-tight mt-1">
                        A secure, respectful space for everyone.
                      </p>
                    </div>
                  </div>

                  {/* 2. Togetherness */}
                  <div className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-between transition-all hover:-translate-y-1 ${
                    isDark ? "bg-[#182238]/80 border-white/10" : "bg-[#FFFBF2] border-[#ECE0C8]"
                  }`}>
                    <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-lg mb-2">
                      👥
                    </div>
                    <div>
                      <h5 className="font-sans font-bold text-[12px] text-[#2C1D11] dark:text-white">
                        Togetherness
                      </h5>
                      <p className="text-[10px] text-[#7A5E45] dark:text-zinc-400 leading-tight mt-1">
                        Because the best memories are shared.
                      </p>
                    </div>
                  </div>

                  {/* 3. Nostalgia */}
                  <div className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-between transition-all hover:-translate-y-1 ${
                    isDark ? "bg-[#182238]/80 border-white/10" : "bg-[#FFFBF2] border-[#ECE0C8]"
                  }`}>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-lg mb-2">
                      ⭐
                    </div>
                    <div>
                      <h5 className="font-sans font-bold text-[12px] text-[#2C1D11] dark:text-white">
                        Nostalgia
                      </h5>
                      <p className="text-[10px] text-[#7A5E45] dark:text-zinc-400 leading-tight mt-1">
                        We bring back the 90s, the right way.
                      </p>
                    </div>
                  </div>

                  {/* 4. Fun & Fair */}
                  <div className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-between transition-all hover:-translate-y-1 ${
                    isDark ? "bg-[#182238]/80 border-white/10" : "bg-[#FFFBF2] border-[#ECE0C8]"
                  }`}>
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-lg mb-2">
                      🎮
                    </div>
                    <div>
                      <h5 className="font-sans font-bold text-[12px] text-[#2C1D11] dark:text-white">
                        Fun &amp; Fair
                      </h5>
                      <p className="text-[10px] text-[#7A5E45] dark:text-zinc-400 leading-tight mt-1">
                        Pure fun. No gambling. No pay-to-win.
                      </p>
                    </div>
                  </div>

                  {/* 5. Built to Last */}
                  <div className={`col-span-2 sm:col-span-1 p-3 rounded-2xl border text-center flex flex-col items-center justify-between transition-all hover:-translate-y-1 ${
                    isDark ? "bg-[#182238]/80 border-white/10" : "bg-[#FFFBF2] border-[#ECE0C8]"
                  }`}>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-lg mb-2">
                      🌱
                    </div>
                    <div>
                      <h5 className="font-sans font-bold text-[12px] text-[#2C1D11] dark:text-white">
                        Built to Last
                      </h5>
                      <p className="text-[10px] text-[#7A5E45] dark:text-zinc-400 leading-tight mt-1">
                        For today, tomorrow and the next 20 years.
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            </section>


            {/* ── Right Card: ★ WHAT MAKES BHALYAM DIFFERENT? ─── */}
            <section className={`lg:col-span-6 rounded-3xl sm:rounded-[36px] border p-5 sm:p-7 shadow-[0_6px_24px_rgba(74,44,18,0.05)] transition-colors ${
              isDark
                ? "bg-[#101728]/95 border-white/10"
                : "bg-[#FFFDF8] border-[#ECD9BA]"
            }`}>
              
              <div className="flex items-center gap-1.5 text-chest-700 dark:text-lamp-300 font-extrabold tracking-widest text-[11px] sm:text-[12px] uppercase mb-4">
                <span>★</span>
                <span>WHAT MAKES BHALYAM DIFFERENT?</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                
                {/* 1. Pencil Mug Illustration */}
                <div className="sm:col-span-3 flex justify-center">
                  <div className="relative group">
                    <picture>
                      <source type="image/avif" srcSet="/Foundersectionasset.avif" />
                      <source type="image/webp" srcSet="/Foundersectionasset.webp" />
                      <img
                        src="/Foundersectionasset.png"
                        alt="BHALYAM Mug with Pencils, Brushes and Dice"
                        width={112}
                        height={112}
                        loading="lazy"
                        decoding="async"
                        className="w-24 sm:w-28 h-auto object-contain drop-shadow-md group-hover:scale-105 transition-transform"
                      />
                    </picture>
                  </div>
                </div>

                {/* 2. 5 Green Checkmark Features */}
                <div className="sm:col-span-5 space-y-2 text-left">
                  {[
                    "Real 90s games, reimagined for today",
                    "Create rooms, share codes, play instantly",
                    "Play with friends or bots",
                    "No spam. No toxicity. Just good vibes",
                    "Designed for friends who grew up together",
                  ].map((text, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="w-4.5 h-4.5 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs">
                        ✓
                      </span>
                      <span className="text-[12px] sm:text-[13px] font-bold text-[#3D2816] dark:text-zinc-200 leading-snug">
                        {text}
                      </span>
                    </div>
                  ))}
                </div>

                {/* 3. Taped Bicycle Doodle Note */}
                <div className="sm:col-span-4 flex justify-center">
                  <div className={`relative rotate-[3deg] p-3 rounded-2xl border shadow-md max-w-[170px] w-full text-center transition-transform hover:rotate-0 ${
                    isDark
                      ? "bg-[#182238] border-white/15 text-slate-100"
                      : "bg-[#FFFBF0] border-[#E2CEAB] text-[#2C1D11]"
                  }`}>
                    {/* Corner Tape */}
                    <WashiTape className="-top-2.5 -left-2" rotate={-20} />

                    <p className="font-script text-sm font-extrabold text-[#5C3D24] dark:text-amber-200 leading-tight">
                      “We didn&apos;t lose friends. <br />
                      We just grew up. <br />
                      Bhalyam brings us back. ♡”
                    </p>

                    <div className="flex justify-center mt-1">
                      <BicycleDoodleSVG className="opacity-90 dark:opacity-80" />
                    </div>
                  </div>
                </div>

              </div>

            </section>

          </div>


          {/* ══════════════════════════════════════════════════════════
              BOTTOM FOOTER BAR: SLOGAN + SOCIALS + COPYRIGHT
              ══════════════════════════════════════════════════════════ */}
          <footer className={`rounded-2xl sm:rounded-3xl border p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left transition-colors ${
            isDark
              ? "bg-[#101728]/80 border-white/10 text-zinc-400"
              : "bg-[#FFFDF8] border-[#ECD9BA] text-[#6E543D]"
          }`}>
            
            {/* Left: Paper Plane Slogan */}
            <div className="flex items-center gap-2 font-script text-[20px] sm:text-[22px] font-extrabold text-[#5C3D24] dark:text-amber-300">
              <span className="text-xl">✈️</span>
              <span>Play Together. Remember Forever.</span>
              <span className="text-rose-500">♡</span>
            </div>

            {/* Center: Social / Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Instagram */}
              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noreferrer"
                title="Instagram"
                aria-label="Instagram"
                className={`w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl border flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-xs ${
                  isDark
                    ? "bg-white/5 border-white/10 text-rose-400 hover:bg-white/10"
                    : "bg-[#FFF9EC] border-[#E6D4B7] text-rose-600 hover:bg-[#FBE7C6]"
                }`}
              >
                <span className="text-base">📷</span>
              </a>

              {/* WhatsApp */}
              <a
                href="https://wa.me/?text=Join%20me%20on%20BHALYAM%20-%20https%3A%2F%2Fbhalyam.onrender.com"
                target="_blank"
                rel="noreferrer"
                title="WhatsApp"
                aria-label="WhatsApp"
                className={`w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl border flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-xs ${
                  isDark
                    ? "bg-white/5 border-white/10 text-emerald-400 hover:bg-white/10"
                    : "bg-[#FFF9EC] border-[#E6D4B7] text-emerald-600 hover:bg-[#FBE7C6]"
                }`}
              >
                <span className="text-base">💬</span>
              </a>

              {/* Forum / Community */}
              <Link
                to="/games"
                title="Games Lounge"
                aria-label="Games Lounge"
                className={`w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl border flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-xs ${
                  isDark
                    ? "bg-white/5 border-white/10 text-amber-300 hover:bg-white/10"
                    : "bg-[#FFF9EC] border-[#E6D4B7] text-amber-600 hover:bg-[#FBE7C6]"
                }`}
              >
                <span className="text-base">🛋️</span>
              </Link>

              {/* Email */}
              <a
                href="mailto:hello@bhalyam.app"
                title="Email Us"
                aria-label="Email"
                className={`w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl border flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-xs ${
                  isDark
                    ? "bg-white/5 border-white/10 text-sky-400 hover:bg-white/10"
                    : "bg-[#FFF9EC] border-[#E6D4B7] text-sky-600 hover:bg-[#FBE7C6]"
                }`}
              >
                <span className="text-base">✉️</span>
              </a>

              {/* Games Play */}
              <Link
                to="/games"
                title="Play Games"
                aria-label="Play Games"
                className={`w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl border flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-xs ${
                  isDark
                    ? "bg-white/5 border-white/10 text-purple-400 hover:bg-white/10"
                    : "bg-[#FFF9EC] border-[#E6D4B7] text-purple-600 hover:bg-[#FBE7C6]"
                }`}
              >
                <span className="text-base">🎮</span>
              </Link>
            </div>

            {/* Right: Copyright */}
            <div className="text-[12px] font-semibold text-[#8C6D4F] dark:text-zinc-400">
              <span>© 2026 BHALYAM. Made with </span>
              <span className="text-rose-500">❤️</span>
              <span> for 90s Kids.</span>
            </div>

          </footer>

        </main>
      </div>
    </AppLayout>
  );
}
