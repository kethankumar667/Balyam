import { useEffect, useState } from "react";
import BalyamLogo from "../components/balyam/BalyamLogo";
import GameRoomSheet from "../components/balyam/GameRoomSheet";
import { useTheme } from "../lib/useTheme";
import {
  BALYAM_GAMES,
  type BalyamGameCard,
  type BalyamGameSlug,
} from "../components/balyam/data";
import {
  ArrowRightIcon,
  HandCricketGlyph,
  LudoGlyph,
  RpsGlyph,
  RummyGlyph,
  SnakeLadderGlyph,
  UnoGlyph,
} from "../components/balyam/icons";

/**
 * BALYAM home — the app's landing surface.
 *
 * Intentionally spartan. Only contains UI that wires to a working backend
 * flow: header, BALU greeting, the game tiles, and a footer. Tapping
 * a tile opens the GameRoomSheet which carries the full Lobby-equivalent
 * flow (name input + per-game options + Create Room + Join by Code).
 *
 * Future sections (daily rewards, badges, friends online, recently played,
 * tournaments) are deliberately NOT here yet — they were mocked previously
 * and removed during the cleanup pass. Add them back as each backing
 * feature ships.
 *
 * Single responsive page rather than mobile/desktop split; with this much
 * content the split was overhead with no payoff.
 */

const GAME_GLYPHS: Record<BalyamGameSlug, React.ComponentType<{ className?: string }>> = {
  handcricket: HandCricketGlyph,
  snl: SnakeLadderGlyph,
  ludo: LudoGlyph,
  rummy: RummyGlyph,
  rps: RpsGlyph,
  uno: UnoGlyph,
};

export default function BalyamHome() {
  const [sheetGame, setSheetGame] = useState<BalyamGameSlug | null>(null);

  return (
    <div className="balyam-home balyam-font min-h-[100dvh] balyam-paper flex flex-col">
      <Header />
      <main className="mx-auto w-full max-w-[1080px] px-4 sm:px-6 pb-10 flex-1">
        <Hero />
        <GamesSection onSelect={setSheetGame} />
        <StatsStrip />
        <MiddlePanels />
        <UtilityStrip />
        <Footer />
      </main>
      <GameRoomSheet game={sheetGame} onClose={() => setSheetGame(null)} />
      <DesktopThemeToggle />
    </div>
  );
}

/**
 * Desktop-only floating theme toggle. Mobile uses the inline header version
 * (`MobileThemeToggle`) so the two never overlap. Both share state via
 * `useTheme` from lib/useTheme.
 */
function DesktopThemeToggle() {
  const [theme, toggle] = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      className="hidden md:inline-flex fixed right-4 top-4 z-[90] h-11 px-4 rounded-full border shadow-lg
                 items-center gap-2 font-semibold text-sm backdrop-blur"
      style={{
        backgroundColor: "var(--surface-1)",
        color: "var(--text-hi)",
        borderColor: "var(--surface-3)",
      }}
    >
      <span aria-hidden>{theme === "light" ? "🌙" : "☀️"}</span>
      {theme === "light" ? "Dark Mode" : "Light Mode"}
    </button>
  );
}

/* ───────────────────────────── Header ───────────────────────────── */

function Header() {
  return (
    <header
      className="mx-auto w-full max-w-[1080px] px-4 sm:px-6 pt-4 sm:pt-5
                 flex items-center justify-between gap-3"
    >
      <a href="/" className="flex items-center gap-2.5">
        <BalyamLogo size={44} decorative />
        <span className="flex flex-col leading-none">
          <span className="text-[30px] font-black tracking-tight">BALYAM</span>
          <span className="text-[12px] uppercase tracking-wider font-bold text-[#E95D21] -mt-0.5">
            Relive Childhood
          </span>
        </span>
      </a>

      <div className="hidden md:flex items-center gap-3">
        <div className="h-11 px-4 rounded-full bg-[#FCF8EF] border border-[#EEDCC2] shadow-sm inline-flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-[#2BB44A]" aria-hidden />
          <span className="text-[14px] font-semibold text-[#365A37]">132 Players Online</span>
          <span className="inline-flex -space-x-2">
            {[
              { name: "R", tone: "#F37A65" },
              { name: "S", tone: "#77B7FF" },
              { name: "V", tone: "#FFCF52" },
            ].map((avatar) => (
              <span
                key={avatar.name}
                className="w-7 h-7 rounded-full border-2 border-[#FCF8EF] text-white text-[11px] font-bold inline-flex items-center justify-center"
                style={{ backgroundColor: avatar.tone }}
              >
                {avatar.name}
              </span>
            ))}
          </span>
          <span className="px-2 py-1 rounded-full bg-white text-[11px] font-bold text-balyam-wood-dark/70">
            +129
          </span>
        </div>
        <button
          type="button"
          className="h-11 px-5 rounded-full bg-[#FCF8EF] border border-[#EEDCC2] shadow-sm text-[14px] font-semibold inline-flex items-center gap-2"
          aria-label="How to Play"
        >
          <span className="w-5 h-5 rounded-full border border-balyam-wood/35 text-balyam-wood text-[12px] leading-none inline-flex items-center justify-center">?</span>
          How to Play
        </button>
      </div>

      <div className="md:hidden mt-4 flex justify-end">
        <MobileThemeToggle />
      </div>
    </header>
  );
}

/**
 * Inline theme toggle for the mobile header — replaces the desktop-only
 * floating ThemeToggle on small screens. Both share `useTheme` so they stay
 * in sync if the user rotates from portrait to landscape mid-session.
 */
function MobileThemeToggle() {
  const [theme, toggle] = useTheme();
  const nextLabel = theme === "light" ? "Dark Mode" : "Light Mode";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      className="h-10 px-4 rounded-full bg-[#FCF8EF] border border-[#EEDCC2] shadow-sm
                 text-[13px] font-semibold inline-flex items-center gap-2 text-[#2A221B]"
    >
      <span aria-hidden>{theme === "light" ? "🌙" : "☀️"}</span>
      {nextLabel}
    </button>
  );
}

/* ───────────────────────────── Hero ───────────────────────────── */

function Hero() {
  const [heroImage, setHeroImage] = useState("/balyam-hero-clean.png");

  return (
    <section className="pt-2 pb-6 sm:pt-3 sm:pb-8">
      <div
        className="relative overflow-hidden rounded-[30px] border border-[#E2D3BA]
                   shadow-[0_14px_26px_-18px_rgba(74,44,22,0.4)] min-h-[200px] sm:min-h-auto"
      >
        <img
          src={heroImage}
          alt="A wooden desk full of 90s Indian childhood memorabilia"
          className="absolute inset-0 w-full h-full object-cover object-right"
          loading="eager"
          decoding="async"
          onError={() => {
            if (heroImage !== "/balyam-hero.png") {
              setHeroImage("/balyam-hero.png");
            }
          }}
        />

        <div className="relative z-10 min-h-[360px] sm:min-h-[430px] lg:min-h-[470px] px-5 sm:px-7 lg:px-8 py-5 sm:py-6 hidden sm:flex items-start">
          <div className="max-w-[320px] sm:max-w-[360px] md:max-w-[390px]">
            <div className="text-[12px] sm:text-[13px] uppercase tracking-wider font-extrabold text-[#7B2F0E]">
              Welcome to the adda
            </div>
            <h1 className="mt-1 leading-[0.92] font-black tracking-tight text-[#0E2D66] text-[36px] sm:text-[52px] md:text-[58px] drop-shadow-[0_1px_0_rgba(255,255,255,0.45)]">
              <span className="block">Ready to</span>
              <span className="block text-[#E54D0D]">relive</span>
              <span className="block">your</span>
              <span className="block text-[#2E8E4C]">childhood?</span>
            </h1>
            <p className="mt-4 max-w-[340px] text-[14px] sm:text-[17px] leading-[1.32] text-[#2E231B] font-medium">
              Pick a game, send the room code to your school WhatsApp group,
              and play instantly.
            </p>

            <button
              type="button"
              className="mt-5 sm:mt-6 min-h-[52px] sm:min-h-[56px] pl-5 pr-3 rounded-full border border-[#E7D9C1] bg-[#FFF8EE]
                         shadow-[0_8px_16px_-12px_rgba(0,0,0,0.35)]
                         inline-flex items-center justify-between gap-4 max-w-[330px] sm:max-w-[360px] w-full"
            >
              <span className="text-left text-[13px] sm:text-[20px] leading-[1.02] font-extrabold text-[#2A221B]">
                Bring your school gang
                <span className="block">back together!</span>
              </span>
              <span className="w-10 h-10 rounded-full bg-[#25D366] border-2 border-white/65 inline-flex items-center justify-center" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── Games grid ───────────────────────────── */

function GamesSection({ onSelect }: { onSelect: (slug: BalyamGameSlug) => void }) {
  return (
    <section className="pb-12 sm:pb-14">
      <header className="mb-3 sm:mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-black text-[#1D2C4A] text-[24px] sm:text-[42px] leading-tight">
            Pick a game
          </h2>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] sm:text-[12px] font-bold bg-[#FFF4E4] text-[#EA5A1F] border border-[#F2D5A9]">
          Most Played Today
        </span>
      </header>

      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {BALYAM_GAMES.map((game) => (
          <li key={game.slug}>
            <GameTile
              game={game}
              onSelect={() => onSelect(game.slug)}
              compact
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function GameTile({
  game,
  onSelect,
  className,
  compact = true,
}: {
  game: BalyamGameCard;
  onSelect: () => void;
  className?: string;
  compact?: boolean;
}) {
  const Glyph = GAME_GLYPHS[game.slug];

  const livePlayersByGame: Record<BalyamGameSlug, string> = {
    handcricket: "4.8K playing",
    snl: "3.2K playing",
    ludo: "5.6K playing",
    rummy: "2.1K playing",
    rps: "1.6K playing",
    uno: "3.9K playing",
  };

  const titleClassName = game.title.length > 12
    ? "font-black text-[22px] sm:text-[30px] leading-[0.95] tracking-tight break-words"
    : "font-black text-[28px] sm:text-[34px] leading-[0.9] tracking-tight break-words";

  const tileArtByGame: Record<BalyamGameSlug, string> = {
    handcricket: "/HandCricketTile.png",
    snl: "/S&LTile.png",
    ludo: "/LudoTile.png",
    rummy: "/RummyTile.png",
    rps: "/RPSTile.png",
    uno: "/UNOTile.png",
  };

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative w-full ${compact ? "min-h-[220px]" : "min-h-[170px]"}
                 rounded-[22px] overflow-hidden text-left p-4 sm:p-5
                 flex flex-col gap-3
                 border border-[#F4D6B7]
                 active:scale-[0.97] transition-all duration-200 balyam-press-feedback
                 shadow-[0_13px_24px_-14px_rgba(74,44,22,0.45)] ${className ?? ""}`}
      style={{
        background: `linear-gradient(145deg, ${game.accent.from}, ${game.accent.to})`,
        color: "#FFF7E7",
      }}
      aria-label={`Play ${game.title}`}
    >
      <span className="absolute right-3 top-3 rounded-full px-2 py-1 bg-white/20 text-white text-[11px] font-bold">
        Trending
      </span>

      <span
        aria-hidden
        className="pointer-events-none absolute -top-10 -right-10 w-36 h-36 rounded-full
                   bg-balyam-cream-soft/15 blur-3xl"
      />

      <GameTileArt src={tileArtByGame[game.slug]} title={game.title} compact={compact}>
        <span
          className="relative inline-flex w-14 h-14 rounded-2xl items-center justify-center
                     bg-balyam-cream-soft/22 backdrop-blur-sm flex-shrink-0 mt-3"
        >
          <Glyph className="w-8 h-8" />
        </span>
      </GameTileArt>

      <div className="relative mt-auto flex flex-col gap-1.5 min-w-0">
        <span className={titleClassName}>
          {game.title}
        </span>
        {game.teluguTitle && (
          <span className="text-[11px] tracking-widest uppercase font-bold opacity-90 leading-tight">
            {game.teluguTitle}
          </span>
        )}

        <span className="text-[13px] font-semibold opacity-95">{livePlayersByGame[game.slug]}</span>

        <span
          className="inline-flex items-center gap-1 w-fit
                     rounded-full bg-balyam-cream-soft text-balyam-wood-dark
                     px-4 py-1.5 text-[13px] font-bold
                     shadow-[0_3px_6px_-1px_rgba(0,0,0,0.25)]
                     group-active:translate-y-px transition-transform duration-150"
        >
          Quick Play <ArrowRightIcon className="w-3 h-3" />
        </span>
      </div>
    </button>
  );
}

function GameTileArt({
  src,
  title,
  compact,
  children,
}: {
  src: string;
  title: string;
  compact: boolean;
  children: React.ReactNode;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  if (imageFailed) {
    return <>{children}</>;
  }

  const imageClass = compact
    ? "mt-1 h-[86px] sm:h-[92px] w-auto max-w-[62%]"
    : "mt-0.5 h-[88px] sm:h-[96px] w-auto max-w-[52%]";

  return (
    <img
      src={src}
      alt={`${title} icon`}
      className={`relative ${imageClass} object-contain object-left-top`}
      style={{ filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.28))" }}
      loading="lazy"
      decoding="async"
      onError={() => setImageFailed(true)}
    />
  );
}

function StatsStrip() {
  const items = [
    { icon: "O", metric: "12,543", label: "Kids Reliving Childhood Today", tone: "#F6A23A" },
    { icon: "T", metric: "98,765", label: "Games Played This Week", tone: "#F2C14E" },
    { icon: "*", metric: "250+", label: "School Groups Connected", tone: "#9277E8" },
    { icon: "<3", metric: "Made with love", label: "for 90s kids", tone: "#F27373" },
  ];

  return (
    <section className="mt-4 rounded-3xl border border-[#E8D8BE] bg-[#F8EEDB] px-3 sm:px-5 py-3 sm:py-4">
      <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map((item, index) => (
          <li
            key={item.metric}
            className={`flex items-center gap-2 sm:gap-2.5 ${index > 0 ? "lg:border-l lg:border-[#EBDDC7] lg:pl-4" : ""}`}
          >
            <span
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full inline-flex items-center justify-center text-white font-bold text-[11px] sm:text-[12px]"
              style={{ backgroundColor: item.tone }}
              aria-hidden
            >
              {item.icon}
            </span>
            <span className="leading-tight">
              <span className="block text-[#2FA25A] font-black text-[18px] sm:text-[30px]">{item.metric}</span>
              <span className="block text-[#677080] text-[10px] sm:text-[14px]">{item.label}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MiddlePanels() {
  return (
    <section className="middle-panels mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
      <article className="rounded-2xl border border-[#E8D9C1] bg-[#F5ECE0] p-4 sm:p-5">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#D8C4A3] bg-[#FBF4E8] text-[15px]" aria-hidden>
            🎮
          </span>
          <h3 className="font-extrabold text-[22px] sm:text-[27px] text-[#2A354D] leading-tight">Continue Playing</h3>
        </div>
        <div className="mt-3 rounded-xl bg-[#EFE2CF] border border-[#E6D4B8] p-3">
          <AssetImg
            src="/HandCricketTile.png"
            alt="Hand Cricket"
            className="h-36 w-full rounded-lg border border-[#E3D2B5] bg-[#F7EFE0]"
            imgClassName="h-full w-full rounded-lg object-contain object-center p-1.5"
            placeholderClassName="h-36 w-full rounded-lg"
          />
          <div className="mt-2 flex items-end justify-between">
            <div>
              <p className="font-extrabold text-[25px] text-[#273248]">Hand Cricket</p>
              <p className="text-[15px] text-[#6D7584]">Last played 2 days ago</p>
            </div>
            <button
              type="button"
              className="rounded-full px-4 py-2 bg-[#32B34F] text-white text-[14px] font-bold inline-flex items-center gap-1.5"
            >
              Continue <ArrowRightIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </article>

      <article className="rounded-2xl border border-[#E8D9C1] bg-[#F5ECE0] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-extrabold text-[22px] sm:text-[27px] leading-tight text-[#2A354D]">Top Achievements</h3>
          <button type="button" className="rounded-full px-3 py-1.5 bg-[#FAF2E6] border border-[#E8D8BE] text-[12px] sm:text-[13px] font-bold">
            View All
          </button>
        </div>
        <ul className="mt-3 space-y-2.5">
          {[
            ["Gully Cricket Champion", "Play 100 Cricket Matches"],
            ["Ludo King", "Win 50 Ludo Games"],
            ["Paramapada Pandit", "Climb 100 Ladders"],
            ["Rummy Master", "Win 25 Rummy Games"],
          ].map(([title, desc]) => (
            <li key={title} className="rounded-lg bg-[#EFE2CF] border border-[#E6D4B8] px-3 py-2.5 flex items-center justify-between gap-3">
              <span>
                <span className="block font-bold text-[#2E3C57] text-[13px] sm:text-[14px] leading-tight">{title}</span>
                <span className="block text-[#6E7482] text-[10px] sm:text-[11px] leading-tight mt-0.5">{desc}</span>
              </span>
              <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#F0C15F] flex-shrink-0" aria-hidden />
            </li>
          ))}
        </ul>
      </article>

      <article className="rounded-2xl border border-[#E8D9C1] bg-[#F5ECE0] p-4 sm:p-5 relative overflow-hidden">
        <h3 className="font-extrabold text-[22px] sm:text-[27px] text-[#2A354D] inline-flex items-center gap-2.5 leading-tight">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#D8C4A3] bg-[#FBF4E8] text-[15px]" aria-hidden>
            👥
          </span>
          Invite Your Friends
        </h3>
        <p className="mt-1 text-[14px] sm:text-[16px] text-[#5F6A79]">Relive old memories with your school gang</p>
        <AssetImg
          src="/gangoffriends.png"
          alt="Group of school friends"
          className="mt-3 w-full aspect-[16/9] rounded-xl border border-[#E6D4B8] bg-[#F7EFE0]"
          imgClassName="h-full w-full rounded-xl object-contain object-center p-1.5"
          placeholderClassName="w-full aspect-[16/9] rounded-xl"
        />
        <button
          type="button"
          className="mt-3 w-full rounded-full px-4 py-3 bg-[#25D366] text-white font-bold text-[16px] inline-flex items-center justify-center gap-2"
        >
          <span className="inline-flex h-7 w-7 rounded-full bg-white/20 items-center justify-center text-[14px]" aria-hidden>🟢</span>
          Invite on WhatsApp
        </button>
      </article>
    </section>
  );
}

/**
 * Drop-in <img> that falls back to a labelled dashed-box placeholder when
 * the file isn't in /public yet. That way a missing asset shows a visible
 * "this is what's missing: foo.png" marker instead of a broken image, and
 * the rest of the layout doesn't collapse around it.
 *
 * `src` is URL-encoded automatically (browsers do this, but we set the
 * key from the encoded form so React sees a stable URL).
 */
function AssetImg({
  src,
  alt,
  className,
  imgClassName,
  placeholderClassName,
  placeholderLabel,
  loading = "lazy",
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  placeholderClassName?: string;
  placeholderLabel?: string;
  loading?: "eager" | "lazy";
}) {
  const [failed, setFailed] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  const resolvedSrc =
    retryNonce === 0
      ? src
      : `${src}${src.includes("?") ? "&" : "?"}retry=${retryNonce}`;

  // Clear stale "failed" state when src changes during hot reload/live edits.
  useEffect(() => {
    setFailed(false);
    setRetryNonce(0);
  }, [src]);

  // Retry once after a brief delay so temporary dev-server / cache hiccups
  // do not leave the UI permanently stuck on fallback placeholders.
  useEffect(() => {
    if (!failed || retryNonce > 0) return;
    const timer = window.setTimeout(() => {
      setFailed(false);
      setRetryNonce(1);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [failed, retryNonce]);

  // Filename portion of the URL — what to show the developer in the
  // placeholder so they know which asset to drop in.
  const label =
    placeholderLabel ??
    decodeURIComponent(src.split("/").filter(Boolean).pop() ?? "missing.png");

  if (failed) {
    return (
      <span
        role="img"
        aria-label={alt}
        className={`inline-flex items-center justify-center
                    border-2 border-dashed border-[#C5A576]
                    bg-[#FBF1DC] text-[#7A5B36]
                    text-[10px] font-mono text-center px-1.5 py-1 leading-tight
                    ${placeholderClassName ?? ""}
                    ${className ?? ""}`}
      >
        {label}
      </span>
    );
  }

  // `className` sizes the slot (e.g. w-[96px] h-[96px]); `imgClassName`
  // styles the artwork inside that slot (object-contain, scale, etc.).
  // We must NOT slap both on the <img> element or the inner `w-full`
  // collides with the outer `w-[96px]` on small screens — Tailwind has
  // no ordering guarantee for two width utilities on the same element,
  // and on mobile `w-full` was winning, blowing the icon out to the row
  // width and squeezing neighbouring text. Wrap so each className lands
  // on its own element.
  return (
    <span
      className={`inline-flex items-center justify-center overflow-hidden ${className ?? ""}`}
    >
      <img
        src={resolvedSrc}
        alt={alt}
        loading={loading}
        decoding="async"
        onLoad={() => setFailed(false)}
        onError={() => setFailed(true)}
        className={imgClassName ?? "w-full h-full object-contain"}
      />
    </span>
  );
}

/* ───────────────────────────── Utility strip ───────────────────────────── */

function UtilityStrip() {
  const entries = [
    {
      src: "/retroradio.png",
      title: "Retro Sounds",
      blurb: "Relive the 90s with classic game sounds 🎵",
      imgClassName: "w-full h-full object-contain scale-[1.35]",
    },
    {
      // The file in /public has an ampersand; URL-encode it so it's
      // unambiguously requested.
      src: "/dark&Light.png",
      title: "Day / Night Theme",
      blurb: "Play in your favorite 90s vibes",
      imgClassName: "w-full h-full object-contain scale-[1.5]",
    },
    {
      // Space in the filename → URL-encode.
      src: "/safety%20shield.png",
      title: "Safe & Ad-free",
      blurb: "100% safe for nostalgic fun",
      imgClassName: "w-full h-full object-contain scale-[1.4]",
    },
    {
      src: "/mobile.png",
      title: "Works on Mobile",
      blurb: "Play with friends anytime, anywhere",
      imgClassName: "w-full h-full object-contain scale-[1.45]",
    },
  ];

  return (
    <section
      className="mt-4 rounded-3xl border border-[#E6D4B7] bg-[#F8EFDE]
                 px-4 sm:px-6 py-3 sm:py-4
                 shadow-[0_10px_18px_-16px_rgba(63,38,19,0.35)]"
    >
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {entries.map((entry, index) => (
          <li
            key={entry.title}
            className={`flex items-center gap-3 ${
              index > 0 ? "lg:border-l lg:border-[#E8D8BE] lg:pl-5" : ""
            }`}
          >
            <AssetImg
              src={entry.src}
              alt={entry.title}
              className="w-[96px] h-[96px] sm:w-[112px] sm:h-[112px] flex-shrink-0"
              imgClassName={entry.imgClassName}
            />
            <span className="min-w-0">
              <p className="font-bold text-[#3F2F24] text-[16px] sm:text-[17px] leading-tight">
                {entry.title}
              </p>
              <p className="text-[#5B534A] text-[13px] sm:text-[14px] mt-1 leading-snug">
                {entry.blurb}
              </p>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ───────────────────────────── Footer ───────────────────────────── */

function Footer() {
  return (
    <footer className="mt-4 pb-8 pt-5">
      <div
        className="relative rounded-[28px] border border-[#E8D8BE] bg-[#FBF2E3]
                   px-4 sm:px-7 py-6 sm:py-7 overflow-hidden"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-5 items-end min-h-[260px]">
          {/* LEFT — oversized hopscotch sketch with heart accent */}
          <div className="relative flex items-end justify-start gap-3 sm:gap-4">
            <AssetImg
              src="/hopscotch.png"
              alt="Childhood hopscotch sketch"
              className="w-[260px] h-[230px] sm:w-[320px] sm:h-[280px] flex-shrink-0 opacity-90"
              imgClassName="w-full h-full object-contain object-bottom"
            />
            <AssetImg
              src="/heart-beat.png"
              alt=""
              className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 mb-6"
              imgClassName="w-full h-full object-contain"
            />
          </div>

          {/* CENTER — BALYAM + tagline + social icons */}
          <div className="text-center self-center">
            <h4 className="font-black text-[30px] sm:text-[38px] text-[#3C2A1E] leading-tight">
              BALYAM
              <span className="text-[#6B4A34] mx-2">•</span>
              <span className="font-semibold">Relive Childhood</span>
            </h4>
            <p className="text-[15px] sm:text-[17px] text-[#5D4B3F] mt-2">
              Crafted for 90s kids
            </p>
            <div className="mt-5 flex justify-center items-center gap-5">
              <SocialIcon src="/whatsapp.png" alt="WhatsApp" href="#whatsapp" />
              <SocialIcon src="/instagram.png" alt="Instagram" href="#instagram" />
            </div>
          </div>

          {/* RIGHT — paperplane trail + booksbottle + schoolbag */}
          <div className="relative flex items-end justify-end gap-3 sm:gap-4 min-h-[260px]">
            <AssetImg
              src="/paperplane.png"
              alt=""
              className="absolute -top-2 right-4 w-[170px] sm:w-[210px] h-[90px] sm:h-[110px] opacity-95"
              imgClassName="w-full h-full object-contain"
            />
            <AssetImg
              src="/booksbottle.png"
              alt="Books and water bottle"
              className="w-[150px] h-[200px] sm:w-[190px] sm:h-[250px] flex-shrink-0"
              imgClassName="w-full h-full object-contain object-bottom"
            />
            <AssetImg
              src="/school%20bag.png"
              alt="School bag"
              className="w-[170px] h-[220px] sm:w-[220px] sm:h-[270px] flex-shrink-0"
              imgClassName="w-full h-full object-contain object-bottom"
            />
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({
  src,
  alt,
  href,
}: {
  src: string;
  alt: string;
  href: string;
}) {
  return (
    <a
      href={href}
      aria-label={alt}
      className="inline-flex w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden
                 shadow-[0_5px_10px_-6px_rgba(0,0,0,0.45)]
                 hover:scale-105 active:scale-95 transition-transform duration-150"
    >
      <AssetImg
        src={src}
        alt={alt}
        className="w-full h-full"
        imgClassName="w-full h-full object-cover"
      />
    </a>
  );
}
