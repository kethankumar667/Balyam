import { useEffect, useState } from "react";
import { STAR_THEMES } from "@shared/star-themes";
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
  getGameAccent,
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
  DotsBoxesGlyph,
  NamePlaceAnimalGlyph,
  TambolaGlyph,
  TeluguCinemaluGlyph,
  SamethaluGlyph,
  StarGameGlyph,
  BingoGlyph,
  BlockBlastGlyph,
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
  dotsboxes: DotsBoxesGlyph,
  namesplaceanimal: NamePlaceAnimalGlyph,
  tambola: TambolaGlyph,
  samethalu: SamethaluGlyph,
  telugucinemalu: TeluguCinemaluGlyph,
  stargame: StarGameGlyph,
  bingo: BingoGlyph,
  snake: StarGameGlyph,
  bounce: StarGameGlyph,
  roadrash: StarGameGlyph,
  carrom: StarGameGlyph,
  chess: StarGameGlyph,
  blockblast: BlockBlastGlyph,
  spacewar: StarGameGlyph,
};

/**
 * The home tile gate (`maintenance: true`) prevents the sheet from
 * opening with one of the "coming soon" slugs, so when we reach the
 * room-creation path below, `game` is guaranteed to be a real
 * GameKind at runtime. TypeScript can't see that proof; this helper
 * makes the narrowing explicit so callers don't need a wide cast.
 */
 const PLAYABLE_SLUGS: ReadonlySet<BhalyamGameSlug> = new Set<BhalyamGameSlug>([
  "handcricket", "snl", "ludo", "rummy", "rps", "uno", "wordbuilding", "dotsboxes", "stargame", "bingo",
  "namesplaceanimal", "tambola", "samethalu", "telugucinemalu", "snake", "carrom", "roadrash", "chess",
  "blockblast", "spacewar",
 ]);
function asGameKind(slug: BhalyamGameSlug): GameKind {
  if (!PLAYABLE_SLUGS.has(slug)) {
    throw new Error(`Cannot create room for non-playable slug: ${slug}`);
  }
  return slug as GameKind;
}

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

// UNO turn timer, stored as a string id so it fits OptionGrid<T extends
// string>; parsed back to a number when building the room-create payload.
const UNO_TURN_TIMERS: { id: "10" | "20" | "30" | "0"; label: string; blurb: string }[] = [
  { id: "10", label: "Fast",      blurb: "10s per turn — keeps the table moving." },
  { id: "20", label: "Standard",  blurb: "20s per turn — the official default." },
  { id: "30", label: "Relaxed",   blurb: "30s per turn — more time to think." },
  { id: "0",  label: "No timer",  blurb: "Untimed — casual/family friendly." },
];

// UNO match length (Volume 2/6): a single round, or a multi-round match
// that keeps dealing fresh rounds — cumulative scores carrying over —
// until someone crosses the target. "500" mirrors Mattel's own official
// default and unoonline.io's headline "first to 500" feature.
const UNO_MATCH_LENGTHS: { id: "single" | "300" | "500" | "1000"; label: string; blurb: string }[] = [
  { id: "single", label: "Single round",  blurb: "One deal, win or lose, done." },
  { id: "300",    label: "Race to 300",   blurb: "Quick multi-round match." },
  { id: "500",    label: "Race to 500",   blurb: "Mattel's official match length." },
  { id: "1000",   label: "Race to 1000",  blurb: "Long, high-drama session." },
];

// Bingo call pace (docs/bingo/roadmap.md) — how often the caller reads the
// next number. Values mirror shared/types.ts's BINGO_CALL_INTERVAL_TIERS.
const BINGO_CALL_SPEEDS: { id: "2500" | "4000" | "6000"; label: string; blurb: string }[] = [
  { id: "2500", label: "Fast",     blurb: "New number every 2.5s — quickfire round." },
  { id: "4000", label: "Standard", blurb: "New number every 4s — the default pace." },
  { id: "6000", label: "Relaxed",  blurb: "New number every 6s — more time to mark." },
];
// Single-winner vs "play it out" — matches the stopOnFirstWin option.
const BINGO_WIN_MODES: { id: "first" | "all"; label: string; blurb: string }[] = [
  { id: "first", label: "First win ends it", blurb: "Round ends the instant someone claims BINGO." },
  { id: "all",   label: "Play it out",       blurb: "Calling continues until everyone's resolved, ranked by claim time." },
];

// UNO house rules (Volume 4 §28-34) — private-room-only options the engine
// now fully enforces (Phase C). Every flag defaults off, so a room with no
// selections is exactly the official ruleset.
type UnoHouseRuleKey =
  | "stackDrawCards"
  | "jumpIn"
  | "sevenSwap"
  | "zeroRotate"
  | "keepDrawing"
  | "forcePlay";
const UNO_DEFAULT_HOUSE_RULES: Record<UnoHouseRuleKey, boolean> = {
  stackDrawCards: false,
  jumpIn: false,
  sevenSwap: false,
  zeroRotate: false,
  keepDrawing: false,
  forcePlay: false,
};
const UNO_HOUSE_RULES: { id: UnoHouseRuleKey; label: string; blurb: string }[] = [
  { id: "stackDrawCards", label: "Stack Draw Cards", blurb: "+2 on +2 piles up — the next player who can't stack draws it all." },
  { id: "jumpIn",         label: "Jump-In",          blurb: "Hold the exact same card on top? Play it instantly, out of turn." },
  { id: "sevenSwap",      label: "Seven Swap",       blurb: "Playing a 7 swaps your hand with a random opponent's." },
  { id: "zeroRotate",     label: "Zero Rotate",      blurb: "Playing a 0 rotates every hand around the table." },
  { id: "keepDrawing",    label: "Keep Drawing",     blurb: "No playable card? Keep drawing until you find one." },
  { id: "forcePlay",      label: "Force Play",       blurb: "A drawn card that's playable is played automatically." },
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

// Dots & Boxes — dot-grid size. Box count = (n-1)^2 so 5→16, 7→36, 9→64.
const DB_BOARD_SIZES: { id: "5" | "7" | "9"; label: string; blurb: string }[] = [
  { id: "5", label: "5 × 5 dots", blurb: "16 boxes — quick recess round." },
  { id: "7", label: "7 × 7 dots", blurb: "36 boxes — the maths-period sweet spot." },
  { id: "9", label: "9 × 9 dots", blurb: "64 boxes — marathon notebook match." },
];

// Star Game — round count + pass-window pacing (theme list comes from STAR_THEMES).
const STAR_ROUNDS: { id: string; label: string; blurb: string }[] = [
  { id: "3", label: "3", blurb: "quick" },
  { id: "5", label: "5", blurb: "classic" },
  { id: "7", label: "7", blurb: "long" },
  { id: "10", label: "10", blurb: "marathon" },
];
const STAR_PASS_SPEEDS: { id: string; label: string; blurb: string }[] = [
  { id: "normal", label: "Normal", blurb: "16s pass" },
  { id: "fast", label: "Fast", blurb: "9s pass" },
];

const NPA_DIFFICULTIES: { id: "easy" | "medium" | "hard"; label: string; blurb: string }[] = [
  { id: "easy",   label: "Easy",   blurb: "45s timer per round — friendly speed" },
  { id: "medium", label: "Medium", blurb: "30s timer per round — standard speed" },
  { id: "hard",   label: "Hard",   blurb: "20s speed round — quick thinking!" },
];

const NPA_ROUNDS: { id: "3" | "5" | "7" | "10"; label: string; blurb: string }[] = [
  { id: "3",  label: "3 Rounds",  blurb: "Quick match" },
  { id: "5",  label: "5 Rounds",  blurb: "Standard match" },
  { id: "7",  label: "7 Rounds",  blurb: "Extended match" },
  { id: "10", label: "10 Rounds", blurb: "Marathon match" },
];

const NPA_THEME_PACKS: { id: "classic" | "popculture" | "foodie" | "school" | "random"; label: string; blurb: string }[] = [
  { id: "classic",    label: "Classic",     blurb: "Name, Place, Animal, Thing" },
  { id: "popculture", label: "Pop Culture", blurb: "Movie, Actor, Song, Brand" },
  { id: "foodie",     label: "Foodie",      blurb: "Dish, Fruit/Veggie, Drink, Snack" },
  { id: "school",     label: "School",      blurb: "Country, Capital, Element, Figure" },
  { id: "random",     label: "Random Mix",  blurb: "Changes categories every round!" },
];

/**
 * Race length. Only meaningful with two or more seats — one player gets the
 * endless game and no clock at all, which the engine decides from the seat
 * count rather than from anything chosen here.
 */
const BLOCKBLAST_RACE_LENGTHS: { id: "120" | "180" | "300"; label: string; blurb: string }[] = [
  { id: "120", label: "Standard", blurb: "2 min — most boards survive to the whistle" },
  { id: "180", label: "Long",     blurb: "3 min — expect to be knocked out early" },
  { id: "300", label: "Marathon", blurb: "5 min — last board standing usually wins" },
];

const SNAKE_SPEEDS: { id: "140" | "100" | "70"; label: string; blurb: string }[] = [
  { id: "140", label: "Slug",   blurb: "140ms tick — relaxed pace" },
  { id: "100", label: "Normal", blurb: "100ms tick — classic arcade" },
  { id: "70",  label: "Fast",   blurb: "70ms tick — high speed reflex" },
];

const SNAKE_GRID_SIZES: { id: "15" | "20" | "25"; label: string; blurb: string }[] = [
  { id: "15", label: "Compact",  blurb: "15 × 15 grid" },
  { id: "20", label: "Standard", blurb: "20 × 20 grid" },
  { id: "25", label: "Large",    blurb: "25 × 25 grid" },
];

const SNAKE_WALL_MODES: { id: "solid" | "wrap"; label: string; blurb: string }[] = [
  { id: "wrap",  label: "Wrap Around", blurb: "Passing boundary wraps to other side" },
  { id: "solid", label: "Solid Walls", blurb: "Hitting boundary kills snake" },
];

const SNAKE_THEMES: { id: "monochrome" | "color" | "neon-modern"; label: string; blurb: string }[] = [
  { id: "monochrome", label: "3310", blurb: "Green LCD dot matrix" },
  { id: "color",      label: "6110", blurb: "Classic color screen" },
  { id: "neon-modern",      label: "Neon Glow",  blurb: "Modern vibrant dark mode" },
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
  const { playerName, setPlayerName, setPlayerId, rememberSeat, seatFor, avatarId } =
    useRoomStore();

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
  // Dots & Boxes: dot-grid edge length. Box count = (n-1)^2.
  const [dbBoardSize, setDbBoardSize] = useState<5 | 7 | 9>(7);
  const [starTheme, setStarTheme] = useState<string>("colors");
  const [starRounds, setStarRounds] = useState<number>(5);
  const [starPassSpeed, setStarPassSpeed] = useState<"normal" | "fast">("normal");
  const [unoTurnTimer, setUnoTurnTimer] = useState<"10" | "20" | "30" | "0">("20");
  const [unoMatchLength, setUnoMatchLength] = useState<"single" | "300" | "500" | "1000">("single");
  const [unoHouseRules, setUnoHouseRules] = useState<Record<UnoHouseRuleKey, boolean>>(UNO_DEFAULT_HOUSE_RULES);
  const [bingoCallSpeed, setBingoCallSpeed] = useState<"2500" | "4000" | "6000">("4000");
  const [bingoWinMode, setBingoWinMode] = useState<"first" | "all">("first");
  const [npaDifficulty, setNpaDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [npaRounds, setNpaRounds] = useState<number>(5);
  const [npaThemePack, setNpaThemePack] = useState<"classic" | "popculture" | "foodie" | "school" | "random">("classic");
  const [blockBlastRaceLength, setBlockBlastRaceLength] = useState<"120" | "180" | "300">("120");
  const [snakeSpeed, setSnakeSpeed] = useState<"140" | "100" | "70">("100");
  const [snakeGridSize, setSnakeGridSize] = useState<"15" | "20" | "25">("20");
  const [snakeWallMode, setSnakeWallMode] = useState<"solid" | "wrap">("wrap");
  const [snakeTheme, setSnakeTheme] = useState<"nokia-monochrome" | "nokia-color" | "neon-modern">("nokia-monochrome");
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

  const isSolo = game ? ["samethalu", "telugucinemalu", "snake", "roadrash", "spacewar"].includes(game) : false;

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
      setWbDictMode("common");
      setWbBoardSize(10);
      setDbBoardSize(7);
      setUnoTurnTimer("20");
      setUnoMatchLength("single");
      setUnoHouseRules(UNO_DEFAULT_HOUSE_RULES);
      setBingoCallSpeed("4000");
      setBingoWinMode("first");
      setNpaDifficulty("medium");
      setNpaRounds(5);
      setNpaThemePack("classic");
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
    try {
      const socket = getSocket();
      socket.emit(
        "room:create",
        {
          name: n,
          game: asGameKind(game),
          avatar: avatarId ?? undefined,
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
          dotsBoxesOptions:
            game === "dotsboxes" ? { boardSize: dbBoardSize } : undefined,
          starGameOptions:
            game === "stargame"
              ? { themeId: starTheme, totalRounds: starRounds, passSpeed: starPassSpeed }
              : undefined,
          unoOptions:
            game === "uno"
              ? {
                  turnTimerSeconds: Number(unoTurnTimer),
                  targetScore: unoMatchLength === "single" ? null : Number(unoMatchLength),
                  ...unoHouseRules,
                }
              : undefined,
          bingoOptions:
            game === "bingo"
              ? {
                  callIntervalMs: Number(bingoCallSpeed),
                  stopOnFirstWin: bingoWinMode === "first",
                }
              : undefined,
          namesplaceanimalOptions:
            game === "namesplaceanimal"
              ? {
                  difficulty: npaDifficulty,
                  totalRounds: npaRounds,
                  roundSeconds: npaDifficulty === "easy" ? 45 : npaDifficulty === "hard" ? 20 : 30,
                  themePack: npaThemePack,
                }
              : undefined,
          snakeOptions:
            game === "snake"
              ? {
                  speedMs: Number(snakeSpeed),
                  gridSize: Number(snakeGridSize),
                  wallMode: snakeWallMode,
                  theme: snakeTheme,
                }
              : undefined,
          blockBlastOptions:
            game === "blockblast"
              ? { raceSeconds: Number(blockBlastRaceLength) }
              : undefined,
        },
        (res) => {
          setBusy(false);
          if (!res.ok || !res.code) {
            setFormError(res.error ?? "Failed to create room");
            return;
          }
          if (res.playerId) setPlayerId(res.playerId);
          if (res.code && res.playerId && res.seatToken) {
            rememberSeat(res.code, res.playerId, res.seatToken);
          }
          if (game && ["samethalu", "telugucinemalu", "snake", "roadrash", "spacewar"].includes(game)) {
            const socket = getSocket();
            socket.emit("room:setReady", true);
            socket.emit("room:startGame");
          }
          navigate(`/room/${res.code}`);
        },
      );
    } catch (err) {
      setBusy(false);
      setFormError(err instanceof Error ? err.message : "Failed to create room");
    }
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
        game: asGameKind(game),
        avatar: avatarId ?? undefined,
        snlOptions: game === "snl" ? { difficulty } : undefined,
        wordBuildingOptions:
          game === "wordbuilding"
            ? { dictionaryMode: wbDictMode, boardSize: wbBoardSize }
            : undefined,
        dotsBoxesOptions:
          game === "dotsboxes" ? { boardSize: dbBoardSize } : undefined,
        starGameOptions:
          game === "stargame"
            ? { themeId: starTheme, totalRounds: starRounds, passSpeed: starPassSpeed }
            : undefined,
        namesplaceanimalOptions:
          game === "namesplaceanimal"
            ? {
                difficulty: npaDifficulty,
                totalRounds: npaRounds,
                roundSeconds: npaDifficulty === "easy" ? 45 : npaDifficulty === "hard" ? 20 : 30,
                themePack: npaThemePack,
              }
            : undefined,
        snakeOptions:
          game === "snake"
            ? {
                speedMs: Number(snakeSpeed),
                gridSize: Number(snakeGridSize),
                wallMode: snakeWallMode,
                theme: snakeTheme,
              }
            : undefined,
        blockBlastOptions:
          game === "blockblast" ? { raceSeconds: Number(blockBlastRaceLength) } : undefined,
      },
      (res) => {
        if (!res.ok || !res.code) {
          setBusy(false);
          setFormError(res.error ?? "Failed to create room");
          return;
        }
        if (res.playerId) setPlayerId(res.playerId);
        if (res.code && res.playerId && res.seatToken) {
          rememberSeat(res.code, res.playerId, res.seatToken);
        }
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
      { name: n, code, avatar: avatarId ?? undefined, ...(seatFor(code) ?? {}) },
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
        if (res.playerId && res.seatToken) rememberSeat(code, res.playerId, res.seatToken);
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
                 bg-black/60 dark:bg-black/80 backdrop-blur-sm dark:backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-room-sheet-title"
        onClick={(e) => e.stopPropagation()}
        className="bhalyam-font custom-scrollbar relative w-full max-w-lg md:max-w-3xl lg:max-w-4xl
                   max-h-[92dvh] overflow-y-auto
                   bg-[#FFFDF9] dark:bg-[#111622] text-[#2B3550] dark:text-slate-100
                   border-2 border-[#EEDBCA] dark:border-slate-800
                   rounded-t-3xl md:rounded-3xl
                   shadow-[0_-12px_40px_-8px_rgba(74,44,22,0.45)]
                   md:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* Pull handle (mobile bottom-sheet only) */}
        <div className="md:hidden flex justify-center pt-2.5">
          <span aria-hidden className="w-10 h-1.5 rounded-full bg-[#EEDBCA] dark:bg-slate-700" />
        </div>

        {/* Header */}
        <header className="flex items-center gap-3 p-4 md:px-6 md:py-4 border-b-2 border-[#EEDBCA]/60 dark:border-slate-800">
          <span
            className="inline-flex w-12 h-12 rounded-2xl items-center justify-center text-white flex-shrink-0 shadow-md"
            style={{
              background: `linear-gradient(135deg, ${getGameAccent(meta).from}, ${getGameAccent(meta).to})`,
              boxShadow: `0 6px 14px -4px ${getGameAccent(meta).to}66`,
            }}
            aria-hidden
          >
            <Glyph className="w-6 h-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="game-room-sheet-title"
              className="font-bold text-[#2B3550] dark:text-slate-100 text-lg md:text-xl leading-tight truncate"
            >
              {meta.title}
            </h2>
            {meta.teluguTitle ? (
              <div className="text-[10px] uppercase tracking-widest font-bold text-[#8A6D4B] dark:text-slate-400">
                {meta.teluguTitle} · {isSolo ? "Solo Play" : "Quick Match"}
              </div>
            ) : (
              <div className="text-[10px] uppercase tracking-widest font-bold text-[#8A6D4B] dark:text-slate-400">
                {isSolo ? "Solo Play" : "Quick Match"}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-10 h-10 rounded-full inline-flex items-center justify-center
                       bg-[#FFF4E0] dark:bg-[#1E2738] text-[#2B3550] dark:text-slate-200
                       hover:bg-[#EEDCC2] dark:hover:bg-[#2A374F] active:scale-95 transition-all duration-150 cursor-pointer"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </header>

        {/* Body: Responsive 2-Column on Desktop (md:), Stack on Mobile */}
        <div className="p-4 md:p-6 md:grid md:grid-cols-12 md:gap-6 space-y-4 md:space-y-0">
          
          {/* Left Column: Name, Pass & Play, Core Rules & Customization */}
          <div className="md:col-span-7 space-y-4">
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
                placeholder="e.g. Sri Krishna"
                maxLength={20}
                aria-invalid={nameError ? true : undefined}
                aria-describedby={nameError ? "grs-name-error" : undefined}
                className={`w-full min-h-[46px] px-3.5 rounded-2xl
                           bg-[#FFF9EE] dark:bg-[#0B0F19] border-2
                           text-[#2B3550] dark:text-slate-100 placeholder-[#B0A090] dark:placeholder:text-slate-500
                           font-bold text-sm
                           focus:outline-none focus:ring-4
                           transition-all duration-200
                           ${nameError
                             ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20"
                             : "border-[#EEDBCA] dark:border-slate-700/80 focus:border-amber-500 dark:focus:border-amber-400 focus:ring-amber-400/20 dark:focus:ring-amber-500/20"}`}
              />
            </Field>

            {/* Pass & Play toggle */}
            {(game === "ludo" || game === "snl" || game === "wordbuilding" || game === "dotsboxes") && (
              <PassPlayBlock
                on={passPlay}
                onToggle={() => setPassPlay((v) => !v)}
                names={localNames}
                onNamesChange={setLocalNames}
                maxExtraSeats={
                  game === "ludo"
                    ? 3
                    : game === "wordbuilding" || game === "dotsboxes"
                    ? 3
                    : 9
                }
              />
            )}

            {/* Per-game Primary Options */}
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

            {game === "uno" && (
              <>
                <Field label="Match length">
                  <OptionGrid
                    items={UNO_MATCH_LENGTHS}
                    value={unoMatchLength}
                    onChange={setUnoMatchLength}
                    cols={2}
                  />
                </Field>
                <Field label="House rules (optional)">
                  <UnoHouseRuleGrid flags={unoHouseRules} onToggle={(id) =>
                    setUnoHouseRules((prev) => ({ ...prev, [id]: !prev[id] }))
                  } />
                </Field>
              </>
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
                    <div className="rounded-2xl p-3 bg-amber-500/10 border-2 border-amber-500/30">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-widest">
                          Street cricket
                        </span>
                        <span className="text-lg font-black tabular-nums text-amber-700 dark:text-amber-300">
                          {hcGalliOvers}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={HC_GALLI_MIN_OVERS}
                        max={HC_GALLI_MAX_OVERS}
                        value={hcGalliOvers}
                        onChange={(e) => setHcGalliOvers(Number(e.target.value))}
                        className="w-full accent-amber-500"
                      />
                      <div className="flex justify-between text-[10px] text-[#8A6D4B] dark:text-slate-400 mt-1 font-semibold">
                        <span>{HC_GALLI_MIN_OVERS}</span>
                        <span>10</span>
                        <span>{HC_GALLI_MAX_OVERS}</span>
                      </div>
                    </div>
                  </Field>
                )}
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

            {game === "dotsboxes" && (
              <Field label="Board size">
                <OptionGrid
                  items={DB_BOARD_SIZES}
                  value={String(dbBoardSize) as "5" | "7" | "9"}
                  onChange={(v) => setDbBoardSize(Number(v) as 5 | 7 | 9)}
                  cols={3}
                />
              </Field>
            )}

            {game === "stargame" && (
              <>
                <Field label="Theme">
                  <OptionGrid
                    items={STAR_THEMES.map((t) => ({ id: t.id, label: t.label, blurb: t.glyph }))}
                    value={starTheme}
                    onChange={setStarTheme}
                    cols={3}
                  />
                </Field>
                <Field label="Rounds">
                  <OptionGrid
                    items={STAR_ROUNDS}
                    value={String(starRounds)}
                    onChange={(v) => setStarRounds(Number(v))}
                    cols={2}
                  />
                </Field>
              </>
            )}

            {game === "bingo" && (
              <Field label="Win condition">
                <OptionGrid
                  items={BINGO_WIN_MODES}
                  value={bingoWinMode}
                  onChange={setBingoWinMode}
                  cols={2}
                />
              </Field>
            )}

            {game === "namesplaceanimal" && (
              <>
                <Field label="Category Theme Pack">
                  <OptionGrid
                    items={NPA_THEME_PACKS}
                    value={npaThemePack}
                    onChange={(v) => setNpaThemePack(v as "classic" | "popculture" | "foodie" | "school" | "random")}
                    cols={3}
                  />
                </Field>
                <Field label="Total Rounds">
                  <OptionGrid
                    items={NPA_ROUNDS}
                    value={String(npaRounds)}
                    onChange={(v) => setNpaRounds(Number(v))}
                    cols={2}
                  />
                </Field>
              </>
            )}

            {game === "blockblast" && (
              <Field label="Race Length">
                <OptionGrid
                  items={BLOCKBLAST_RACE_LENGTHS}
                  value={blockBlastRaceLength}
                  onChange={(v) => setBlockBlastRaceLength(v as "120" | "180" | "300")}
                  cols={3}
                />
              </Field>
            )}

            {game === "snake" && (
              <>
                <Field label="Grid Dimensions">
                  <OptionGrid
                    items={SNAKE_GRID_SIZES}
                    value={snakeGridSize}
                    onChange={(v) => setSnakeGridSize(v as "15" | "20" | "25")}
                    cols={3}
                  />
                </Field>
                <Field label="Wall Boundary Rule">
                  <OptionGrid
                    items={SNAKE_WALL_MODES}
                    value={snakeWallMode}
                    onChange={(v) => setSnakeWallMode(v as "solid" | "wrap")}
                    cols={2}
                  />
                </Field>
                <Field label="Visual Arcade Theme">
                  <OptionGrid
                    items={SNAKE_THEMES}
                    value={snakeTheme}
                    onChange={(v) => setSnakeTheme(v as "nokia-monochrome" | "nokia-color" | "neon-modern")}
                    cols={3}
                  />
                </Field>
              </>
            )}
          </div>

          {/* Right Column: Secondary Timers, Feature Info Card & Action Buttons */}
          <div className="md:col-span-5 flex flex-col justify-between space-y-4 md:border-l-2 md:border-[#EEDBCA]/60 md:dark:border-slate-800 md:pl-6">
            
            {/* Top section: Secondary Timers & Game Highlights */}
            <div className="space-y-4">
              {/* Turn timer for UNO */}
              {game === "uno" && (
                <Field label="Turn timer">
                  <OptionGrid
                    items={UNO_TURN_TIMERS}
                    value={unoTurnTimer}
                    onChange={setUnoTurnTimer}
                    cols={2}
                  />
                </Field>
              )}

              {/* Category for Hand Cricket */}
              {game === "handcricket" && (
                <Field label="Category">
                  <OptionGrid
                    items={HC_CATEGORIES}
                    value={hcCategory}
                    onChange={setHcCategory}
                    cols={2}
                  />
                </Field>
              )}

              {/* Pass Speed for Star Game */}
              {game === "stargame" && (
                <Field label="Pass speed">
                  <OptionGrid
                    items={STAR_PASS_SPEEDS}
                    value={starPassSpeed}
                    onChange={(v) => setStarPassSpeed(v as "normal" | "fast")}
                    cols={2}
                  />
                </Field>
              )}

              {/* Call Speed for Bingo */}
              {game === "bingo" && (
                <Field label="Call speed">
                  <OptionGrid
                    items={BINGO_CALL_SPEEDS}
                    value={bingoCallSpeed}
                    onChange={setBingoCallSpeed}
                    cols={3}
                  />
                </Field>
              )}

              {/* Difficulty for Name Place Animal */}
              {game === "namesplaceanimal" && (
                <Field label="Difficulty Level">
                  <OptionGrid
                    items={NPA_DIFFICULTIES}
                    value={npaDifficulty}
                    onChange={(v) => setNpaDifficulty(v as "easy" | "medium" | "hard")}
                    cols={3}
                  />
                </Field>
              )}

              {/* Speed pace for Snake */}
              {game === "snake" && (
                <Field label="Speed Pace">
                  <OptionGrid
                    items={SNAKE_SPEEDS}
                    value={snakeSpeed}
                    onChange={(v) => setSnakeSpeed(v as "140" | "100" | "70")}
                    cols={3}
                  />
                </Field>
              )}

              {/* Mini Summary Card */}
              <div className="rounded-2xl p-3 bg-[#FFF9EE] dark:bg-[#161D2B] border border-[#EEDBCA] dark:border-slate-700/60 flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-sm"
                  style={{
                    background: `linear-gradient(135deg, ${getGameAccent(meta).from}, ${getGameAccent(meta).to})`,
                  }}
                >
                  <Glyph className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs text-[#2B3550] dark:text-slate-100 flex items-center gap-1.5">
                    <span>{meta.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-extrabold uppercase">
                      {isSolo ? "Solo" : "Live Room"}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#8A6D4B] dark:text-slate-400 truncate mt-0.5 font-medium">
                    {!isSolo ? "⚡ Real-time match · 🤖 AI practice bots" : "✨ Solo arcade challenge"}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions: CTA & Join by Code */}
            <div className="space-y-3 pt-2">
              {/* Primary CTA — swaps label/handler in Pass & Play mode */}
              <button
                type="button"
                onClick={passPlay ? startPassAndPlay : createRoom}
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2
                           min-h-[52px] rounded-2xl
                           bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400
                           text-slate-950 font-black text-[15px]
                           border border-amber-300/60
                           disabled:opacity-50 disabled:cursor-wait
                           active:scale-[0.98] transition-all duration-150 cursor-pointer
                           shadow-[0_6px_20px_-4px_rgba(245,158,11,0.55)] hover:shadow-[0_8px_24px_-4px_rgba(245,158,11,0.7)]"
              >
                {busy ? (
                  "Working…"
                ) : passPlay ? (
                  <>
                    <SparkIcon className="w-5 h-5" />
                    Start Pass &amp; Play
                  </>
                ) : isSolo ? (
                  <>
                    <SparkIcon className="w-5 h-5" />
                    Start Game
                  </>
                ) : (
                  <>
                    <SparkIcon className="w-5 h-5" />
                    Create Room
                  </>
                )}
              </button>

              {/* Join divider — hidden in Pass & Play or Solo mode */}
              {!passPlay && !isSolo && (
                <div className="flex items-center gap-3 text-[11px] uppercase tracking-widest font-extrabold text-[#8A6D4B] dark:text-slate-400 py-0.5">
                  <span className="flex-1 h-px bg-[#EEDBCA] dark:bg-slate-800" />
                  <span>Or join room</span>
                  <span className="flex-1 h-px bg-[#EEDBCA] dark:bg-slate-800" />
                </div>
              )}

              {/* Join by code — hidden in Pass & Play or Solo mode */}
              {!passPlay && !isSolo && (
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
                      className={`w-full min-h-[44px] px-3.5 rounded-2xl
                                 bg-[#FFF9EE] dark:bg-[#0B0F19] border-2 border-dashed
                                 text-[#2B3550] dark:text-slate-100 placeholder-[#B0A090] dark:placeholder:text-slate-500
                                 font-mono font-black tracking-[0.35em] text-center text-base
                                 focus:outline-none focus:ring-4
                                 transition-all duration-200
                                 ${codeError
                                   ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20"
                                   : "border-[#EEDBCA] dark:border-amber-500/40 focus:border-amber-500 dark:focus:border-amber-400 focus:ring-amber-400/20 dark:focus:ring-amber-500/20"}`}
                    />
                  </Field>
                  <button
                    type="button"
                    onClick={joinRoom}
                    disabled={busy}
                    className="w-full inline-flex items-center justify-center gap-2
                               min-h-[44px] rounded-2xl
                               bg-[#2B3550] hover:bg-[#1E2738] dark:bg-slate-800 hover:dark:bg-slate-700 text-white font-bold text-[13px]
                               border border-transparent dark:border-slate-700/80 hover:dark:border-amber-400/40
                               disabled:opacity-50 disabled:cursor-wait
                               active:scale-[0.98] transition-all duration-150 cursor-pointer
                               shadow-md"
                  >
                    {busy ? "Working…" : (
                      <>
                        Join Room <ArrowRightIcon className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Form-level error fallback */}
              {formError && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="text-xs text-rose-600 dark:text-rose-400 font-bold text-center
                             bg-rose-500/10 border border-rose-500/30
                             rounded-2xl p-2"
                >
                  {formError}
                </div>
              )}
            </div>
          </div>
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
        className="block text-[11px] uppercase tracking-widest font-extrabold text-[#8A6D4B] dark:text-slate-400"
      >
        {label}
      </label>
      {children}
      {error && (
        <p
          id={htmlFor ? `${htmlFor}-error` : undefined}
          role="alert"
          aria-live="polite"
          className="text-[12px] font-semibold text-rose-600 dark:text-rose-400 leading-tight pl-0.5"
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
            className={`text-left rounded-2xl p-3 border-2 min-h-[64px]
                        active:scale-[0.98] transition-all duration-150 cursor-pointer
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${isActive
                          ? "bg-amber-50 dark:bg-amber-500/15 border-amber-500 dark:border-amber-400 text-slate-950 dark:text-amber-300 shadow-[0_4px_14px_rgba(245,158,11,0.25)] dark:shadow-[0_0_18px_rgba(245,158,11,0.25)]"
                          : "bg-[#FFF9EE] dark:bg-[#161D2B] border-[#EEDBCA] dark:border-slate-700/70 text-[#2B3550] dark:text-slate-200 hover:border-amber-400/60 dark:hover:border-slate-600 dark:hover:bg-[#1C2536]"}`}
          >
            <div className={`font-bold text-[13px] leading-tight ${isActive ? "text-slate-950 dark:text-amber-300" : "text-[#2B3550] dark:text-slate-200"}`}>
              {item.label}
            </div>
            <div className={`text-[10px] mt-1 leading-snug ${isActive ? "text-amber-900/90 dark:text-amber-200/90" : "text-[#8A6D4B] dark:text-slate-400"}`}>
              {item.blurb}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function UnoHouseRuleGrid({
  flags,
  onToggle,
}: {
  flags: Record<UnoHouseRuleKey, boolean>;
  onToggle: (id: UnoHouseRuleKey) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {UNO_HOUSE_RULES.map((rule) => {
        const isActive = flags[rule.id];
        return (
          <button
            key={rule.id}
            type="button"
            onClick={() => onToggle(rule.id)}
            aria-pressed={isActive}
            className={`text-left rounded-2xl p-3 border-2 min-h-[64px]
                        active:scale-[0.98] transition-all duration-150 cursor-pointer
                        ${isActive
                          ? "bg-amber-50 dark:bg-amber-500/15 border-amber-500 dark:border-amber-400 text-slate-950 dark:text-amber-300 shadow-[0_4px_14px_rgba(245,158,11,0.25)] dark:shadow-[0_0_18px_rgba(245,158,11,0.25)]"
                          : "bg-[#FFF9EE] dark:bg-[#161D2B] border-[#EEDBCA] dark:border-slate-700/70 text-[#2B3550] dark:text-slate-200 hover:border-amber-400/60 dark:hover:border-slate-600 dark:hover:bg-[#1C2536]"}`}
          >
            <div className={`font-bold text-[13px] leading-tight ${isActive ? "text-slate-950 dark:text-amber-300" : "text-[#2B3550] dark:text-slate-200"}`}>
              {rule.label}
            </div>
            <div className={`text-[10px] mt-1 leading-snug ${isActive ? "text-amber-900/90 dark:text-amber-200/90" : "text-[#8A6D4B] dark:text-slate-400"}`}>
              {rule.blurb}
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
      className={`rounded-2xl border-2 p-3.5 transition-colors duration-200
                  ${on
                    ? "border-amber-500 dark:border-amber-400/80 bg-amber-500/10 dark:bg-amber-500/10"
                    : "border-[#EEDBCA] dark:border-slate-700/70 bg-[#FFF9EE] dark:bg-[#161D2B]"}`}
    >
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={on}
          onChange={onToggle}
          className="mt-0.5 w-5 h-5 accent-amber-500 rounded cursor-pointer"
          aria-label="Toggle Pass and Play mode"
        />
        <span className="flex-1 min-w-0">
          <span className="block font-bold text-[#2B3550] dark:text-slate-100 text-[14px] leading-tight">
            Pass &amp; Play (1 device)
          </span>
          <span className="block text-[11px] text-[#8A6D4B] dark:text-slate-400 mt-0.5">
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
                className="flex-1 min-h-[42px] px-3.5 rounded-xl
                           bg-white dark:bg-[#0B0F19] border-2 border-[#EEDBCA] dark:border-slate-700
                           text-[#2B3550] dark:text-slate-100 placeholder-[#B0A090] dark:placeholder:text-slate-500
                           font-semibold text-[13px]
                           focus:outline-none focus:border-amber-500 dark:focus:border-amber-400
                           focus:ring-2 focus:ring-amber-400/20 dark:focus:ring-amber-500/20
                           transition-all duration-200"
                aria-label={`Name for player ${i + 2}`}
              />
              {names.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSlot(i)}
                  aria-label={`Remove player ${i + 2}`}
                  className="w-9 h-9 rounded-full inline-flex items-center justify-center
                             bg-[#FFF4E0] dark:bg-[#1E2738] text-[#2B3550] dark:text-slate-200
                             hover:bg-[#EEDCC2] dark:hover:bg-[#2A374F] active:scale-95 cursor-pointer
                             focus:outline-none focus:ring-2 focus:ring-amber-500
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
              className="w-full min-h-[38px] rounded-xl border-2 border-dashed
                         border-amber-500/50 dark:border-amber-400/50 text-[#8A6D4B] dark:text-amber-300
                         text-[12px] font-bold hover:bg-amber-500/10
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

