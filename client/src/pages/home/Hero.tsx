import { useEffect, useState } from "react";
import { DoorOpen } from "lucide-react";
import { RevealOnScroll } from "../../components/RevealOnScroll";
import { useTheme } from "../../lib/useTheme";
import { useAudio } from "../../hooks/useAudio";
import { AUDIO } from "../../constants/audio";

export function Hero({
  onPlayFeatured,
  onOpenJoin,
}: {
  onPlayFeatured?: () => void;
  onOpenJoin: () => void;
}) {
  const { play } = useAudio();
  const [theme] = useTheme();
  const isDark = theme === "dark";
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [theme]);

  const heroImage = isDark
    ? (failed ? "/bhalyam-hero.png" : "/bhalyam-dark-hero.png")
    : (failed ? "/bhalyam-hero.png" : "/bhalyam-hero-clean.png");

  return (
    <RevealOnScroll as="section" amount={0.05} className="pt-2 pb-6 sm:pt-4 sm:pb-8">
      {/* ── Clip layer: owns border-radius + overflow-hidden, NO transforms ── */}
      <div className={`rounded-[26px] sm:rounded-[36px] overflow-hidden border ${
        isDark
          ? "border-slate-800 shadow-[0_14px_30px_-15px_rgba(0,0,0,0.7)]"
          : "border-[#E2D3BA] shadow-[0_14px_30px_-15px_rgba(74,44,22,0.35)]"
      }`}>
        {/* ── Main Hero Card ── */}
        <div
          className="relative"
          style={{ background: isDark ? "#0A0F1D" : "#FAF2DF" }}
        >
          <picture className="absolute inset-0 w-full h-full pointer-events-none">
            <source
              media="(max-width: 640px)"
              type="image/avif"
              srcSet={isDark ? (failed ? "/bhalyam-hero-sm.avif" : "/bhalyam-dark-hero-sm.avif") : (failed ? "/bhalyam-hero-sm.avif" : "/bhalyam-hero-clean-sm.avif")}
            />
            <source
              media="(max-width: 640px)"
              type="image/webp"
              srcSet={isDark ? (failed ? "/bhalyam-hero-sm.webp" : "/bhalyam-dark-hero-sm.webp") : (failed ? "/bhalyam-hero-sm.webp" : "/bhalyam-hero-clean-sm.webp")}
            />
            <source
              type="image/avif"
              srcSet={isDark ? (failed ? "/bhalyam-hero.avif" : "/bhalyam-dark-hero.avif") : (failed ? "/bhalyam-hero.avif" : "/bhalyam-hero-clean.avif")}
            />
            <source
              type="image/webp"
              srcSet={isDark ? (failed ? "/bhalyam-hero.webp" : "/bhalyam-dark-hero.webp") : (failed ? "/bhalyam-hero.webp" : "/bhalyam-hero-clean.webp")}
            />
            <img
              key={heroImage}
              src={heroImage}
              alt="Childhood games lounge"
              width={1448}
              height={1086}
              className="bhalyam-hero-drift absolute inset-0 w-full h-full object-cover object-right opacity-95"
              loading="eager"
              decoding="async"
              // @ts-expect-error fetchpriority in React 18
              fetchpriority="high"
              onError={() => setFailed(true)}
            />
          </picture>
          {/* Soft linear fade on left half to keep text readable */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: isDark
                ? "linear-gradient(90deg, rgba(10,15,29,0.98) 0%, rgba(10,15,29,0.92) 42%, rgba(10,15,29,0.55) 65%, rgba(10,15,29,0.05) 95%)"
                : "linear-gradient(90deg, rgba(254,249,235,0.98) 0%, rgba(254,249,235,0.94) 42%, rgba(254,249,235,0.55) 65%, rgba(254,249,235,0.05) 95%)",
            }}
          />

          <div className="relative z-10 px-5 sm:px-10 py-7 sm:py-9 max-w-xl">
            {/* Top Label (Issue 5) */}
            <span
              className={`text-xs sm:text-sm font-bold tracking-wide block mb-2 sm:mb-2.5 ${
                isDark ? "text-amber-400" : "text-amber-800"
              }`}
            >
              ✦ Welcome to BHALYAM ✦
            </span>

            {/* Headline with 4 lines & color coding */}
            <h1
              className={`bhalyam-display text-[32px] sm:text-[46px] lg:text-[54px] leading-[1.04] tracking-tight flex flex-col ${
                isDark ? "text-white" : "text-[#15294E]"
              }`}
            >
              <span>Ready to</span>
              <span className="text-[#A855F7] w-fit">
                relive
              </span>
              <span>your</span>
              <span className={isDark ? "text-[#10B981]" : "text-[#15803D]"}>childhood?</span>
            </h1>

            {/* Description (Hidden on mobile screens only) */}
            <p
              className={`hidden sm:block text-[14px] sm:text-base font-semibold max-w-sm sm:max-w-md mt-3 leading-snug ${
                isDark ? "text-slate-300" : "text-[#3B332A]"
              }`}
            >
              Pick a game, send the room code to your school WhatsApp group, and play instantly.
            </p>
            <p
              className={`hidden sm:block font-script italic text-[17px] sm:text-[20px] mt-1 ${
                isDark ? "text-amber-300" : "text-[#7B2F0E]"
              }`}
            >
              Bring your school gang back together!
            </p>

            {/* Action Buttons */}
            <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  play(AUDIO.UI_POPUP_OPEN);
                  onOpenJoin();
                }}
                className="py-3.5 px-6 sm:px-7 rounded-full flex items-center justify-center gap-2.5 font-bold text-sm sm:text-base bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 shadow-lg shadow-amber-500/30 active:scale-98 transition-all cursor-pointer min-h-[48px] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
              >
                <DoorOpen className="w-5 h-5 text-stone-950 shrink-0" aria-hidden="true" />
                <span>Join with Code</span>
              </button>

              <span className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-stone-600"} flex items-center gap-1.5 self-center sm:self-auto`}>
                <span>⚡</span> Instant play · Free multiplayer
              </span>
            </div>
          </div>
        </div>
      </div>
    </RevealOnScroll>
  );
}
