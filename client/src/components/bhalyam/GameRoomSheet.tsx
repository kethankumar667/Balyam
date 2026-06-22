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
  WordBuildingGlyph,
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
  wordbuilding: WordBuildingGlyph,
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

// Word Building option catalogs.
const WB_DICT_MODES: { id: "common" | "tournament"; label: string; blurb: string }[] = [
  { id: "common",     label: "Classroom",  blurb: "Everyday English (~20k). Words a teacher would recognize." },
  { id: "tournament", label: "Tournament", blurb: "Full Scrabble (~275k). Includes obscure entries like CAA, EDH, ABACA." },
];

// OptionGrid only takes string ids; we store the numeric board size as a
// string here and parse on commit.
const WB_BOARD_SIZES: { id: "8" | "10" | "15"; label: string; blurb: string }[] = [
  { id: "8",  label: "8 × 8",   blurb: "Quick game. Fills up fast." },
  { id: "10", label: "10 × 10", blurb: "Balanced — the default workbook page." },
  { id: "15", label: "15 × 15", blurb: "Long match. Room for big words." },
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
  // Word Building: which dictionary the engine validates against. Default
  // is "common" — the curated ~20k everyday-English list — so casual
  // players don't get tripped up by tournament Scrabble entries.
  const [wbDictMode, setWbDictMode] =
    useState<"common" | "tournament">("common");
  const [wbBoardSize, setWbBoardSize] = useState<8 | 10 | 15>(10);
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  /**
   * Pass & Play: when the user toggles this on (Ludo + SnL only), we collect
   * 1-3 extra "local" player names and start the game immediately on one
   * device. No room code shared, no second connection — the host's socket
   * drives every seat.
   */
  const [passPlay, setPassPlay] = useState<boolean>(false);
  const [localNames, setLocalNames] = useState<string[]>(["", ""]);
  // Per-field validation lives directly under each input. `formError` is
  // reserved for cross-field / server-side errors that don't belong on a
  // single field (e.g. "Failed to create room", a network blip).
  const [nameError, setNameError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Reset transient state every time a new game opens.
  useEffect(() => {
    if (game) {
      setNameError(null);
      setCodeError(null);
      setFormError(null);
      setBusy(false);
      setJoinCode("");
      setName(playerName);
      setPassPlay(false);
      setLocalNames(["", ""]);
      setWbDictMode("common");
      setWbBoardSize(10);
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
    setNameError(null);
    setCodeError(null);
    setFormError(null);
    if (!n) {
      setNameError("Enter your name first");
      return;
    }
    if (!game) return;
    setBusy(true);
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
        wordBuildingOptions:
          game === "wordbuilding"
            ? { dictionaryMode: wbDictMode, boardSize: wbBoardSize }
            : undefined,
      },
      (res) => {
        setBusy(false);
        if (!res.ok || !res.code) {
          // Room creation failure is genuinely cross-field — the server
          // rejected the whole request. Use the form-level fallback.
          setFormError(res.error ?? "Failed to create room");
          return;
        }
        if (res.playerId) setPlayerId(res.playerId);
        navigate(`/room/${res.code}`);
      },
    );
  }

  /**
   * Pass & Play start: create the room, add local seats for each filled
   * name, then start the game immediately. All happens on one socket; no
   * room code is shared because no second device is joining. The host's
   * own color/coin is auto-assigned by the lobby auto-assign code; local
   * seats are auto-assigned colors in `addLocalPlayer` server-side.
   */
  function startPassAndPlay() {
    const n = trimmedName();
    const filled = localNames.map((s) => s.trim()).filter((s) => s.length > 0);
    setNameError(null);
    setFormError(null);
    if (!n) {
      setNameError("Enter your name first");
      return;
    }
    if (filled.length === 0) {
      setFormError("Add at least one more player to play together");
      return;
    }
    if (!game) return;
    setBusy(true);
    setPlayerName(n);
    const socket = getSocket();
    socket.emit(
      "room:create",
      {
        name: n,
        game: game as GameKind,
        playerId: playerId ?? undefined,
        snlOptions: game === "snl" ? { difficulty } : undefined,
        wordBuildingOptions:
          game === "wordbuilding"
            ? { dictionaryMode: wbDictMode, boardSize: wbBoardSize }
            : undefined,
      },
      (res) => {
        if (!res.ok || !res.code) {
          setBusy(false);
          setFormError(res.error ?? "Failed to create room");
          return;
        }
        if (res.playerId) setPlayerId(res.playerId);
        const roomCode = res.code;
        // Add each local seat sequentially. Server validates max-players
        // per game; any overflow surfaces as a `room:error`.
        for (const nm of filled) {
          socket.emit("room:addLocalPlayer", nm);
        }
        // Give the server a tick to apply the addLocalPlayer ops and flush
        // the resulting room:state broadcast, then mark the host ready and
        // start. Room.tsx will pick up the state and render the game.
        setTimeout(() => {
          socket.emit("room:setReady", true);
          setTimeout(() => {
            socket.emit("room:startGame");
            setBusy(false);
            navigate(`/room/${roomCode}`);
          }, 80);
        }, 80);
      },
    );
  }

  function joinRoom() {
    const n = trimmedName();
    const code = joinCode.trim().toUpperCase();
    // Validate both fields together so the user sees every problem at once
    // rather than one-at-a-time. The first offender wins focus.
    const nextNameError = !n ? "Enter your name first" : null;
    const nextCodeError = code.length !== 6 ? "Room code must be 6 characters" : null;
    setNameError(nextNameError);
    setCodeError(nextCodeError);
    setFormError(null);
    if (nextNameError || nextCodeError) return;
    setBusy(true);
    setPlayerName(n);
    const socket = getSocket();
    socket.emit(
      "room:join",
      { name: n, code, playerId: playerId ?? undefined },
      (res) => {
        setBusy(false);
        if (!res.ok) {
          // Server-side join failure ("Room not found", "Game already in
          // progress", "Room is full") almost always points at the code
          // field — that's the rejected room.
          setCodeError(res.error ?? "Failed to join");
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
          <Field label="Your name" htmlFor="grs-name" error={nameError}>
            <input
              id="grs-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(null);
              }}
              placeholder="e.g. Kethan"
              maxLength={20}
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? "grs-name-error" : undefined}
              className={`w-full min-h-[44px] px-3 rounded-xl
                         bg-bhalyam-cream-soft border-2
                         text-bhalyam-wood-dark placeholder:text-bhalyam-wood-dark/40
                         font-semibold
                         focus:outline-none focus:ring-2
                         transition-all duration-200
                         ${nameError
                           ? "border-bhalyam-ludo-red/70 focus:border-bhalyam-ludo-red focus:ring-bhalyam-ludo-red/30"
                           : "border-bhalyam-cream-edge/80 focus:border-bhalyam-gold-dark focus:ring-bhalyam-gold/40"}`}
            />
          </Field>

          {/* Pass & Play toggle — open-information games only (the board
              is fully visible to everyone, so screen-sharing is fair).
              Word Building qualifies; Rummy/UNO/RPS/HC don't. */}
          {(game === "ludo" || game === "snl" || game === "wordbuilding") && (
            <PassPlayBlock
              on={passPlay}
              onToggle={() => setPassPlay((v) => !v)}
              names={localNames}
              onNamesChange={setLocalNames}
              maxExtraSeats={
                game === "ludo" ? 3 : game === "wordbuilding" ? 3 : 9
              }
            />
          )}

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

          {game === "wordbuilding" && (
            <>
              <Field label="Dictionary">
                <OptionGrid
                  items={WB_DICT_MODES}
                  value={wbDictMode}
                  onChange={setWbDictMode}
                  cols={2}
                />
              </Field>
              <Field label="Board size">
                <OptionGrid
                  items={WB_BOARD_SIZES}
                  value={String(wbBoardSize) as "8" | "10" | "15"}
                  onChange={(v) => setWbBoardSize(Number(v) as 8 | 10 | 15)}
                  cols={3}
                />
              </Field>
            </>
          )}

          {/* Primary CTA — swaps label/handler in Pass & Play mode */}
          <button
            type="button"
            onClick={passPlay ? startPassAndPlay : createRoom}
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
            ) : passPlay ? (
              <>
                <SparkIcon className="w-5 h-5" />
                Start Pass &amp; Play
              </>
            ) : (
              <>
                <SparkIcon className="w-5 h-5" />
                Create Room
              </>
            )}
          </button>

          {/* Join divider — hidden in Pass & Play (no second device joining) */}
          {!passPlay && (
            <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest font-bold text-bhalyam-wood/60">
              <span className="flex-1 h-px bg-bhalyam-cream-edge/80" />
              <span>Or join an existing room</span>
              <span className="flex-1 h-px bg-bhalyam-cream-edge/80" />
            </div>
          )}

          {/* Join by code — hidden in Pass & Play mode */}
          {!passPlay && (
          <div className="space-y-2.5">
            <Field label="Room code" htmlFor="grs-code" error={codeError}>
              <input
                id="grs-code"
                type="text"
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(e.target.value.toUpperCase());
                  if (codeError) setCodeError(null);
                }}
                placeholder="ROOM CODE"
                maxLength={6}
                aria-invalid={codeError ? true : undefined}
                aria-describedby={codeError ? "grs-code-error" : undefined}
                className={`w-full min-h-[44px] px-3 rounded-xl
                           bg-bhalyam-cream-soft border-2
                           text-bhalyam-wood-dark placeholder:text-bhalyam-wood-dark/40
                           font-mono font-bold tracking-[0.3em] text-center
                           focus:outline-none focus:ring-2
                           transition-all duration-200
                           ${codeError
                             ? "border-bhalyam-ludo-red/70 focus:border-bhalyam-ludo-red focus:ring-bhalyam-ludo-red/30"
                             : "border-bhalyam-cream-edge/80 focus:border-bhalyam-gold-dark focus:ring-bhalyam-gold/40"}`}
              />
            </Field>
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
          )}

          {/* Form-level error fallback — used only when the failure isn't
              attributable to one input (e.g. server "Failed to create room"). */}
          {formError && (
            <div
              role="alert"
              aria-live="polite"
              className="text-sm text-bhalyam-ludo-red font-bold text-center
                         bg-bhalyam-ludo-red/10 border border-bhalyam-ludo-red/30
                         rounded-xl p-2"
            >
              {formError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────── Helpers ───────────────────────────── */

function Field({
  label,
  children,
  htmlFor,
  error,
}: {
  label: string;
  children: React.ReactNode;
  /** Required when there's an associated input — wires <label htmlFor> and the error's id. */
  htmlFor?: string;
  /** Field-level validation message rendered directly below the input. */
  error?: string | null;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-[11px] uppercase tracking-widest font-bold text-bhalyam-wood"
      >
        {label}
      </label>
      {children}
      {error && (
        <p
          id={htmlFor ? `${htmlFor}-error` : undefined}
          role="alert"
          aria-live="polite"
          className="text-[12px] font-semibold text-bhalyam-ludo-red leading-tight pl-0.5"
        >
          {error}
        </p>
      )}
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

/**
 * Pass & Play toggle + name inputs.
 *
 * When OFF: shows a single row with an explanatory subtitle and a checkbox-
 * style toggle.
 * When ON: expands to N name inputs (host already provided their own name
 * up top) plus an Add Player row that appears while seats remain.
 *
 * `maxExtraSeats` reflects the per-game cap minus 1 (for the host) — Ludo
 * allows 4 total → 3 extras; SnL allows 10 → 9 extras.
 */
function PassPlayBlock({
  on,
  onToggle,
  names,
  onNamesChange,
  maxExtraSeats,
}: {
  on: boolean;
  onToggle: () => void;
  names: string[];
  onNamesChange: (next: string[]) => void;
  maxExtraSeats: number;
}) {
  function setAt(i: number, value: string) {
    const next = names.slice();
    next[i] = value;
    onNamesChange(next);
  }
  function addSlot() {
    if (names.length >= maxExtraSeats) return;
    onNamesChange([...names, ""]);
  }
  function removeSlot(i: number) {
    if (names.length <= 1) return;
    onNamesChange(names.filter((_, idx) => idx !== i));
  }
  return (
    <div
      className={`rounded-xl border-2 p-3 transition-colors duration-200
                  ${on
                    ? "border-bhalyam-gold-dark bg-bhalyam-gold/10"
                    : "border-bhalyam-cream-edge/80 bg-bhalyam-cream-soft"}`}
    >
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={on}
          onChange={onToggle}
          className="mt-0.5 w-5 h-5 accent-bhalyam-gold-dark cursor-pointer"
          aria-label="Toggle Pass and Play mode"
        />
        <span className="flex-1 min-w-0">
          <span className="block font-bold text-bhalyam-wood-dark text-[14px] leading-tight">
            Pass &amp; Play (1 device)
          </span>
          <span className="block text-[11px] text-bhalyam-wood-dark/70 mt-0.5">
            Two or more players share this phone and take turns. No room code
            needed.
          </span>
        </span>
      </label>

      {on && (
        <div className="mt-3 space-y-2 pl-8">
          {names.map((nm, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={nm}
                onChange={(e) => setAt(i, e.target.value)}
                placeholder={`Player ${i + 2}`}
                maxLength={20}
                className="flex-1 min-h-[40px] px-3 rounded-lg
                           bg-white border-2 border-bhalyam-cream-edge/80
                           text-bhalyam-wood-dark placeholder:text-bhalyam-wood-dark/40
                           font-semibold text-[13px]
                           focus:outline-none focus:border-bhalyam-gold-dark
                           focus:ring-2 focus:ring-bhalyam-gold/40
                           transition-all duration-200"
                aria-label={`Name for player ${i + 2}`}
              />
              {names.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSlot(i)}
                  aria-label={`Remove player ${i + 2}`}
                  className="w-9 h-9 rounded-full inline-flex items-center justify-center
                             bg-bhalyam-cream-warm text-bhalyam-wood-dark
                             hover:bg-bhalyam-cream-edge active:scale-95 cursor-pointer
                             focus:outline-none focus:ring-2 focus:ring-bhalyam-gold-dark/60
                             transition-all duration-200"
                >
                  <CloseIcon className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          {names.length < maxExtraSeats && (
            <button
              type="button"
              onClick={addSlot}
              className="w-full min-h-[36px] rounded-lg border-2 border-dashed
                         border-bhalyam-gold-dark/40 text-bhalyam-wood-dark
                         text-[12px] font-bold hover:bg-bhalyam-gold/10
                         transition-colors duration-200 cursor-pointer"
            >
              + Add another player
            </button>
          )}
        </div>
      )}
    </div>
  );
}
