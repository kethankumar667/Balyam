import { Link } from "react-router-dom";
import { useState } from "react";
import BhalyamLogo from "../components/bhalyam/BhalyamLogo";

/**
 * Creative 404 page.
 *
 * Hero illustration sits inside the middle "0" of "404", so the artwork
 * IS the page, not a separate decoration. Three tries are made for the
 * hero asset (clean → school bag → paper plane) before falling back to a
 * styled gold disc, so the page never looks broken if a file is missing.
 *
 * Layout mirrors the rest of BHALYAM — paper background, gold trim,
 * orange/green/blue tri-tone numerals echoing the hero headline on Home.
 *
 * Keeps the same `bhalyam-paper` wrapper as Home so the dark-mode
 * background gradient applies automatically.
 */
export default function NotFound() {
  const heroCandidates = [
    "/bhalyam-hero-clean.png",
    "/school%20bag.png",
    "/paperplane.png",
  ];
  const [heroIdx, setHeroIdx] = useState(0);
  const [heroFailed, setHeroFailed] = useState(false);

  return (
    <div className="bhalyam-home bhalyam-404 bhalyam-font bhalyam-paper min-h-screen flex flex-col">
      {/* Compact header — only the logo so the page reads as a stop, not a destination. */}
      <header className="mx-auto w-full max-w-[1080px] px-4 sm:px-6 pt-4 sm:pt-5">
        <Link to="/" aria-label="Back to BHALYAM home" className="inline-flex items-center gap-2.5">
          <BhalyamLogo size={40} decorative />
          <span className="flex flex-col leading-none">
            <span className="text-[24px] font-black tracking-tight text-[#2A221B]">BHALYAM</span>
            <span className="text-[10px] uppercase tracking-wider font-bold text-[#E95D21] -mt-0.5">
              Relive Childhood
            </span>
          </span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[760px] text-center">
          {/* Stamp tag — a small "404" pill above the numerals,
              the way a ration shop would have a "OUT OF STOCK" sticker. */}
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em]
                       bg-[#FFF4E4] text-[#E54D0D] border border-[#F2D5A9]"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#E54D0D]" aria-hidden />
            Game not found
          </span>

          {/* Big 404 with hero image inside the middle 0. */}
          <div className="mt-4 flex items-end justify-center gap-2 sm:gap-3 leading-none select-none">
            <span
              className="font-black drop-shadow-[0_2px_0_rgba(255,255,255,0.45)]"
              style={{
                color: "#E54D0D",
                fontSize: "clamp(110px, 22vw, 220px)",
              }}
            >
              4
            </span>

            {/* Middle "0" frames the hero image like a school-window porthole. */}
            <span
              className="relative inline-flex items-center justify-center"
              style={{
                width: "clamp(150px, 26vw, 260px)",
                height: "clamp(150px, 26vw, 260px)",
              }}
            >
              <span
                aria-hidden
                className="absolute inset-0 rounded-full border-[12px] sm:border-[16px]"
                style={{
                  borderColor: "#0E2D66",
                  boxShadow:
                    "0 18px 30px -18px rgba(74,44,22,0.55), inset 0 0 0 4px #F4C430",
                  background: "#FFF6E2",
                }}
              />
              {!heroFailed ? (
                <img
                  src={heroCandidates[heroIdx]}
                  alt="A 90s schoolbag, sneaking off mid-route"
                  loading="eager"
                  decoding="async"
                  className="relative w-[78%] h-[78%] object-contain z-10"
                  style={{ filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.25))" }}
                  onError={() => {
                    if (heroIdx + 1 < heroCandidates.length) {
                      setHeroIdx(heroIdx + 1);
                    } else {
                      setHeroFailed(true);
                    }
                  }}
                />
              ) : (
                <span
                  aria-hidden
                  className="relative z-10 inline-flex w-[60%] h-[60%] rounded-full items-center justify-center font-black"
                  style={{
                    background: "linear-gradient(135deg, #F4C430, #B38918)",
                    color: "#3a2400",
                    fontSize: "clamp(36px, 8vw, 72px)",
                  }}
                >
                  ?
                </span>
              )}
              {/* Paper plane drifting across the porthole */}
              <PaperPlane className="absolute -top-3 -right-4 w-12 h-12 sm:w-16 sm:h-16 z-20 -rotate-[18deg]" />
            </span>

            <span
              className="font-black drop-shadow-[0_2px_0_rgba(255,255,255,0.45)]"
              style={{
                color: "#2E8E4C",
                fontSize: "clamp(110px, 22vw, 220px)",
              }}
            >
              4
            </span>
          </div>

          {/* Tagline */}
          <h1
            className="mt-6 font-black tracking-tight text-[28px] sm:text-[40px] leading-tight"
            style={{ color: "#0E2D66" }}
          >
            Looks like this room
            <span className="block text-[#E54D0D]">ran off to play hide-&-seek</span>
          </h1>

          <p className="mt-3 text-[14px] sm:text-[16px] text-[#2A221B]/80 max-w-md mx-auto">
            The link you followed doesn't lead to a game anymore. The room may
            have ended, or the code might have a typo. Head back home and pick a
            game, or paste the code again to join.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/"
              aria-label="Go back to BHALYAM home"
              className="h-12 px-6 rounded-full inline-flex items-center gap-2 cursor-pointer
                         bhalyam-gold-leaf text-[#2A221B] font-bold text-[15px]
                         border border-bhalyam-gold-dark
                         hover:brightness-[1.04] active:translate-y-px
                         focus:outline-none focus:ring-2 focus:ring-bhalyam-gold-dark/70 focus:ring-offset-2 focus:ring-offset-[#F8EFDE]
                         shadow-[0_6px_14px_-4px_rgba(228,177,40,0.55)]
                         transition-all duration-200"
            >
              <HomeIcon className="w-[18px] h-[18px]" />
              Take me home
            </Link>

            <a
              href="https://bhalyam.onrender.com"
              className="h-12 px-5 rounded-full inline-flex items-center gap-2 cursor-pointer
                         bg-[#FCF8EF] border border-[#EEDCC2] shadow-sm
                         text-[#2A221B] font-semibold text-[14px]
                         hover:bg-[#F8EEDB] active:translate-y-px
                         focus:outline-none focus:ring-2 focus:ring-bhalyam-gold-dark/60
                         transition-colors duration-200"
              aria-label="Reload BHALYAM"
            >
              <ReloadIcon className="w-[16px] h-[16px]" />
              Reload BHALYAM
            </a>
          </div>

          {/* Footer note — small marker on the page that this is a real BHALYAM page,
              not a generic server 404 from the host. */}
          <div className="mt-10 text-[11px] uppercase tracking-[0.2em] text-[#5B534A]">
            BHALYAM · Error 404
          </div>
        </div>
      </main>
    </div>
  );
}

function PaperPlane({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="pp-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFF6E2" />
          <stop offset="100%" stopColor="#E2C58A" />
        </linearGradient>
      </defs>
      <path
        d="M58 6L4 28l20 6 6 22 8-14 18 12z"
        fill="url(#pp-body)"
        stroke="#7B5024"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M30 56l-6-22 34-28"
        fill="none"
        stroke="#7B5024"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* trail */}
      <path
        d="M2 26 C -2 24, -4 20, 0 18"
        fill="none"
        stroke="#E54D0D"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path
        d="M6 32 C 0 32, -4 28, 0 24"
        fill="none"
        stroke="#E54D0D"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-6h4v6" />
    </svg>
  );
}

function ReloadIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}
