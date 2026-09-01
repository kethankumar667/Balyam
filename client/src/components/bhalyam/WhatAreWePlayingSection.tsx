import { ArrowRight, Plus, Sparkles, Heart } from "lucide-react";
import { useTheme } from "../../lib/useTheme";
import { type BhalyamGameSlug } from "./data";

interface WhatAreWePlayingSectionProps {
  onSelectGame: (slug: BhalyamGameSlug) => void;
  onOpenCreateRoom: () => void;
}

export default function WhatAreWePlayingSection({
  onSelectGame,
  onOpenCreateRoom,
}: WhatAreWePlayingSectionProps) {
  const [theme] = useTheme();
  const isDark = theme === "dark";

  const SCENARIOS = [
    {
      title: "School Break",
      image: "/images/nostalgia/school-break.jpg",
      bgLight: "bg-[#FFF9EA] border-[#F2DEB9] text-[#5C3717]",
      bgDark: "bg-[#1C1710] border-amber-900/40 text-amber-200",
      accent: "from-amber-400/20 to-orange-400/10",
      caption: "Relive those lunch break battles!",
      games: [
        { name: "Hand Cricket", slug: "handcricket" as BhalyamGameSlug },
        { name: "Carrom", slug: "carrom" as BhalyamGameSlug },
        { name: "Dots & Boxes", slug: "dotsboxes" as BhalyamGameSlug },
      ],
    },
    {
      title: "Rainy Evening",
      image: "/images/nostalgia/rainy-evening.jpg",
      bgLight: "bg-[#F0F7FF] border-[#D0E4FA] text-[#1E4E8C]",
      bgDark: "bg-[#0E1829] border-blue-900/40 text-blue-200",
      accent: "from-blue-400/20 to-teal-400/10",
      caption: "Monsoon + Games = Magic!",
      games: [
        { name: "Ludo", slug: "ludo" as BhalyamGameSlug },
        { name: "Snakes & Ladders", slug: "snl" as BhalyamGameSlug },
        { name: "Rummy", slug: "rummy" as BhalyamGameSlug },
      ],
    },
    {
      title: "Sunday Afternoon",
      image: "/images/nostalgia/sunday-afternoon.png",
      bgLight: "bg-[#F0FDF4] border-[#DCFCE7] text-[#166534]",
      bgDark: "bg-[#0C1F15] border-emerald-900/40 text-emerald-200",
      accent: "from-emerald-400/20 to-lime-400/10",
      caption: "Long afternoons, endless fun.",
      games: [
        { name: "UNO", slug: "uno" as BhalyamGameSlug },
        { name: "Brick Blocks", slug: "brickblocks" as BhalyamGameSlug },
        { name: "Name Place Animal", slug: "namesplaceanimal" as BhalyamGameSlug },
      ],
    },
    {
      title: "Friends' Adda",
      image: "/images/nostalgia/friends-adda.jpg",
      bgLight: "bg-[#FFF5F1] border-[#FED7AA] text-[#9A3412]",
      bgDark: "bg-[#24130E] border-orange-900/40 text-orange-200",
      accent: "from-orange-400/20 to-rose-400/10",
      caption: "Adda, masti & memories!",
      games: [
        { name: "Tambola", slug: "tambola" as BhalyamGameSlug },
        { name: "Rock Paper Scissors", slug: "rps" as BhalyamGameSlug },
        { name: "Star Game", slug: "stargame" as BhalyamGameSlug },
      ],
    },
  ];

  return (
    <section className="my-8 sm:my-10 space-y-6">
      {/* ── Section Title ── */}
      <div className="flex items-center gap-2">
        <h2 className="bhalyam-display text-[22px] sm:text-[28px] font-black text-[#2A221B] dark:text-white tracking-tight">
          What are we playing today?
        </h2>
        <Sparkles className="w-5 h-5 text-amber-500 fill-amber-500/20 animate-pulse" aria-hidden />
      </div>

      {/* ── 4 Nostalgic Scene Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {SCENARIOS.map((sc) => (
          <div
            key={sc.title}
            className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border-2 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-lg relative overflow-hidden group ${
              isDark ? sc.bgDark : sc.bgLight
            }`}
          >
            {/* Top Scrapbook Image Container */}
            <div className="space-y-3">
              <div className="relative w-full h-44 sm:h-48 rounded-xl sm:rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 shadow-xs bg-[#FBF6E9] dark:bg-[#15110B] flex items-center justify-center">
                <picture className="w-full h-full">
                  <source type="image/avif" srcSet={sc.image.replace(/\.(png|jpg|jpeg)$/i, '.avif')} />
                  <source type="image/webp" srcSet={sc.image.replace(/\.(png|jpg|jpeg)$/i, '.webp')} />
                  <img
                    src={sc.image}
                    alt={sc.title}
                    width={400}
                    height={240}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </picture>
              </div>

              {/* Title */}
              <h3 className="bhalyam-display text-[18px] sm:text-[20px] font-black tracking-tight pt-1">
                {sc.title}
              </h3>

              {/* Game list */}
              <ul className="space-y-1.5 text-[13px] font-bold">
                {sc.games.map((g) => (
                  <li key={g.slug}>
                    <button
                      type="button"
                      onClick={() => onSelectGame(g.slug)}
                      className="hover:underline text-left flex w-full min-h-[44px] items-center gap-1.5 transition-colors cursor-pointer group/btn focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500 rounded-md px-1"
                    >
                      <span className="opacity-60 group-hover/btn:opacity-100 text-amber-500">•</span>
                      <span>{g.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Bottom Caption */}
            <div className="mt-4 pt-3 border-t border-current/15">
              <p className="bhalyam-script text-[15px] sm:text-[16px] font-bold opacity-90 leading-tight">
                {sc.caption}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Bottom Hero Card: "Bring your gang back! ❤️" ── */}
      <div
        className={`p-5 sm:p-6 rounded-2xl sm:rounded-3xl border-2 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-6 transition-all ${
          isDark
            ? "bg-[#0E1527] border-white/10 text-white"
            : "bg-[#FFFDF8] border-[#ECD9BA] text-[#3D2005]"
        }`}
      >
        {/* Left: Illustration + Emotional Heading */}
        <div className="flex items-center gap-4 text-left w-full lg:w-auto">
          <div className="relative w-28 h-20 sm:w-36 sm:h-22 rounded-2xl overflow-hidden border-2 border-amber-400/50 shadow-md flex-shrink-0 bg-amber-100 dark:bg-amber-950/40">
            <picture className="w-full h-full">
              <source type="image/avif" srcSet="/images/nostalgia/gang-reunion.avif" />
              <source type="image/webp" srcSet="/images/nostalgia/gang-reunion.webp" />
              <img
                src="/images/nostalgia/gang-reunion.jpg"
                alt="Gang Reunion"
                width={144}
                height={88}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
              />
            </picture>
          </div>

          <div className="leading-tight">
            <h3 className="bhalyam-display text-[20px] sm:text-[23px] font-black flex items-center gap-2 text-[#2A221B] dark:text-white">
              <span>Bring your gang back!</span>
              <Heart className="w-5 h-5 text-rose-500 fill-rose-500 inline-block animate-bounce shrink-0" aria-hidden />
            </h3>
            <p className="text-[13px] sm:text-sm font-medium text-[#7A5B3E] dark:text-zinc-300 mt-1">
              Old friends. Same jokes. New memories.
            </p>
          </div>
        </div>

        {/* Center: 4-Step Illustrated Flowchart */}
        <div className="hidden xl:flex items-center gap-3 text-center text-[11px] font-extrabold text-zinc-600 dark:text-zinc-300">
          {/* Step 1: Create a room */}
          <div className="flex flex-col items-center gap-1.5 group">
            <div className="w-11 h-11 rounded-xl overflow-hidden border border-amber-400/50 shadow-xs bg-[#FAF5E6] dark:bg-amber-950/30 flex items-center justify-center">
              <picture className="w-full h-full">
                <source type="image/avif" srcSet="/images/nostalgia/create-room-icon.avif" />
                <source type="image/webp" srcSet="/images/nostalgia/create-room-icon.webp" />
                <img
                  src="/images/nostalgia/create-room-icon.png"
                  alt="Create Room"
                  width={44}
                  height={44}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              </picture>
            </div>
            <span className="whitespace-nowrap">Create a room</span>
          </div>

          <ArrowRight className="w-4 h-4 text-amber-500/70 -mt-4 flex-shrink-0" />

          {/* Step 2: Share the code */}
          <div className="flex flex-col items-center gap-1.5 group">
            <div className="w-11 h-11 rounded-xl overflow-hidden border border-purple-400/50 shadow-xs bg-[#FAF5E6] dark:bg-purple-950/30 flex items-center justify-center">
              <picture className="w-full h-full">
                <source type="image/avif" srcSet="/images/nostalgia/share-code-icon.avif" />
                <source type="image/webp" srcSet="/images/nostalgia/share-code-icon.webp" />
                <img
                  src="/images/nostalgia/share-code-icon.png"
                  alt="Share Code"
                  width={44}
                  height={44}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              </picture>
            </div>
            <span className="whitespace-nowrap">Share the code</span>
          </div>

          <ArrowRight className="w-4 h-4 text-amber-500/70 -mt-4 flex-shrink-0" />

          {/* Step 3: Start the game */}
          <div className="flex flex-col items-center gap-1.5 group">
            <div className="w-11 h-11 rounded-xl border border-blue-400/50 shadow-xs bg-gradient-to-br from-blue-50 to-teal-50 dark:from-blue-950/50 dark:to-teal-950/50 flex items-center justify-center text-xl">
              🎮
            </div>
            <span className="whitespace-nowrap">Start the game</span>
          </div>

          <ArrowRight className="w-4 h-4 text-amber-500/70 -mt-4 flex-shrink-0" />

          {/* Step 4: Relive childhood */}
          <div className="flex flex-col items-center gap-1.5 group">
            <div className="w-11 h-11 rounded-xl border border-rose-400/50 shadow-xs bg-gradient-to-br from-rose-50 to-amber-50 dark:from-rose-950/50 dark:to-amber-950/50 flex items-center justify-center text-xl text-rose-500">
              ❤️
            </div>
            <span className="whitespace-nowrap text-rose-600 dark:text-rose-400 font-black">
              Relive childhood!
            </span>
          </div>
        </div>

        {/* Right: Action. Create Room is the only one — the WhatsApp share that
            used to sit beside it is gone, and the row is sized for one button
            so the heading beside it keeps its line rather than wrapping to
            four. Sharing still lives where it is actually useful: on the room
            code itself, once there is a code worth sending. */}
        <div className="flex items-center w-full lg:w-auto flex-shrink-0">
          {/*
            Create Room Button.

            Fill darkened from #10B981 to emerald-700. White on #10B981 measures
            2.54:1 in the browser, against 13.5px label text that WCAG 2.1 AA and
            docs/ai/accessibility-standards.md §1.1 both put at 4.5:1. #047857 is
            the same green four steps down and measures 5.55:1.
          */}
          <button
            type="button"
            onClick={onOpenCreateRoom}
            className="w-full sm:w-auto px-6 py-3 min-h-[44px] rounded-2xl bg-[#047857] hover:bg-[#065F46] active:scale-95 text-white font-extrabold text-sm sm:text-[14px] shadow-md transition cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0E1527]"
          >
            <Plus className="w-4.5 h-4.5" />
            <span>Create Room</span>
          </button>
        </div>
      </div>
    </section>
  );
}
