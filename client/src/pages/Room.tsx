import { useEffect, useMemo, useRef, useState , useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { generateActionId, getSocket } from "../lib/socket";
import { logConn } from "../lib/connectionLog";
import { useRoomStore } from "../store/roomStore";
import { currentAccessToken, currentAccountKind, useAuthStore } from "../store/authStore";
import {
  enterFullscreen,
  exitFullscreen,
  isFullscreenActive,
  isFullscreenSupported,
} from "../lib/fullscreen";
import { HapticsManager } from "../services/HapticsManager";
import PlayerList from "../components/PlayerList";
import SeatAvatar from "../components/profile/SeatAvatar";
import Chat from "../components/Chat";
import ChatMessageToast from "../components/ChatMessageToast";
import RoomCode from "../components/RoomCode";
import RoomCodeShare from "../components/RoomCodeShare";
import RoomNameEditor from "../components/RoomNameEditor";
import AppLayout from "../components/layout/AppLayout";
import RummyRoomHistory from "../components/nostalgia/RummyRoomHistory";
import RematchPanel from "../components/RematchPanel";
import BoardPreviewPill from "../components/BoardPreviewPill";
import GameOverScreen, { AUTO_LEAVE_MS } from "../components/GameOverScreen";
import PassPhoneGate from "../components/PassPhoneGate";
import VoicePanel from "../components/VoicePanel";
import { destroyVoiceSession, useVoiceRoster } from "../lib/voice-session";
import SoundboardLayer from "../components/SoundboardLayer";
import SignInWall from "../components/auth/SignInWall";
import LudoColorPicker from "../components/LudoColorPicker";
import CoinColorPicker from "../components/CoinColorPicker";
import RpsBoard from "../games/rps/RpsBoard";
import RummyBoard from "../games/rummy/RummyBoard";
import LudoBoard from "../games/ludo/LudoBoard";
import SnlBoard from "../games/snl/SnlBoard";
import HandCricketBoard from "../games/handcricket/HandCricketBoard";
import UnoBoard from "../games/uno/UnoBoard";
import type { GameKind, Player, RpsState, RummyPlayerState, LudoState, SnlState, HcState, UnoPlayerState, WordBuildingPublicState, DotsBoxesPublicState, BotDifficulty } from "@shared/types";
import WordBuildingBoard from "../games/wordbuilding/WordBuildingBoard";
import DotsBoxesBoard from "../games/dotsboxes/DotsBoxesBoard";
import StarBoard from "../games/stargame/StarBoard";
import type { StarPlayerView, NamePlaceAnimalPlayerState, TambolaPlayerState } from "@shared/types";
import BingoBoard from "../games/bingo/BingoBoard";
import type { BingoPlayerState } from "@shared/types";
import NamePlaceAnimalBoard from "../games/namesplaceanimal/NamePlaceAnimalBoard";
import TambolaBoard from "../games/tambola/TambolaBoard";
import SnakeBoard from "../games/snake/SnakeBoard";
import CarromBoard from "../games/carrom/CarromBoard";
import ChessBoard from "../games/chess/ChessBoard";
import SpaceWarBoard from "../games/spacewar/SpaceWarBoard";
import GameErrorBoundary from "../components/GameErrorBoundary";
import type { SnakePublicState, CarromPublicState, ChessPublicState, SpaceWarPublicState } from "@shared/types";

/**
 * Bot-control max-seat lookup. Mirrors the server-side getGameLimits map so
 * the "X seats left" pill in BotControls knows when the table is full per
 * game type. Keep in sync with server/src/games/registry.ts.
 */
const MAX_PLAYERS_BY_GAME: Record<GameKind, number> = {
  rps: 2,
  rummy: 6,
  ludo: 8,
  snl: 10,
  handcricket: 2,
  uno: 8,
  wordbuilding: 4,
  dotsboxes: 6,
  stargame: 8,
  bingo: 8,
  namesplaceanimal: 8,
  tambola: 8,
  snake: 4,
  carrom: 2,
  roadrash: 4,
  chess: 2,
  blockblast: 8,
  spacewar: 1,
};

/**
 * Floating toast for warnings/errors that mustn't reshape the page. Sits at the
 * top-center of the viewport with a close button. z-40 keeps it above the felt
 * (which is z-0) but below modal panels (z-50) so opening a modal still wins.
 */
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-40 max-w-md w-[calc(100%-1.5rem)] pointer-events-auto">
      <div
        className="rounded-lg px-3 py-2 flex items-center gap-3 shadow-2xl"
        style={{
          background: "linear-gradient(180deg, #7f1d1d 0%, #450a0a 100%)",
          border: "1px solid #b91c1c",
          color: "#fee2e2",
        }}
      >
        <span className="text-amber-300 text-base flex-shrink-0">⚠</span>
        <span className="text-xs sm:text-sm font-semibold flex-1 break-words">
          {message}
        </span>
        <button
          onClick={onClose}
          aria-label="Dismiss"
          className="w-6 h-6 rounded-full flex items-center justify-center bg-rose-950 hover:bg-rose-900 text-rose-200 font-extrabold flex-shrink-0"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

const GAME_DISPLAY_NAMES: Record<GameKind, string> = {
  chess: "CHESS ♟",
  rummy: "RUMMY 🃏",
  ludo: "LUDO 🎲",
  snl: "SNAKES & LADDERS 🐍",
  handcricket: "HAND CRICKET 🏏",
  rps: "ROCK PAPER SCISSORS ✂️",
  uno: "UNO 🎴",
  wordbuilding: "WORD BUILDING 🔤",
  dotsboxes: "DOTS & BOXES ⚄",
  stargame: "STAR GAME ⭐",
  bingo: "BINGO 🎱",
  namesplaceanimal: "NAME PLACE ANIMAL 🐾",
  tambola: "TAMBOLA 🎟️",
  snake: "SNAKE 🐍",
  roadrash: "ROAD RASH 🏍️",
  carrom: "CARROM 🎯",
  blockblast: "BLOCK BLAST 🧱",
  spacewar: "SPACE WAR 🚀",
};

function BotControls({
  players,
  maxPlayers,
  game,
}: {
  players: Player[];
  maxPlayers: number;
  game: GameKind;
}) {
  const NO_BOT_GAMES: ReadonlySet<GameKind> = new Set<GameKind>([
    "spacewar"
  ]);
  if (NO_BOT_GAMES.has(game)) {
    return null;
  }

  const [botName, setBotName] = useState("");
  const [bingoDifficulty, setBingoDifficulty] = useState<BotDifficulty>("medium");
  function addBot() {
    getSocket().emit(
      "room:addBot",
      botName.trim() || undefined,
      game === "bingo" ? bingoDifficulty : undefined,
    );
    setBotName("");
  }
  function removeBot(id: string) {
    getSocket().emit("room:removeBot", id);
  }
  const bots = players.filter((p) => p.isBot);
  const seatsLeft = Math.max(0, maxPlayers - players.length);
  const atCapacity = seatsLeft <= 0;
  return (
    <div className="bg-gradient-to-b from-[#FFF9EE] to-[#FFF4E0] dark:from-[#182234] dark:to-[#121927] border border-[#EEDBCA] dark:border-slate-700/70 rounded-2xl p-3 text-left space-y-2.5 shadow-xs">
      <div className="flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-wider text-[#8A6D4B] dark:text-slate-400 font-extrabold flex items-center gap-1.5">
          <span aria-hidden>🤖</span>
          <span>BOT PLAYERS • {atCapacity ? `TABLE FULL (${bots.length})` : `${seatsLeft} SEAT${seatsLeft === 1 ? "" : "S"} LEFT`}</span>
        </h3>
        {atCapacity && (
          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
            All seats filled
          </span>
        )}
      </div>
      {game === "bingo" && (
        <div className="flex items-center gap-1.5">
          {(["easy", "medium", "hard"] as BotDifficulty[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setBingoDifficulty(d)}
              disabled={atCapacity}
              className={`text-[11px] px-2.5 py-1 rounded-full font-semibold capitalize border transition ${
                bingoDifficulty === d
                  ? "bg-[#EA5A1F] border-[#EA5A1F] text-white"
                  : "bg-white dark:bg-slate-800 border-[#EEDBCA] dark:border-slate-700 text-[#796651] dark:text-slate-300"
              } disabled:opacity-50`}
            >
              {d}
            </button>
          ))}
        </div>
      )}
      {!atCapacity && (
        <div className="flex items-center gap-2 w-full">
          <input
            type="text"
            value={botName}
            onChange={(e) => setBotName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !atCapacity) addBot(); }}
            placeholder="Bot nickname (optional)"
            maxLength={20}
            className="flex-1 min-w-0 text-xs px-3.5 py-2.5 rounded-xl border border-[#EEDBCA] dark:border-slate-700 bg-white dark:bg-[#0F1420] text-[#2B3550] dark:text-slate-100 placeholder-[#B0B0B0]"
          />
          <button
            type="button"
            onClick={addBot}
            className="inline-flex shrink-0 whitespace-nowrap items-center justify-center gap-1.5 text-xs px-4 py-2.5 rounded-xl font-extrabold bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white transition"
            title="Add a bot to the table"
          >
            <span>+</span>
            <span>Add Bot</span>
          </button>
        </div>
      )}
      {bots.length === 0 ? (
        <div className="text-[11px] text-[#8A6D4B] dark:text-slate-400 text-center py-1 font-medium italic">
          No bots added. Play with friends or add bots to practice.
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {bots.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-1.5 bg-white dark:bg-[#1E2738] border border-[#EEDBCA] dark:border-slate-700 rounded-full px-2.5 py-1 text-xs text-[#2B3550] dark:text-slate-200 shadow-xs"
            >
              <span className="text-xs">🤖</span>
              <span className="font-semibold">{b.name}</span>
              <button
                type="button"
                onClick={() => removeBot(b.id)}
                className="text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 ml-1 font-bold cursor-pointer text-xs"
                title="Remove bot"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
/** Scorecard is shown for 90 s after a game ends; GameOverScreen follows. */
const SCORECARD_WINDOW_MS = 90_000;
/** Games that render their own end-of-round scorecard modal and call back
 *  via onScorecardClose. GenericScorecardModal is suppressed for these. */
const GAMES_WITH_OWN_SCORECARD: ReadonlySet<string> = new Set(["rummy", "rps", "handcricket", "uno", "bingo", "ludo", "dotsboxes"]);

/**
 * Games whose boards own the entire viewport during play.
 *
 * These shells size themselves with `h-full` and expect a parent that is
 * exactly the visible viewport with no padding. Anything NOT listed here gets
 * the normal padded, max-width page instead.
 *
 * This used to be two separate inline lists, one for the outer wrapper and
 * one for the inner. Carrom and Chess were added to neither, so their boards
 * asked for `h-screen` inside a container that already had `p-2 sm:p-4` — the
 * page then overflowed by exactly the padding, and `overflow-hidden` on the
 * board clipped whatever fell off the bottom. One list means the next
 * full-bleed game cannot be half-registered.
 */
const FULL_BLEED_GAMES: ReadonlySet<string> = new Set([
  "rummy",
  "dotsboxes",
  "uno",
  "stargame",
  "carrom",
  "chess",
]);

export default function Room() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const {
    playerId,
    playerName,
    roomState,
    gameState,
    messages,
    lastError,
    rematch,
    setPlayerId,
    setPlayerName,
    rememberSeat,
    seatFor,
    setRoomState,
    setGameState,
    addMessage,
    setError,
    setRematch,
    recordLastGang,
    reset,
  } = useRoomStore();

  const isMember = useAuthStore((s) => s.isMember);

  /**
   * Has this player announced themselves at THIS table?
   *
   * A guest walking into someone else's room says who they are before they
   * are in it — the room is not theirs, and "Player" turning up unannounced
   * in a friend's game is the thing this prevents. A stored name is a
   * starting point, not a substitute: it is prefilled and one tap confirms
   * it.
   *
   * Seeded from whether a seat credential for this code already exists,
   * which is the honest signal for "I have been here before". It covers the
   * two cases that must NOT re-prompt: a refresh mid-match, and the guest's
   * own solo table, whose seat was stored at creation. Computed once in the
   * initialiser rather than watched, so the `rememberSeat` that lands
   * moments later cannot retroactively dismiss the gate the player is
   * currently typing into.
   */
  const [declaredHere, setDeclaredHere] = useState(() =>
    code ? useRoomStore.getState().seatFor(code) !== null : true,
  );
  const mustDeclare = !isMember && !declaredHere;

  // "Last gang" memory (docs/rummy/roadmap.md A.5) — once the host names a
  // Rummy table, remember who was at it so the home screen can offer a
  // one-tap WhatsApp re-invite next time. Keyed on the name itself so
  // re-fires only when it's actually set/changed, not on every roster tick.
  useEffect(() => {
    if (roomState?.game !== "rummy" || !roomState.name || !playerId) return;
    const others = roomState.players
      .filter((p) => p.id !== playerId && !p.isBot)
      .map((p) => p.name);
    if (others.length === 0) return;
    recordLastGang(roomState.name, others);
  }, [roomState?.game, roomState?.name, playerId, recordLastGang]);

  // Voice roster. Fed from here — mounted for the whole room session —
  // rather than from <VoicePanel>, which every call site renders behind a
  // tab or a drawer. Peers reconcile while the panel is closed, so someone
  // joining mid-game is pulled into the call instead of waiting for a
  // player to happen to open the voice tab.
  useVoiceRoster(roomState?.players, playerId);

  // Leaving the room by any route (Leave button, back navigation, a route
  // change) must release the microphone. Without this the mic indicator
  // stays lit after the player is long gone.
  useEffect(() => destroyVoiceSession, []);

  // The join effect used to mirror `playerId` into a ref so a reconnect that
  // fired after the first join resolved would rejoin with the REAL id instead
  // of the stale null it closed over. `seatFor(code)` reads live store state
  // through zustand's `get()`, so it is never stale and the ref is gone.

  // Blocks overlapping room:join emits before the first ack returns. Both
  // StrictMode's double-invoked effect and the connect-event rejoin racing
  // the synchronous initial join would otherwise each mint a duplicate player.
  const joinInFlightRef = useRef(false);

  /**
   * Live socket health, purely for the banner below.
   *
   * A dropped connection used to be completely silent: the board simply
   * stopped responding, with nothing on screen to say whether the game had
   * frozen, the phone was offline, or the app had crashed. The socket now
   * retries forever (see lib/socket.ts), so the honest thing to show is that
   * it is still trying.
   */
  const [linkDown, setLinkDown] = useState(false);
  /** Reconnect attempts since the link dropped. Shown so a stuck client is
   *  distinguishable from one that is trying and being refused. */
  const [linkAttempts, setLinkAttempts] = useState(0);

  useEffect(() => {
    if (!code) {
      navigate("/");
      return;
    }
    // Anyone arriving via a shared link or a fresh browser has no playerName
    // in their local store. We can NOT silently bounce them to home — they
    // came here on purpose. Render a name-entry block instead (see early
    // return below). They'll come back through this effect once they submit.
    if (!playerName) return;
    // A guest who has not yet announced themselves at this table must not be
    // seated by the effect behind the gate they are still looking at.
    if (mustDeclare) return;
    const socket = getSocket();
    const joinName = playerName;
    const joinCode = code;

    function attemptJoin(reason: "initial" | "reconnect"): void {
      // Drop overlapping joins until the first ack settles (or a disconnect
      // clears the flag). Reads the live id off the ref so a reconnect that
      // lands after the initial join resolved reclaims the seat instead of
      // joining as a brand-new ghost.
      if (joinInFlightRef.current) return;
      joinInFlightRef.current = true;
      // The credential for THIS room, not whatever id happens to be current.
      // A seat token only reclaims the room it was issued for.
      const seat = seatFor(joinCode);
      logConn("rejoin_send", `${reason} code=${joinCode} hadSeat=${!!seat}`);
      socket.emit(
        "room:join",
        {
          name: joinName,
          code: joinCode,
          playerId: seat?.playerId,
          seatToken: seat?.seatToken,
          // Carried on the rejoin too: someone may have changed their avatar
          // on another tab while this one was reconnecting.
          avatar: useRoomStore.getState().avatarId ?? undefined,
          // Read live for the same reason as the avatar above — a rejoin that
          // lands after signing in should arrive as a member.
          accountKind: currentAccountKind(),
          accessToken: currentAccessToken(),
        },
        (res) => {
          joinInFlightRef.current = false;
          // The decisive line: did the socket come back but the ROOM was
          // gone? That is a completely different failure from never
          // reconnecting, and the two are indistinguishable from the banner.
          logConn(
            "rejoin_ack",
            `${reason} ok=${res.ok}${res.ok ? "" : ` error=${res.error ?? "?"}`}`,
          );
          if (!res.ok) {
            // The room genuinely no longer exists on the server. This happens
            // when: the server cold-started (Render free tier sleeps after
            // 15min idle and wipes in-memory rooms), the host left and the
            // 90s grace timer fired, or the player was kicked. There's no
            // automatic recovery — they need a fresh code from a friend. We
            // show a 4-second toast (used to be 1.6s, which was a confusing
            // flash) so they actually have time to read the explanation
            // before the redirect.
            const msg =
              res.error === "Room not found"
                ? reason === "reconnect"
                  ? "This room is no longer active. The host may have left or the server restarted. Ask for a fresh code."
                  : "This room is no longer active. The host may have left or the server restarted. Ask for a fresh code."
                : res.error ?? "Could not join room";
            setError(msg);
            reset();
            setTimeout(() => navigate("/"), 4000);
            return;
          }
          if (res.playerId) setPlayerId(res.playerId);
          if (res.playerId && res.seatToken) {
            rememberSeat(joinCode, res.playerId, res.seatToken);
          }
        }
      );
    }

    if (!roomState) attemptJoin("initial");

    const onConnect = () => {
      setLinkDown(false);
      setLinkAttempts(0);
      // Socket reconnect after a disconnect or server restart — re-attach to our room.
      attemptJoin("reconnect");
    };
    const onDisconnect = () => {
      setLinkDown(true);
      setLinkAttempts(0);
      // A drop abandons any in-flight join ack (socket.io won't call it), so
      // clear the guard here — otherwise the reconnect rejoin above is blocked
      // forever and the player is stranded on a dead seat.
      joinInFlightRef.current = false;
    };
    // Count retries so the banner can say whether anything is happening.
    // "Reconnecting" that never increments means the client gave up; one that
    // climbs while nothing changes means the server is refusing or asleep.
    const onAttempt = () => setLinkAttempts((n) => n + 1);
    socket.io.on("reconnect_attempt", onAttempt);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("room:state", setRoomState);
    socket.on("game:state", setGameState);
    socket.on("chat:message", addMessage);
    socket.on("room:error", setError);
    socket.on("game:error", setError);
    socket.on("rematch:state", setRematch);

    return () => {
      socket.io.off("reconnect_attempt", onAttempt);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room:state", setRoomState);
      socket.off("game:state", setGameState);
      socket.off("chat:message", addMessage);
      socket.off("room:error", setError);
      socket.off("game:error", setError);
      socket.off("rematch:state", setRematch);
      // Belt-and-suspenders fullscreen exit: leaveRoom() already calls this,
      // but the user can navigate away via browser back / tab close without
      // ever clicking Leave. Drop fullscreen here too so they don't end up
      // on the BHALYAM home page with the browser still in fullscreen mode.
      if (isFullscreenActive()) void exitFullscreen();
    };
    // `playerName` is in the deps because shared-link visitors arrive with an
    // empty name in the store and submit it via NameEntryForRoom. Without
    // re-running on that transition the effect early-returns once, never
    // registers socket listeners, and the join button appears to hang until
    // the user reloads (which seeds playerName from localStorage on mount).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, playerName]);

  /**
   * One stable `game:move` sender.
   *
   * The boards are memoized, and an inline arrow prop would defeat that
   * instantly — a new function identity every render is a new prop, so the
   * board would re-render on every broadcast anyway.
   */
  const sendMove = useCallback((type: string, data?: unknown) => {
    getSocket().emit("game:move", { type, data, actionId: generateActionId() });
  }, []);

  // Snap to top once roomState lands — the page renders a slim "Connecting…"
  // shell first and then expands to the full lobby card, which can leave the
  // user scrolled past the header if their previous page was tall. Pair with
  // App-level scrollRestoration=manual and route-change scrollTo.
  const didInitialScrollRef = useRef(false);
  useEffect(() => {
    if (didInitialScrollRef.current) return;
    if (!roomState) return;
    didInitialScrollRef.current = true;
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      requestAnimationFrame(() =>
        window.scrollTo({ top: 0, left: 0, behavior: "auto" }),
      );
    } catch {
      // ignore
    }
  }, [roomState]);

  // Detect the lobby → playing transition. Two things happen here:
  //   1. For Rummy and UNO, stash a sessionStorage flag the board reads
  //      exactly once on mount as the single source of truth for whether
  //      to play the shuffle + deal opener.
  //   2. For ALL games, fire a "game start" haptic so the host (and every
  //      other player) feels a confirmation buzz the moment dealing
  //      begins. Mirrors the audio cue but works in silent mode.
  const prevRoomPhaseRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const prev = prevRoomPhaseRef.current;
    const next = roomState?.phase;
    if (next === "playing" && prev === "lobby") {
      try {
        HapticsManager.getInstance().gameStart();
      } catch {
        // navigator.vibrate may throw on some platforms; ignore.
      }
      if (roomState?.game === "rummy" && code) {
        try {
          window.sessionStorage.setItem(`bhalyam.rummy.justStarted.${code}`, "1");
        } catch {
          // sessionStorage may throw in private mode — board will silently
          // skip the animation, which is the safer default.
        }
      }
      if (roomState?.game === "uno" && code) {
        try {
          window.sessionStorage.setItem(`bhalyam.uno.justStarted.${code}`, "1");
        } catch {
          // sessionStorage may throw in private mode — board will silently
          // skip the animation, which is the safer default.
        }
      }
    }
    prevRoomPhaseRef.current = next;
  }, [roomState?.phase, roomState?.game, code]);

  const selfIsHost = useMemo(
    () => roomState?.hostId === playerId,
    [roomState?.hostId, playerId]
  );

  // Solo games bypass lobby — if the host lands in lobby for a solo game, auto-start immediately.
  useEffect(() => {
    if (!roomState || roomState.phase !== "lobby" || !selfIsHost) return;
    const isSolo = ["snake", "spacewar"].includes(roomState.game);
    if (isSolo) {
      getSocket().emit("room:setReady", true);
      getSocket().emit("room:startGame");
    }
  }, [roomState?.phase, roomState?.game, selfIsHost]);

  const selfPlayer = useMemo(
    () => roomState?.players.find((p) => p.id === playerId) ?? null,
    [roomState?.players, playerId]
  );

  /**
   * "I'm back" — reclaim your seat the moment you touch anything.
   *
   * While the server is auto-playing a seat, the player has almost no way to
   * prove they have returned. Tapping a gated control (the dice on someone
   * else's turn) emits nothing at all, and by the time their own turn comes
   * round the auto-player resolves it in a few hundred milliseconds — far
   * faster than someone still re-reading the board. The seat stayed on
   * autopilot for the rest of the match.
   *
   * Mounted on the room shell so every game gets it, and armed ONLY while the
   * flag is set, so there is no listener and no traffic in the normal case.
   * Capture phase, because a gated control may stop propagation before a
   * bubbling listener would ever see the tap.
   */
  const selfIsAutoPlaying = selfPlayer?.isAutoPlaying === true;
  useEffect(() => {
    if (!selfIsAutoPlaying) return;
    let lastSent = 0;
    const wake = () => {
      // One ping per second is plenty: the server clears the flag on the
      // first one, and this unmounts as soon as that lands.
      const now = Date.now();
      if (now - lastSent < 1000) return;
      lastSent = now;
      try {
        getSocket().emit("room:awake");
      } catch {
        /* socket down — the reconnect path will clear the seat instead */
      }
    };
    const opts = { capture: true, passive: true } as const;
    window.addEventListener("pointerdown", wake, opts);
    window.addEventListener("keydown", wake, opts);
    return () => {
      window.removeEventListener("pointerdown", wake, opts);
      window.removeEventListener("keydown", wake, opts);
    };
  }, [selfIsAutoPlaying]);

  /**
   * Every game auto-enters fullscreen at the moment the room transitions
   * from "lobby" to "playing".
   *
   * Rummy is a landscape-only table, so we force the device into landscape
   * via the Screen Orientation lock — this rotates the phone regardless of
   * the user's auto-rotate setting (the lock works once fullscreen is active
   * on Android Chrome). The rotate-device prompt in the Rummy board stays as
   * the fallback for browsers that reject the lock (notably iOS Safari).
   *
   * Every other game stays "any" so the board simply follows the phone's own
   * rotation; their responsive layouts (Ludo/SnL at any aspect ratio) handle
   * the UX. The fullscreen call still fires so the address/nav bars disappear.
   */
  function orientationForGame(game: GameKind | undefined): "landscape" | "portrait" | "any" {
    if (game === "rummy") return "landscape";
    return "any";
  }

  function maybeEnterFullscreenForGame() {
    if (!roomState?.game) return;
    if (!isFullscreenSupported() || isFullscreenActive()) return;
    void enterFullscreen(orientationForGame(roomState.game));
  }

  // Watch for the lobby → playing transition and request fullscreen at
  // that moment. `prevPhaseForFullscreenRef` survives the StrictMode
  // double-mount and ensures we only attempt once per actual transition.
  const prevPhaseForFullscreenRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const prev = prevPhaseForFullscreenRef.current;
    if (prev === "lobby" && roomState?.phase === "playing" && roomState?.game) {
      maybeEnterFullscreenForGame();
    }
    prevPhaseForFullscreenRef.current = roomState?.phase;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomState?.phase, roomState?.game]);

  /* ─── Scorecard + GameOverScreen state ───────────────────────────────────
   * Flow for ALL games after phase → "finished":
   *   1. Scorecard shows for up to 90 s (GenericScorecardModal for games
   *      without their own, or the board's own modal for rummy/rps/hc).
   *   2. On dismiss (user or 90 s auto-fire) → GameOverScreen for 100 s.
   * A rematch (phase → "playing") cancels all timers and resets both states.
   * ───────────────────────────────────────────────────────────────�[...]