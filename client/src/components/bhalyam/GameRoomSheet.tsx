import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type {
  GameKind,
  HcCategory,
  HcFormat,
  HcMode,
  RummyMatchMode,
  SnlDifficulty,
} from "@shared/types";
import {
  HC_GALLI_MAX_OVERS,
  HC_GALLI_MIN_OVERS,
} from "@shared/types";
import { getSocket } from "../../lib/socket";
import { useRoomStore } from "../../store/roomStore";
import {
  BHALYAM_GAMES,
  type BhalyamGameSlug,
} from "./data";
import {
  ArrowRightIcon,
  HandCricketGlyph,
  LudoGlyph,
  RpsGlyph,
  RummyGlyph,
  SnakeLadderGlyph,
  SparkIcon,
  UnoGlyph,
} from "./icons";

/* ──────────────────────────────────────────────────────────────────────────
 * BHALYAM Game Room Sheet
 *
 * Opens when a game tile is tapped on the Home screen. Contains the full
 * room-creation flow that used to live on the standalone /play (Lobby)
 * page — name input, per-game options, Create Room, Join with code — but
 * the game itself is fixed by which tile the user tapped (no dropdown).
 *
 * On mobile (<md) it slides up as a bottom sheet (full width, top-rounded).
 * On desktop (≥md) it renders as a centered modal with a backdrop blur.
 *
 * Closes on backdrop click + Escape key. Socket emit, navigate, and error
 * handling are 1:1 copies of the original Lobby behaviour so functionality
 * is identical.
 * ───────────────────────────────────────────────────────────────────────── */

export interface GameRoomSheetProps {
  /** Which game the user tapped. `null` means closed. */
  game: BhalyamGameSlug | null;
  onClose: () => void;
}

const GAME_GLYPHS: Record<BhalyamGameSlug, React.ComponentType<{ className?: string }>> = {
  handcricket: HandCricketGlyph,
  snl: SnakeLadderGlyph,
  ludo: LudoGlyph,
  rummy: RummyGlyph,
  rps: RpsGlyph,
  uno: UnoGlyph,
};

/* ── Option catalogs (copied verbatim from old Lobby so behaviour matches) ── */

const DIFFICULTIES: { id: SnlDifficulty; label: string; blurb: string }[] = [
  { id: "easy",    label: "Easy",    blurb: "12 ladders, 5 snakes — friendly" },
  { id: "medium",  label: "Medium",  blurb: "Classic balanced board" },
  { id: "hard",    label: "Hard",    blurb: "Few ladders, long snake slides" },
  { id: "extreme", label: "Extreme", blurb: "Snake at 99 → 1. Good luck." },
];

const RUMMY_MODES: { id: RummyMatchMode; label: string; blurb: string }[] = [
  { id: "single",  label: "Single round", blurb: "One deal, win or lose, done." },
  { id: "pool101", label: "Pool 101",     blurb: "Eliminated at 101 points. Quick match." },
  { id: "pool201", label: "Pool 201",     blurb: "Eliminated at 201. Longer, more drama." },
];

const HC_MODES: { id: HcMode; label: string; blurb: string }[] = [
  { id: "single",     label: "Single match", blurb: "One match, full innings each." },
  { id: "tournament", label: "Tournament",   blurb: "Multi-match tour (Phase 3 — coming)." },
  { id: "galli",      label: "Galli",        blurb: "Street cricket — custom overs, no rules, pure fun." },
];

const HC_FORMATS: { id: HcFormat; label: string; blurb: string }[] = [
  { id: "t20",  label: "T20",  blurb: "10 ov · 3 powerplay · 3-over bowler quota" },
  { id: "odi",  label: "ODI",  blurb: "15 ov · 3 powerplay · 4-over bowler quota" },
  { id: "test", label: "Test", blurb: "30 ov · no powerplay · no bowler quota" },
];

const HC_CATEGORIES: { id: HcCategory; label: string; blurb: string }[] = [
  { id: "international", label: "International", blurb: "Pick a country & select your XI" },
  { id: "ipl",           label: "IPL",           blurb: "Pick a 2026 IPL franchise & select your XI" },
];

export default function GameRoomSheet({ game, onClose }: GameRoomSheetProps) {
  const navigate = useNavigate();
  const { playerName, setPlayerName, setPlayerId, playerId } = useRoomStore();

  const [name, setName] = useState(playerName);
  const [difficulty, setDifficulty] = useState<SnlDifficulty>("medium");
  const [rummyMode, setRummyMode] = useState<RummyMatchMode>("single");
  const [hcMode, setHcMode] = useState<HcMode>("single");
  const [hcFormat, setHcFormat] = useState<HcFormat>("t20");
  const [hcCategory, setHcCategory] = useState<HcCategory>("international");
  const [hcGalliOvers, setHcGalliOvers] = useState<number>(5);
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset transient state every time a new game opens.
  useEffect(() => {
    if (game) {
      setError(null);
      setBusy(false);
      setJoinCode("");
      setName(playerName);
    }
  }, [game, playerName]);

  // ESC closes the sheet.
  useEffect(() => {
    if (!game) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [game, onClose]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!game) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [game]);

  if (!game) return null;

  function trimmedName(): string {
    return name.trim().slice(0, 20);
  }

  function createRoom() {
    const n = trimmedName();
    if (!n) return setError("Enter your name first");
    if (!game) return;
    setBusy(true);
    setError(null);
    setPlayerName(n);
    const socket = getSocket();
    socket.emit(
      "room:create",
      {
        name: n,
        game: game as GameKind,
        playerId: playerId ?? undefined,
        snlOptions: game === "snl" ? { difficulty } : undefined,
        rummyOptions: game === "rummy" ? { mode: rummyMode } : undefined,
        hcOptions:
          game === "handcricket"
            ? {
                mode: hcMode,
                format: hcFormat,
                category: hcCategory,
                ...(hcMode === "galli" ? { galliOvers: hcGalliOvers } : {}),
              }
            : undefined,
      },
      (res) => {
        setBusy(false);
        if (!res.ok || !res.code) {
          setError(res.error ?? "Failed to create room");
          return;
        }
        if (res.playerId) setPlayerId(res.playerId);
        navigate(`/room/${res.code}`);
      },
    );
  }

  function joinRoom() {
    const n = trimmedName();
    const code = joinCode.trim().toUpperCase();
    if (!n) return setError("Enter your name first");
    if (code.length !== 6) return setError("Room code must be 6 characters");
    setBusy(true);
    setError(null);
    setPlayerName(n);
    const socket = getSocket();
    socket.emit(
      "room:join",
      { name: n, code, playerId: playerId ?? undefined },
      (res) => {
        setBusy(false);
        if (!res.ok) {
          setError(res.error ?? "Failed to join");
          return;
        }
        if (res.playerId) setPlayerId(res.playerId);
        navigate(`/room/${code}`);
      },
    );
  }

  const meta = BHALYAM_GAMES.find((g) => g.slug === game)!;
  const Glyph = GAME_GLYPHS[game];

  return (
    <div
      aria-hidden={false}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center
                 bg-bhalyam-wood-dark/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-room-sheet-title"
        onClick={(e) => e.stopPropagation()}
        className="bhalyam-font relative w-full md:max-w-md
                   max-h-[92dvh] overflow-y-auto
                   bg-bhalyam-cream-soft text-bhalyam-wood-dark
                   border-2 border-bhalyam-cream-edge/70
                   rounded-t-3xl md:rounded-3xl
                   shadow-[0_-12px_40px_-8px_rgba(74,44,22,0.45)]
                   md:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* Pull handle (mobile bottom-sheet only) */}
        <div className="md:hidden flex justify-center pt-2.5">
          <span aria-hidden className="w-10 h-1.5 rounded-full bg-bhalyam-wood/30" />
        </div>

        {/* Header */}
        <header className="flex items-center gap-3 p-4 pb-3 border-b-2 border-bhalyam-cream-edge/50">
          <span
            className="inline-flex w-12 h-12 rounded-2xl items-center justify-center text-bhalyam-cream-soft flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, ${meta.accent.from}, ${meta.accent.to})`,
              boxShadow: `0 6px 14px -4px ${meta.accent.to}66`,
            }}
            aria-hidden
          >
            <Glyph className="w-6 h-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="game-room-sheet-title"
              className="font-bold text-bhalyam-wood-dark text-lg leading-tight truncate"
            >
              {meta.title}
            </h2>
            {meta.teluguTitle ? (
              <div className="text-[10px] uppercase tracking-widest font-bold text-bhalyam-wood">
                {meta.teluguTitle} · Quick Match
              </div>
            ) : (
              <div className="text-[10px] uppercase tracking-widest font-bold text-bhalyam-wood">
                Quick Match
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-10 h-10 rounded-full inline-flex items-center justify-center
                       bg-bhalyam-cream-warm text-bhalyam-wood-dark
                       hover:bg-bhalyam-cream-edge active:scale-95 transition-all duration-150"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </header>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Name input */}
          <Field label="Your name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kethan"
              maxLength={20}
              className="w-full min-h-[44px] px-3 rounded-xl
                         bg-bhalyam-cream-soft border-2 border-bhalyam-cream-edge/80
                         text-bhalyam-wood-dark placeholder:text-bhalyam-wood-dark/40
                         font-semibold
                         focus:outline-none focus:border-bhalyam-gold-dark
                         focus:ring-2 focus:ring-bhalyam-gold/40
                         transition-all duration-150"
            />
          </Field>

          {/* Per-game options */}
          {game === "snl" && (
            <Field label="Difficulty">
              <OptionGrid
                items={DIFFICULTIES}
                value={difficulty}
                onChange={setDifficulty}
                cols={2}
              />
            </Field>
          )}

          {game === "rummy" && (
            <Field label="Match mode">
              <OptionGrid
                items={RUMMY_MODES}
                value={rummyMode}
                onChange={setRummyMode}
                cols={1}
              />
            </Field>
          )}

          {game === "handcricket" && (
            <>
              <Field label="Mode">
                <OptionGrid
                  items={HC_MODES}
                  value={hcMode}
                  onChange={setHcMode}
                  cols={3}
                  disabledIds={["tournament"]}
                />
              </Field>

              {hcMode !== "galli" && (
                <Field label="Format">
                  <OptionGrid
                    items={HC_FORMATS}
                    value={hcFormat}
                    onChange={setHcFormat}
                    cols={3}
                  />
                </Field>
              )}

              {hcMode === "galli" && (
                <Field label="Overs per innings">
                  <div className="rounded-xl p-3 bg-bhalyam-gold/15 border-2 border-bhalyam-gold/40">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-bold text-bhalyam-gold-ink uppercase tracking-widest">
                        Street cricket
                      </span>
                      <span className="text-lg font-black tabular-nums text-bhalyam-gold-ink">
                        {hcGalliOvers}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={HC_GALLI_MIN_OVERS}
                      max={HC_GALLI_MAX_OVERS}
                      value={hcGalliOvers}
                      onChange={(e) => setHcGalliOvers(Number(e.target.value))}
                      className="w-full accent-bhalyam-gold-dark"
                    />
                    <div className="flex justify-between text-[10px] text-bhalyam-wood-dark/70 mt-1">
                      <span>{HC_GALLI_MIN_OVERS}</span>
                      <span>10</span>
                      <span>{HC_GALLI_MAX_OVERS}</span>
                    </div>
                    <p className="text-[10px] italic text-bhalyam-wood-dark/70 mt-1">
                      No composition rules, no bowler quota, no powerplay.
                    </p>
                  </div>
                </Field>
              )}

              <Field label="Category">
                <OptionGrid
                  items={HC_CATEGORIES}
                  value={hcCategory}
                  onChange={setHcCategory}
                  cols={2}
                />
              </Field>
            </>
          )}

          {/* Create Room — primary CTA */}
          <button
            type="button"
            onClick={createRoom}
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2
                       min-h-[52px] rounded-2xl
                       bhalyam-gold-leaf text-bhalyam-wood-dark font-bold text-[15px]
                       border border-bhalyam-gold-dark
                       disabled:opacity-50 disabled:cursor-wait
                       active:scale-[0.98] transition-all duration-150 bhalyam-press-feedback
                       shadow-[0_6px_14px_-4px_rgba(228,177,40,0.6)]"
          >
            {busy ? (
              "Working…"
            ) : (
              <>
                <SparkIcon className="w-5 h-5" />
                Create Room
              </>
            )}
          </button>

          {/* Join divider */}
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest font-bold text-bhalyam-wood/60">
            <span className="flex-1 h-px bg-bhalyam-cream-edge/80" />
            <span>Or join an existing room</span>
            <span className="flex-1 h-px bg-bhalyam-cream-edge/80" />
          </div>

          {/* Join by code */}
          <div className="space-y-2.5">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ROOM CODE"
              maxLength={6}
              className="w-full min-h-[44px] px-3 rounded-xl
                         bg-bhalyam-cream-soft border-2 border-bhalyam-cream-edge/80
                         text-bhalyam-wood-dark placeholder:text-bhalyam-wood-dark/40
                         font-mono font-bold tracking-[0.3em] text-center
                         focus:outline-none focus:border-bhalyam-gold-dark
                         focus:ring-2 focus:ring-bhalyam-gold/40
                         transition-all duration-150"
            />
            <button
              type="button"
              onClick={joinRoom}
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2
                         min-h-[48px] rounded-2xl
                         bg-bhalyam-wood-dark text-bhalyam-cream-soft font-bold text-[14px]
                         border border-bhalyam-gold/30
                         disabled:opacity-50 disabled:cursor-wait
                         active:scale-[0.98] transition-all duration-150 bhalyam-press-feedback
                         shadow-[0_4px_10px_-3px_rgba(74,44,22,0.55)]"
            >
              {busy ? "Working…" : (
                <>
                  Join Room <ArrowRightIcon className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="text-sm text-bhalyam-ludo-red font-bold text-center
                         bg-bhalyam-ludo-red/10 border border-bhalyam-ludo-red/30
                         rounded-xl p-2"
            >
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────── Helpers ───────────────────────────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] uppercase tracking-widest font-bold text-bhalyam-wood">
        {label}
      </label>
      {children}
    </div>
  );
}

interface OptionItem<T extends string> {
  id: T;
  label: string;
  blurb: string;
}

function OptionGrid<T extends string>({
  items,
  value,
  onChange,
  cols,
  disabledIds = [],
}: {
  items: ReadonlyArray<OptionItem<T>>;
  value: T;
  onChange: (id: T) => void;
  cols: 1 | 2 | 3;
  disabledIds?: ReadonlyArray<T>;
}) {
  const gridCls =
    cols === 1
      ? "grid-cols-1"
      : cols === 2
      ? "grid-cols-2"
      : "grid-cols-1 sm:grid-cols-3";
  return (
    <div className={`grid ${gridCls} gap-2`}>
      {items.map((item) => {
        const isActive = item.id === value;
        const isDisabled = disabledIds.includes(item.id);
        return (
          <button
            key={item.id}
            type="button"
            disabled={isDisabled}
            onClick={() => onChange(item.id)}
            className={`text-left rounded-xl p-2.5 border-2 min-h-[64px]
                        active:scale-[0.98] transition-all duration-150 bhalyam-press-feedback
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${isActive
                          ? "bg-bhalyam-gold/20 border-bhalyam-gold-dark shadow-[0_4px_10px_-3px_rgba(228,177,40,0.45)]"
                          : "bg-bhalyam-cream-soft border-bhalyam-cream-edge/80 hover:border-bhalyam-wood/40"}`}
          >
            <div className="font-bold text-bhalyam-wood-dark text-[13px] leading-tight">
              {item.label}
            </div>
            <div className="text-[10px] text-bhalyam-wood-dark/70 mt-0.5 leading-tight">
              {item.blurb}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
         strokeLinecap="round" className={className} aria-hidden>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}
