import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeftIcon } from "../components/auth/authIcons";
import AppLayout from "../components/layout/AppLayout";

/* ────────────── Inline SVG Illustrations ────────────── */

function KidsLogoHeaderSVG({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 60" fill="none" xmlns="http://www.w3.org/2000/svg" className={`w-16 h-8 ${className}`}>
      <circle cx="25" cy="18" r="8" stroke="#5C3717" strokeWidth="2" fill="#FFF8E7" />
      <path d="M18 16 Q 25 10 32 16" stroke="#5C3717" strokeWidth="2" fill="none" />
      <circle cx="22" cy="18" r="1" fill="#5C3717" />
      <circle cx="28" cy="18" r="1" fill="#5C3717" />
      <path d="M23 22 Q 25 24 27 22" stroke="#5C3717" strokeWidth="1.5" fill="none" />
      <path d="M25 26 L25 42 M16 31 L34 31 M25 42 L18 56 M25 42 L32 56" stroke="#5C3717" strokeWidth="2" strokeLinecap="round" />

      <circle cx="60" cy="14" r="8" stroke="#5C3717" strokeWidth="2" fill="#FFF8E7" />
      <path d="M50 14 C 48 8, 54 8, 56 12" stroke="#5C3717" strokeWidth="2" fill="none" />
      <path d="M70 14 C 72 8, 66 8, 64 12" stroke="#5C3717" strokeWidth="2" fill="none" />
      <circle cx="57" cy="14" r="1" fill="#5C3717" />
      <circle cx="63" cy="14" r="1" fill="#5C3717" />
      <path d="M58 18 Q 60 20 62 18" stroke="#5C3717" strokeWidth="1.5" fill="none" />
      <path d="M60 22 L52 40 L68 40 Z M60 40 L54 54 M60 40 L66 54" stroke="#5C3717" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="#FFF8E7" />

      <circle cx="95" cy="18" r="8" stroke="#5C3717" strokeWidth="2" fill="#FFF8E7" />
      <path d="M88 16 Q 95 10 102 16" stroke="#5C3717" strokeWidth="2" fill="none" />
      <circle cx="92" cy="18" r="1" fill="#5C3717" />
      <circle cx="98" cy="18" r="1" fill="#5C3717" />
      <path d="M93 22 Q 95 24 97 22" stroke="#5C3717" strokeWidth="1.5" fill="none" />
      <path d="M95 26 L95 42 M86 31 L104 31 M95 42 L88 56 M95 42 L102 56" stroke="#5C3717" strokeWidth="2" strokeLinecap="round" />

      <path d="M32 31 Q 42 36 52 31" stroke="#5C3717" strokeWidth="2" fill="none" />
      <path d="M68 31 Q 78 36 86 31" stroke="#5C3717" strokeWidth="2" fill="none" />
    </svg>
  );
}

function SunRaysIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`w-4 h-4 text-[#FFB703] ${className}`} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.05" y2="7.05" />
      <line x1="16.95" y1="16.95" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.05" y2="16.95" />
      <line x1="16.95" y1="7.05" x2="19.07" y2="4.93" />
    </svg>
  );
}

function PaperPlaneDoodleSVG({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 80" fill="none" stroke="#5C3717" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-20 h-16 ${className}`}>
      <path d="M10 65 Q 25 75 35 60 T 45 45" strokeDasharray="3 3" opacity="0.6" />
      <path d="M45 45 L90 15 L60 70 L48 52 L78 28 L45 45 Z" fill="#FFFDF5" />
      <path d="M48 52 L48 64 L56 57" fill="#5C3717" opacity="0.2" />
    </svg>
  );
}

function SchoolDoodleSVG({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" stroke="#D4A574" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`w-32 h-32 ${className}`}>
      {/* School building doodle */}
      <rect x="30" y="50" width="60" height="50" fill="none" />
      <polygon points="60,25 20,50 100,50" fill="none" />
      <rect x="52" y="70" width="16" height="30" fill="none" />
      <circle cx="60" cy="40" r="5" fill="none" />
      <line x1="60" y1="15" x2="60" y2="25" />
      <path d="M60 15 L72 18 L60 21 Z" fill="#D4A574" opacity="0.6" />
    </svg>
  );
}

function FourKidsWithBackpacksSVG({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={`w-44 h-16 ${className}`}>
      {[30, 80, 130, 180].map((x, i) => (
        <g key={i}>
          {/* Backpack */}
          <rect x={x-14} y="32" width="8" height="16" rx="2" fill="#5C3717" opacity="0.7" />
          {/* Kid Body */}
          <circle cx={x} cy="22" r="9" stroke="#5C3717" strokeWidth="2.2" fill="#FFF8E7" />
          <path d={`M${x-6} 20 Q ${x} 16 ${x+6} 20`} stroke="#5C3717" strokeWidth="2" fill="none" />
          <path d={`M${x} 31 L${x} 52 M${x-7} 38 L${x+7} 38 M${x} 52 L${x-6} 70 M${x} 52 L${x+6} 70`} stroke="#5C3717" strokeWidth="2.2" strokeLinecap="round" />
        </g>
      ))}
      {/* Arms holding shoulders/hands */}
      <path d="M37 38 L73 38" stroke="#5C3717" strokeWidth="2" />
      <path d="M87 38 L123 38" stroke="#5C3717" strokeWidth="2" />
      <path d="M137 38 L173 38" stroke="#5C3717" strokeWidth="2" />
    </svg>
  );
}

function FourKidsHoldingHandsSVG({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 70" fill="none" xmlns="http://www.w3.org/2000/svg" className={`w-36 h-12 ${className}`}>
      {[25, 75, 125, 175].map((x, i) => (
        <g key={i}>
          <circle cx={x} cy="20" r="9" stroke="#5C3717" strokeWidth="2.2" fill="#FFF8E7" />
          <path d={`M${x-6} 18 Q ${x} 14 ${x+6} 18`} stroke="#5C3717" strokeWidth="2" fill="none" />
          <circle cx={x-3} cy="20" r="1" fill="#5C3717" />
          <circle cx={x+3} cy="20" r="1" fill="#5C3717" />
          <path d={`M${x-3} 24 Q ${x} 26 ${x+3} 24`} stroke="#5C3717" strokeWidth="1.8" fill="none" />
          <path d={`M${x} 29 L${x} 48 M${x-8} 35 L${x+8} 35 M${x} 48 L${x-7} 64 M${x} 48 L${x+7} 64`} stroke="#5C3717" strokeWidth="2.2" strokeLinecap="round" />
        </g>
      ))}
      <path d="M33 35 Q 54 42 67 35" stroke="#5C3717" strokeWidth="2" fill="none" />
      <path d="M83 35 Q 104 42 117 35" stroke="#5C3717" strokeWidth="2" fill="none" />
      <path d="M133 35 Q 154 42 167 35" stroke="#5C3717" strokeWidth="2" fill="none" />
    </svg>
  );
}

/* ────────────── Main AboutPage Component ────────────── */

export default function AboutPage() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail("");
      setTimeout(() => setSubscribed(false), 4000);
    }
  };

  return (
    <AppLayout>
      <div className="min-h-full bg-[#FAF3E0] font-sans text-[#5C3717] pb-16">
        {/* Main Content Area */}
        <main className="max-w-[1240px] mx-auto px-4 sm:px-6 pt-6 space-y-10">

        {/* Hero Section */}
        <section className="bg-[#FFFDF8] border border-[#E6D4B5] rounded-[32px] p-6 sm:p-10 shadow-xs relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8 text-left">
          
          <div className="max-w-[620px]">
            <span className="text-[12px] font-extrabold uppercase tracking-widest text-[#E85D04] block mb-1">
              ABOUT US
            </span>

            <h1 className="bhalyam-display text-[36px] sm:text-[48px] font-extrabold text-[#4A2508] leading-tight">
              A place where 90&apos;s kids come back to play.
            </h1>

            <p className="text-[14.5px] sm:text-[15.5px] leading-relaxed text-[#7A5B3E] mt-4">
              BHALYAM is more than just games. It&apos;s a memory machine. We bring back the joy of school days, evening laughter, handwritten scores and those unforgettable weekends. No ads. No noise. Just pure nostalgia.
            </p>

            {/* 4 Feature Badges Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
              <div className="flex items-center gap-2 bg-[#FFF8E7] border border-[#E6D4B5] rounded-xl p-2.5">
                <span className="text-base">👥</span>
                <span className="text-[11.5px] font-bold text-[#5C3717] leading-tight">Play together anytime</span>
              </div>

              <div className="flex items-center gap-2 bg-[#FFF8E7] border border-[#E6D4B5] rounded-xl p-2.5">
                <span className="text-base">🛡️</span>
                <span className="text-[11.5px] font-bold text-[#5C3717] leading-tight">Safe &amp; ad-free experience</span>
              </div>

              <div className="flex items-center gap-2 bg-[#FFF8E7] border border-[#E6D4B5] rounded-xl p-2.5">
                <span className="text-base">🎵</span>
                <span className="text-[11.5px] font-bold text-[#5C3717] leading-tight">Classic 90s sounds</span>
              </div>

              <div className="flex items-center gap-2 bg-[#FFF8E7] border border-[#E6D4B5] rounded-xl p-2.5">
                <span className="text-base">❤️</span>
                <span className="text-[11.5px] font-bold text-[#5C3717] leading-tight">Made for real friends</span>
              </div>
            </div>
          </div>

          {/* Right: Taped Photo Frame notebook drawing */}
          <div className="flex-shrink-0 relative group">
            <div className="relative rotate-[2deg] bg-[#FFF8E7] p-3 border border-[#D4A574] rounded-2xl shadow-md max-w-[280px] sm:max-w-[320px]">
              
              {/* Corner Tapes */}
              <span className="absolute -top-3 -left-3 w-12 h-5 bg-[#F2DFA8]/90 border border-[#D9BE7A] rotate-[-20deg] shadow-2xs" />
              <span className="absolute -bottom-3 -right-3 w-12 h-5 bg-[#F2DFA8]/90 border border-[#D9BE7A] rotate-[15deg] shadow-2xs" />

              <img
                src="/about_carrom_kids.jpg"
                alt="Kids playing Carrom"
                className="w-full h-auto rounded-xl border border-[#E8D8BE] object-cover shadow-2xs"
              />

              <div className="mt-3 text-right">
                <span className="bhalyam-script text-[20px] font-bold text-[#6D4323] leading-none block">
                  Good times never fade
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Founder Story Card */}
        <section className="bg-[#FFFDF6] border border-[#E8D8BE] rounded-[32px] p-6 sm:p-10 shadow-md relative overflow-hidden text-left">
          
          {/* Founder Section Illustration Asset */}
          <img
            src="/Foundersectionasset.png"
            alt="BHALYAM Pencil Jar, Dice &amp; Pawns"
            className="hidden sm:block absolute right-4 bottom-4 w-36 sm:w-44 h-auto opacity-80 pointer-events-none object-contain"
          />

          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
            
            {/* Left: Taped photo of Founder Kethan + Handwritten Note */}
            <div className="flex-shrink-0 flex flex-col items-center">
              <div className="relative rotate-[-3deg] bg-[#FFF8E7] p-3 border border-[#D4A574] rounded-2xl shadow-md max-w-[220px] sm:max-w-[240px]">
                
                {/* Paperclip */}
                <span className="absolute -top-4 left-4 w-5 h-10 border-2 border-[#64748B] rounded-full rotate-[-15deg] pointer-events-none" />

                <img
                  src="/Founder.png"
                  alt="Kethan Kumar Gontla"
                  className="w-full h-auto rounded-xl border border-[#E8D8BE] object-cover shadow-2xs"
                />
              </div>

              {/* Taped handwritten note */}
              <div className="bg-[#FFF8E7] border border-[#E4D1AC] rounded-xl p-3.5 mt-4 max-w-[230px] rotate-[2deg] shadow-xs text-center">
                <p className="bhalyam-script text-[18px] font-bold text-[#6D4323] leading-snug">
                  “Some games never end, they just wait for the right people.”
                </p>
                <span className="bhalyam-script text-[16px] font-bold text-[#E85D04] block mt-1">
                  — Kethan
                </span>
              </div>
            </div>

            {/* Right: Founder Story Prose */}
            <div className="flex-1 max-w-[620px]">
              <span className="text-[12px] font-extrabold uppercase tracking-widest text-[#E85D04] block mb-1">
                FOUNDER STORY
              </span>

              <h2 className="bhalyam-display text-[32px] sm:text-[40px] font-extrabold text-[#4A2508] leading-tight">
                The kid who never stopped playing
              </h2>

              <div className="space-y-3 mt-4 text-[14.5px] leading-relaxed text-[#7A5B3E]">
                <p>
                  BHALYAM was built by Kethan Kumar Gontla, a 90&apos;s kid who grew up with carrom boards, pen fights, lunchbox trades and endless weekend games.
                </p>
                <p>
                  As life got busy, the gang got scattered. But the memories stayed.
                </p>
                <p>
                  One day, the idea was simple — why not build a place where we can all come back, play our favorite games and feel like those carefree kids again?
                </p>
                <p className="font-bold text-[#4A2508]">
                  That&apos;s how BHALYAM was born.
                </p>
              </div>

              {/* Social Buttons Row */}
              <div className="flex items-center gap-3 mt-6 flex-wrap">
                <a
                  href="https://www.instagram.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#D9C4A3] text-[12.5px] font-bold text-[#5C3717] hover:bg-[#FBE7C6] transition-all shadow-xs"
                >
                  <span className="text-base text-[#E11D48]">📷</span>
                  <span>Instagram</span>
                </a>

                <a
                  href="https://wa.me/?text=Join%20me%20on%20BHALYAM%20-%20https%3A%2F%2Fbhalyam.onrender.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#D9C4A3] text-[12.5px] font-bold text-[#5C3717] hover:bg-[#FBE7C6] transition-all shadow-xs"
                >
                  <span className="text-base text-[#25D366]">💬</span>
                  <span>WhatsApp</span>
                </a>

                <a
                  href="mailto:hello@bhalyam.app"
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#D9C4A3] text-[12.5px] font-bold text-[#5C3717] hover:bg-[#FBE7C6] transition-all shadow-xs"
                >
                  <span className="text-base text-[#2563EB]">✉️</span>
                  <span>Email</span>
                </a>
              </div>
            </div>

          </div>
        </section>

        {/* Our Purpose Cards (Mission, Vision, Values) */}
        <section className="space-y-6">
          <div className="text-center">
            <span className="text-[12px] font-extrabold uppercase tracking-widest text-[#9C7E63] flex items-center justify-center gap-1.5">
              <span>=</span> <span>OUR PURPOSE</span> <span>=</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            
            {/* Card 1: Our Mission */}
            <div className="bg-[#FFFDF6] border border-[#E2F0D9] rounded-2xl p-6 shadow-xs flex flex-col items-center justify-between">
              <div>
                <div className="w-12 h-12 rounded-full bg-[#E6F4EA] text-[#137333] border border-[#A7F3D0] flex items-center justify-center text-xl mb-3 shadow-xs">
                  🎯
                </div>
                <h3 className="text-[20px] font-extrabold text-[#4A2508] mb-2">Our Mission</h3>
                <p className="text-[13.5px] text-[#7A5B3E] leading-relaxed">
                  To bring 90&apos;s kids together through classic games, real friendships and meaningful memories.
                </p>
              </div>

              {/* Doodle Illustration */}
              <div className="mt-4 pt-4 border-t border-[#E2F0D9]/70 w-full flex justify-center">
                <svg viewBox="0 0 100 40" fill="none" stroke="#137333" strokeWidth="1.5" className="w-24 h-10 opacity-70">
                  <circle cx="30" cy="15" r="5" />
                  <path d="M30 20 L30 35 M22 25 L38 25 M30 35 L24 45 M30 35 L36 45" />
                  <circle cx="70" cy="15" r="5" />
                  <path d="M70 20 L70 35 M62 25 L78 25 M70 35 L64 45 M70 35 L76 45" />
                  <rect x="42" y="28" width="16" height="12" fill="none" />
                </svg>
              </div>
            </div>

            {/* Card 2: Our Vision */}
            <div className="bg-[#FFFDF6] border border-[#FDE8D0] rounded-2xl p-6 shadow-xs flex flex-col items-center justify-between">
              <div>
                <div className="w-12 h-12 rounded-full bg-[#FFF5E6] text-[#E85D04] border border-[#FCDDB5] flex items-center justify-center text-xl mb-3 shadow-xs">
                  👁️
                </div>
                <h3 className="text-[20px] font-extrabold text-[#4A2508] mb-2">Our Vision</h3>
                <p className="text-[13.5px] text-[#7A5B3E] leading-relaxed">
                  To become the world&apos;s most loved nostalgia gaming lounge where everyone belongs.
                </p>
              </div>

              {/* Doodle Illustration */}
              <div className="mt-4 pt-4 border-t border-[#FDE8D0]/70 w-full flex justify-center">
                <FourKidsHoldingHandsSVG className="w-28 h-10 opacity-70" />
              </div>
            </div>

            {/* Card 3: Our Values */}
            <div className="bg-[#FFFDF6] border border-[#F3E8FF] rounded-2xl p-6 shadow-xs flex flex-col items-center justify-between">
              <div className="w-full">
                <div className="w-12 h-12 rounded-full bg-[#F3E8FF] text-[#7C3AED] border border-[#DDD6FE] flex items-center justify-center text-xl mb-3 shadow-xs mx-auto">
                  💜
                </div>
                <h3 className="text-[20px] font-extrabold text-[#4A2508] mb-3">Our Values</h3>
                
                <ul className="space-y-2 text-[13.5px] font-bold text-[#5C3717] text-left max-w-[200px] mx-auto">
                  <li className="flex items-center gap-2">
                    <span className="text-[#7C3AED]">⭐</span> Nostalgia First
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#7C3AED]">⭐</span> Real Connections
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#7C3AED]">⭐</span> Safe &amp; Respectful
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#7C3AED]">⭐</span> Pure &amp; Honest Fun
                  </li>
                </ul>
              </div>
            </div>

          </div>
        </section>

        {/* Built For Your Gang Section */}
        <section className="bg-[#FFFDF6] border border-[#F2E3C6] rounded-2xl p-6 sm:p-10 shadow-xs relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8 text-left">
          
          <div className="max-w-[560px]">
            <span className="text-[12px] font-extrabold uppercase tracking-widest text-[#E85D04] block mb-1">
              BUILT FOR YOUR GANG
            </span>

            <h2 className="bhalyam-display text-[32px] sm:text-[42px] font-extrabold text-[#4A2508] leading-tight">
              Relive. Reconnect. Remember.
            </h2>

            <p className="text-[14.5px] leading-relaxed text-[#7A5B3E] mt-3">
              Whether it&apos;s a quick game or a long night of laughter, BHALYAM is your table, your rules, your memories.
            </p>

            {/* Game Chips Row */}
            <div className="flex items-center gap-2.5 mt-5 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFF8E7] border border-[#E6D4B5] text-[12.5px] font-bold text-[#4A2508]">
                <span>🎲</span> <span>Ludo</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFF8E7] border border-[#E6D4B5] text-[12.5px] font-bold text-[#4A2508]">
                <span>🟫</span> <span>Carrom</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFF8E7] border border-[#E6D4B5] text-[12.5px] font-bold text-[#4A2508]">
                <span>🐍</span> <span>Snakes &amp; Ladders</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFF8E7] border border-[#E6D4B5] text-[12.5px] font-bold text-[#4A2508]">
                <span>🎴</span> <span>Rummy</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF0D9] border border-[#D4A574] text-[12.5px] font-bold text-[#E85D04]">
                <span>➕</span> <span>And more coming...</span>
              </div>
            </div>
          </div>

          {/* Right: Stack of Polaroid Photos */}
          <div className="flex-shrink-0 flex items-center gap-3">
            <div className="relative rotate-[-4deg] bg-white p-2 border border-[#E8D8BE] rounded-lg shadow-md max-w-[150px]">
              <img src="/about_carrom_kids.jpg" alt="Ludo board" className="w-full h-auto rounded border border-[#E8D8BE]" />
              <span className="bhalyam-script text-[14px] font-bold text-[#5C3717] block mt-1 text-center">Ludo Night</span>
            </div>

            <div className="relative rotate-[3deg] bg-[#FFFDF5] p-3 border border-[#E8D8BE] rounded-lg shadow-md max-w-[140px]">
              <div className="text-left font-mono text-[11px] text-[#5C3717] space-y-1">
                <span className="font-bold border-b border-[#E8D8BE] block pb-0.5">Best Score</span>
                <div>Rani: 100</div>
                <div>Ketan: 95</div>
                <div>Venu: 90</div>
                <div>Arun: 85</div>
              </div>
            </div>
          </div>

        </section>

        {/* Quote Banner */}
        <section className="bg-[#FFF8E7] border border-[#E6D4B5] rounded-2xl p-6 shadow-xs relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div className="flex items-center gap-4">
            <FourKidsWithBackpacksSVG className="w-40 h-14 flex-shrink-0" />
            <p className="bhalyam-script text-[22px] sm:text-[26px] font-extrabold text-[#6D4323] leading-snug">
              We didn&apos;t lose touch, we just grew up. <br />
              <span className="text-[#E85D04]">Now, let&apos;s play again.</span>
            </p>
          </div>

          <PaperPlaneDoodleSVG className="w-16 h-12 flex-shrink-0" />
        </section>

      </main>

      {/* Footer */}
      <footer className="max-w-[1240px] mx-auto px-6 pt-10 border-t border-[#E6D4B5]/60 mt-12 text-[#5C3717]">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start mb-6 text-left">
          
          {/* Brand Logo Column */}
          <div className="md:col-span-3">
            <img
              src="/FooterBhalyamlogo.png"
              alt="BHALYAM - Play Together. Remember Forever."
              className="w-48 sm:w-56 h-auto object-contain mb-1"
            />
          </div>

          {/* Links Columns: EXPLORE, SUPPORT, COMPANY, LEGAL */}
          <div className="md:col-span-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            
            {/* EXPLORE */}
            <div>
              <h4 className="text-[12px] font-extrabold uppercase tracking-wider text-[#4A2508] mb-2">
                EXPLORE
              </h4>
              <ul className="space-y-1.5 text-[12.5px] font-medium text-[#7A5B3E]">
                <li><Link to="/games" className="hover:text-[#E85D04] transition-colors">All Games</Link></li>
                <li><a href="#rooms" className="hover:text-[#E85D04] transition-colors">Rooms</a></li>
                <li><a href="#how-it-works" className="hover:text-[#E85D04] transition-colors">How It Works</a></li>
                <li><a href="#leaderboard" className="hover:text-[#E85D04] transition-colors">Leaderboard</a></li>
              </ul>
            </div>

            {/* SUPPORT */}
            <div>
              <h4 className="text-[12px] font-extrabold uppercase tracking-wider text-[#4A2508] mb-2">
                SUPPORT
              </h4>
              <ul className="space-y-1.5 text-[12.5px] font-medium text-[#7A5B3E]">
                <li><a href="#help" className="hover:text-[#E85D04] transition-colors">Help Center</a></li>
                <li><a href="#safety" className="hover:text-[#E85D04] transition-colors">Safety Guide</a></li>
                <li><a href="#rules" className="hover:text-[#E85D04] transition-colors">Community Rules</a></li>
                <li><a href="#report" className="hover:text-[#E85D04] transition-colors">Report an Issue</a></li>
              </ul>
            </div>

            {/* COMPANY */}
            <div>
              <h4 className="text-[12px] font-extrabold uppercase tracking-wider text-[#4A2508] mb-2">
                COMPANY
              </h4>
              <ul className="space-y-1.5 text-[12.5px] font-medium text-[#7A5B3E]">
                <li><Link to="/about" className="hover:text-[#E85D04] transition-colors">About BHALYAM</Link></li>
                <li><a href="#story" className="hover:text-[#E85D04] transition-colors">Our Story</a></li>
                <li><a href="#careers" className="hover:text-[#E85D04] transition-colors">Careers</a></li>
                <li><a href="#press" className="hover:text-[#E85D04] transition-colors">Press Kit</a></li>
              </ul>
            </div>

            {/* LEGAL */}
            <div>
              <h4 className="text-[12px] font-extrabold uppercase tracking-wider text-[#4A2508] mb-2">
                LEGAL
              </h4>
              <ul className="space-y-1.5 text-[12.5px] font-medium text-[#7A5B3E]">
                <li><Link to="/privacy" className="hover:text-[#E85D04] transition-colors">Privacy Notice</Link></li>
                <li><a href="#terms" className="hover:text-[#E85D04] transition-colors">Terms of Service</a></li>
                <li><Link to="/profile" className="hover:text-[#E85D04] transition-colors">Your Data &amp; Choices</Link></li>
              </ul>
            </div>

          </div>

          {/* STAY IN THE LOOP */}
          <div className="md:col-span-3">
            <h4 className="text-[12px] font-extrabold uppercase tracking-wider text-[#4A2508] mb-1.5">
              STAY IN THE LOOP
            </h4>
            <p className="text-[12px] leading-snug text-[#7A5B3E] mb-3">
              Get updates about new games, events and awesome 90s vibes.
            </p>

            <form onSubmit={handleSubscribe} className="relative mb-3">
              <div className="flex items-center bg-[#F7EBD3] rounded-xl p-1 border border-[#E4D1AC]">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="bg-transparent text-[11.5px] text-[#4A2508] placeholder-[#9C7E63] px-2.5 focus:outline-none flex-1 min-w-0 font-medium"
                  required
                />
                <button
                  type="submit"
                  className="bg-[#E85D04] hover:bg-[#D45000] text-white text-[11.5px] font-bold rounded-lg px-3.5 py-1.5 transition-all shadow-xs active:scale-95 flex-shrink-0"
                >
                  Subscribe
                </button>
              </div>
              {subscribed && (
                <span className="text-[11px] text-[#25D366] font-bold mt-1 block">
                  ✓ Thanks for subscribing!
                </span>
              )}
            </form>
          </div>

        </div>

        {/* Copyright & Attribution Bar */}
        <div className="relative pt-4 border-t border-[#E8D8BE]/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] font-semibold text-[#8C6D4F]">
          
          <div className="flex items-center gap-2">
            <PaperPlaneDoodleSVG className="w-12 h-8 text-[#5C3717]" />
            <span>© {new Date().getFullYear()} BHALYAM · All rights reserved.</span>
          </div>

          <div className="flex items-center gap-3">
            <span>Built solo with <span className="text-[#E11D48]">❤️</span> for every school-gang reunion</span>
            <img
              src="/FooterBootom.png"
              alt="Happy school gang"
              className="w-28 sm:w-36 h-auto object-contain flex-shrink-0"
            />
          </div>

        </div>

      </footer>

      </div>
    </AppLayout>
  );
}
