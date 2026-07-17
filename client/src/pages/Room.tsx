import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSocket } from "../lib/socket";
import { useRoomStore } from "../store/roomStore";
import {
  enterFullscreen,
  exitFullscreen,
  isFullscreenActive,
  isFullscreenSupported,
} from "../lib/fullscreen";
import { HapticsManager } from "../services/HapticsManager";
import PlayerList from "../components/PlayerList";
import Chat from "../components/Chat";
import ChatMessageToast from "../components/ChatMessageToast";
import RoomCode from "../components/RoomCode";
import RoomCodeShare from "../components/RoomCodeShare";
import RoomNameEditor from "../components/RoomNameEditor";
import RummyRoomHistory from "../components/nostalgia/RummyRoomHistory";
import RematchPanel from "../components/RematchPanel";
import GameOverScreen, { AUTO_LEAVE_MS } from "../components/GameOverScreen";
import PassPhoneGate from "../components/PassPhoneGate";
import VoicePanel from "../components/VoicePanel";
import LudoColorPicker from "../components/LudoColorPicker";
import CoinColorPicker from "../components/CoinColorPicker";
import RpsBoard from "../games/rps/RpsBoard";
import RummyBoard from "../games/rummy/RummyBoard";
import LudoBoard from "../games/ludo/LudoBoard";
import SnlBoard from "../games/snl/SnlBoard";
import HandCricketBoard from "../games/handcricket/HandCricketBoard";
import UnoBoard from "../games/uno/UnoBoard";
import type { GameKind, RpsState, RummyPlayerState, LudoState, SnlState, HcState, UnoPlayerState, WordBuildingPublicState, DotsBoxesPublicState, MemoryMatchPublicState } from "@shared/types";
import WordBuildingBoard from "../games/wordbuilding/WordBuildingBoard";
import DotsBoxesBoard from "../games/dotsboxes/DotsBoxesBoard";
import MemoryMatchBoard from "../games/memorymatch/MemoryMatchBoard";
import StarBoard from "../games/stargame/StarBoard";
import type { StarPlayerView } from "@shared/types";

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
  dotsboxes: 4,
  memorymatch: 4,
  stargame: 8,
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

function BotControls({
  players,
  maxPlayers,
}: {
  players: import("@shared/types").Player[];
  maxPlayers: number;
}) {
  function addBot() {
    getSocket().emit("room:addBot");
  }
  function removeBot(id: string) {
    getSocket().emit("room:removeBot", id);
  }
  const bots = players.filter((p) => p.isBot);
  const seatsLeft = Math.max(0, maxPlayers - players.length);
  const atCapacity = seatsLeft <= 0;
  return (
    <div className="bg-[#F6ECDA] border border-[#E7D6BC] rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-wider text-[#796651]">
          Bots {atCapacity ? "· table full" : `· ${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} left`}
        </h3>
        <button
          onClick={addBot}
          disabled={atCapacity}
          className={`text-xs px-3 py-1 rounded font-bold transition ${
            atCapacity
              ? "bg-[#D9CDB8] text-[#8D7B66] cursor-not-allowed"
              : "bg-[#31A157] hover:bg-[#2A8B4B] text-white"
          }`}
          title={atCapacity ? "Table is full — remove a bot first" : "Add a bot"}
        >
          + Add bot
        </button>
      </div>
      {bots.length === 0 ? (
        <div className="text-xs text-[#8D7B66] italic">
          No bots yet. Add one to practice against AI.
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {bots.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-1.5 bg-[#F1E5D1] border border-[#E1CFB1] rounded-full px-2.5 py-1 text-xs"
            >
              <span>🤖</span>
              <span className="text-[#3B2F26] font-semibold">{b.name}</span>
              <button
                onClick={() => removeBot(b.id)}
                className="text-rose-700 hover:text-rose-600 ml-1"
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
const GAMES_WITH_OWN_SCORECARD: ReadonlySet<string> = new Set(["rummy", "rps", "handcricket", "uno"]);

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
    setRoomState,
    setGameState,
    addMessage,
    setError,
    setRematch,
    recordLastGang,
    reset,
  } = useRoomStore();

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

  // Keeps the latest playerId reachable from inside the join effect's closure
  // without re-subscribing socket listeners on every id change. A reconnect
  // that fires after the first join resolved must rejoin with the REAL id
  // (reclaim the seat) rather than the stale null it closed over (a ghost).
  const playerIdRef = useRef(playerId);
  playerIdRef.current = playerId;

  // Blocks overlapping room:join emits before the first ack returns. Both
  // StrictMode's double-invoked effect and the connect-event rejoin racing
  // the synchronous initial join would otherwise each mint a duplicate player.
  const joinInFlightRef = useRef(false);

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
      socket.emit(
        "room:join",
        { name: joinName, code: joinCode, playerId: playerIdRef.current ?? undefined },
        (res) => {
          joinInFlightRef.current = false;
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
        }
      );
    }

    if (!roomState) attemptJoin("initial");

    const onConnect = () => {
      // Socket reconnect after a disconnect or server restart — re-attach to our room.
      attemptJoin("reconnect");
    };
    const onDisconnect = () => {
      // A drop abandons any in-flight join ack (socket.io won't call it), so
      // clear the guard here — otherwise the reconnect rejoin above is blocked
      // forever and the player is stranded on a dead seat.
      joinInFlightRef.current = false;
    };
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("room:state", setRoomState);
    socket.on("game:state", setGameState);
    socket.on("chat:message", addMessage);
    socket.on("room:error", setError);
    socket.on("game:error", setError);
    socket.on("rematch:state", setRematch);

    return () => {
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

  const selfPlayer = useMemo(
    () => roomState?.players.find((p) => p.id === playerId) ?? null,
    [roomState?.players, playerId]
  );

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
   * ─────────────────────────────────────────────────────────────────────── */
  const [showGameOver, setShowGameOver] = useState(false);
  const gameOverDeadlineMsRef = useRef<number | null>(null);
  const [gameOverDeadlineMs, setGameOverDeadlineMs] = useState<number>(0);

  const [showScorecard, setShowScorecard] = useState(false);
  const [scorecardDeadlineMs, setScorecardDeadlineMs] = useState<number>(0);
  const scorecardTimerRef = useRef<number | null>(null);

  /** Dismiss the scorecard and show GameOverScreen. Idempotent. */
  function triggerGameOver() {
    if (showGameOver) return;
    if (scorecardTimerRef.current != null) {
      window.clearTimeout(scorecardTimerRef.current);
      scorecardTimerRef.current = null;
    }
    setShowScorecard(false);
    const deadline = Date.now() + AUTO_LEAVE_MS;
    gameOverDeadlineMsRef.current = deadline;
    setGameOverDeadlineMs(deadline);
    setShowGameOver(true);
  }

  const prevPhaseForGameOverRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const prev = prevPhaseForGameOverRef.current;
    const next = roomState?.phase;
    prevPhaseForGameOverRef.current = next;

    if (next === "playing") {
      // Rematch / next pool round — reset everything.
      setShowGameOver(false);
      setShowScorecard(false);
      if (scorecardTimerRef.current != null) {
        window.clearTimeout(scorecardTimerRef.current);
        scorecardTimerRef.current = null;
      }
      gameOverDeadlineMsRef.current = null;
      return;
    }
    if (next === "finished" && prev !== "finished") {
      // Start 90 s scorecard window for all games.
      // Games with own scorecards (rummy/rps/hc) call onScorecardClose →
      // triggerGameOver() which clears this timer early.
      const deadline = Date.now() + SCORECARD_WINDOW_MS;
      setScorecardDeadlineMs(deadline);
      setShowScorecard(true);
      scorecardTimerRef.current = window.setTimeout(
        () => { triggerGameOver(); },
        SCORECARD_WINDOW_MS,
      ) as unknown as number;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomState?.phase, roomState?.game]);


  function toggleReady() {
    // No fullscreen on Ready — the trigger lives on the phase transition.
    getSocket().emit("room:setReady", !selfPlayer?.isReady);
  }

  function startGame() {
    // Fire fullscreen synchronously inside the click handler so the
    // request lands within the browser's user-activation window
    // (~1 s on Chrome). The phase-transition effect above is a fallback
    // for slow servers — Rummy in particular often missed the window
    // because the deal/shuffle path adds a sessionStorage write that
    // delays the lobby→playing render.
    if (roomState?.game) {
      maybeEnterFullscreenForGame();
    }
    getSocket().emit("room:startGame");
  }

  function leaveRoom() {
    if (isFullscreenActive()) void exitFullscreen();
    getSocket().emit("room:leave");
    reset();
    navigate("/");
  }

  // Shared-link / fresh-browser path: caller has a room code but we don't
  // know who they are yet. Ask for their name; persist it; the useEffect
  // above will then auto-attempt the join.
  if (!playerName) {
    return <NameEntryForRoom code={code ?? ""} onSubmit={setPlayerName} />;
  }

  if (!roomState) {
    return <ConnectingScreen code={code} />;
  }

  const canStart =
    selfIsHost &&
    roomState.phase === "lobby" &&
    roomState.players.length >= 2 &&
    roomState.players.every((p) => p.isReady);

  /* ─── GameOverScreen meta ───────────────────────────────────────────
   * Derive the winner's display name and a friendly game title so
   * GameOverScreen can show "🏆 X won!" and "Rock Paper Scissors" etc.
   * Uses a loose duck-type on gameState (most engines include winnerId).
   * ──────────────────────────────────────────────────────────────── */
  const FRIENDLY_GAME_NAMES: Record<string, string> = {
    rps:          "Rock Paper Scissors",
    rummy:        "Rummy",
    ludo:         "Ludo",
    snl:          "Snakes & Ladders",
    handcricket:  "Hand Cricket",
    uno:          "UNO",
    wordbuilding: "Word Building",
    dotsboxes:    "Dots & Boxes",
    memorymatch:  "Memory Match",
    stargame:     "Star Game",
  };
  const gameOverGameName = roomState
    ? (FRIENDLY_GAME_NAMES[roomState.game] ?? roomState.game)
    : undefined;
  // Read winnerId from opaque gameState without an inline cast.
  // After "winnerId" in gameState the property exists but is `unknown`;
  // a typeof guard narrows it to string before use.
  const gameOverWinnerIdRaw =
    gameState && typeof gameState === "object" && "winnerId" in gameState
      ? gameState.winnerId
      : null;
  const gameOverWinnerId =
    typeof gameOverWinnerIdRaw === "string" ? gameOverWinnerIdRaw : null;
  const gameOverWinnerName = gameOverWinnerId
    ? (roomState?.players.find((p) => p.id === gameOverWinnerId)?.name ?? null)
    : null;

  return (
    <div
      className={
        (roomState.game === "rummy" || roomState.game === "dotsboxes" || roomState.game === "uno") && roomState.phase !== "lobby"
          ? "bhalyam-font bhalyam-paper h-dvh-safe overflow-hidden p-0"
          : "bhalyam-font bhalyam-paper min-h-screen p-2 sm:p-4"
      }
    >
      <div
        className={
          (roomState.game === "rummy" || roomState.game === "dotsboxes" || roomState.game === "uno") && roomState.phase !== "lobby"
            ? // No space-y here — the board fills the whole inner area
              // and any lastError banner overlays it via fixed positioning.
              "mx-auto h-full max-w-none"
            : "mx-auto space-y-3 sm:space-y-4 max-w-6xl"
        }
      >
        {/* Room header. Three shapes:
              1. Rummy/wordbuilding/dotsboxes/UNO in play: hidden entirely —
                 each of these renders its own full in-board header (room
                 code, Leave, etc.) instead.
              2. Any game during the lobby: full header with code + Leave.
              3. Every other game during play/finished: slim header — just
                 a right-aligned Leave button. The room code, players, voice
                 and chat have all moved into that game's own inline room
                 rail. */}
        {roomState.phase === "lobby" && (
          <header className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <RoomCode code={roomState.code} />
              <RoomNameEditor name={roomState.name} isHost={selfIsHost} />
              {roomState.game === "rummy" && (
                <RummyRoomHistory
                  variant="teaser"
                  density="mobile"
                  history={roomState.history}
                  champion={roomState.champion}
                  players={roomState.players}
                />
              )}
            </div>
            <div className="text-sm text-[#786350]">
              Game: <span className="text-[#2F3A54] font-semibold">{roomState.game.toUpperCase()}</span> ·
              Phase: <span className="text-[#2F3A54]">{roomState.phase}</span>
            </div>
            <button
              onClick={leaveRoom}
              className="text-sm bg-[#4A3F35] hover:bg-[#3F352C] text-[#FFF3E3] px-3 py-1.5 rounded"
            >
              Leave
            </button>
          </header>
        )}
        {roomState.phase !== "lobby" && roomState.game !== "rummy" && roomState.game !== "wordbuilding" && roomState.game !== "dotsboxes" && roomState.game !== "uno" && roomState.game !== "ludo" && (
          <header className="flex items-center justify-end">
            <button
              onClick={leaveRoom}
              className="text-sm bg-[#4A3F35] hover:bg-[#3F352C] text-[#FFF3E3] px-3 py-1.5 rounded"
            >
              Leave
            </button>
          </header>
        )}

        {/* Errors render inline for non-Rummy games and as a fixed toast for
            Rummy (whose felt is viewport-locked — inline banners would push the
            UI off-screen). The fixed toast sits above the felt (z-40) but below
            modal overlays (z-50). */}
        {lastError && !(roomState.game === "rummy" && roomState.phase !== "lobby") && (
          <div className="bg-[#FEE2E2] border border-[#FCA5A5] text-[#9F1239] rounded p-3 text-sm">
            {lastError}
            <button onClick={() => setError(null)} className="float-right">
              ✕
            </button>
          </div>
        )}
        {lastError && roomState.game === "rummy" && roomState.phase !== "lobby" && (
          <Toast message={lastError} onClose={() => setError(null)} />
        )}

        <div
          className={(() => {
            const fullPlay = (roomState.game === "rummy" || roomState.game === "dotsboxes" || roomState.game === "uno") && roomState.phase !== "lobby";
            const compactPlay = !fullPlay && roomState.phase !== "lobby";
            if (fullPlay) return "h-full";
            // Compact gameplay: the side rail collapses into the floating
            // right rail, so the board owns the full inner width.
            if (compactPlay) return "block";
            return "grid md:grid-cols-3 gap-4";
          })()}
        >
          <div
            className={(() => {
              const fullPlay = (roomState.game === "rummy" || roomState.game === "dotsboxes" || roomState.game === "uno") && roomState.phase !== "lobby";
              const compactPlay = !fullPlay && roomState.phase !== "lobby";
              if (fullPlay) return "h-full";
              if (compactPlay) return "w-full space-y-4";
              return "md:col-span-2 space-y-4";
            })()}
          >
            {roomState.phase === "lobby" && (
              <div className="bg-[#F6EDDB] border border-[#E8D8BE] rounded-xl p-6 text-center space-y-4">
                <RoomCodeShare code={roomState.code} game={roomState.game} name={roomState.name} />
                <div className="text-[#6E5E4D]">
                  Waiting for players to ready up.
                </div>
                {roomState.game === "ludo" && (
                  <LudoColorPicker players={roomState.players} selfId={playerId} />
                )}
                {roomState.game === "snl" && (
                  <CoinColorPicker players={roomState.players} selfId={playerId} />
                )}
                {selfIsHost && (
                  <BotControls
                    players={roomState.players}
                    maxPlayers={MAX_PLAYERS_BY_GAME[roomState.game] ?? 4}
                  />
                )}
                <div className="flex justify-center gap-3">
                  <button
                    onClick={toggleReady}
                    className={`px-6 py-2 rounded font-semibold ${
                      selfPlayer?.isReady
                        ? "bg-[#E6A11E] hover:bg-[#D89215] text-[#2B2118]"
                        : "bg-[#31A157] hover:bg-[#2A8B4B] text-white"
                    }`}
                  >
                    {selfPlayer?.isReady ? "Not ready" : "I'm ready"}
                  </button>
                  {selfIsHost && (
                    <button
                      onClick={startGame}
                      disabled={!canStart}
                      className="bg-[#EA5A1F] hover:bg-[#D74F18] text-white disabled:opacity-40 px-6 py-2 rounded font-semibold"
                    >
                      Start Game
                    </button>
                  )}
                </div>
              </div>
            )}

            {roomState.phase !== "lobby" && roomState.game === "rps" && gameState != null && !showGameOver && (
              <RpsBoard
                state={gameState as RpsState & { currentChoices: Partial<Record<string, "rock" | "paper" | "scissors">> }}
                players={roomState.players}
                selfId={playerId}
                messages={messages}
                roomCode={roomState.code}
                roomPhase={roomState.phase}
                onLeave={leaveRoom}
                onScorecardClose={triggerGameOver}
              />
            )}

            {roomState.phase !== "lobby" && roomState.game === "rummy" && gameState != null && !showGameOver && (
              <RummyBoard
                state={gameState as RummyPlayerState}
                players={roomState.players}
                selfId={playerId}
                messages={messages}
                roomCode={roomState.code}
                onLeave={leaveRoom}
                history={roomState.history}
                champion={roomState.champion}
                onScorecardClose={triggerGameOver}
              />
            )}

            {roomState.phase !== "lobby" && roomState.game === "ludo" && gameState != null && (
              (() => {
                // Pass & Play proxy: when the active turn belongs to a local
                // seat and we're the host, present that seat's id to the
                // board as `selfId` so the existing canRoll / can-move
                // checks light up. The board's emit calls include the same
                // id; the server validates and routes it to the right player.
                const ls = gameState as LudoState;
                const isHost = roomState.hostId === playerId;
                const activePid = ls.turnPlayerId;
                const activeP = roomState.players.find((p) => p.id === activePid);
                const effectiveSelfId =
                  isHost && activeP?.isLocal ? activePid : playerId;
                return (
                  <PassPhoneGate
                    activePlayerId={activePid}
                    players={roomState.players}
                    isHost={isHost}
                  >
                    <LudoBoard
                      state={ls}
                      players={roomState.players}
                      selfId={effectiveSelfId}
                      messages={messages}
                      roomCode={roomState.code}
                      roomPhase={roomState.phase}
                      onLeave={leaveRoom}
                    />
                  </PassPhoneGate>
                );
              })()
            )}

            {roomState.phase !== "lobby" && roomState.game === "snl" && gameState != null && (
              (() => {
                const ss = gameState as SnlState;
                const isHost = roomState.hostId === playerId;
                const activePid = ss.turnPlayerId;
                const activeP = roomState.players.find((p) => p.id === activePid);
                const effectiveSelfId =
                  isHost && activeP?.isLocal ? activePid : playerId;
                return (
                  <PassPhoneGate
                    activePlayerId={activePid}
                    players={roomState.players}
                    isHost={isHost}
                  >
                    <SnlBoard
                      state={ss}
                      players={roomState.players}
                      selfId={effectiveSelfId}
                      messages={messages}
                      roomCode={roomState.code}
                      roomPhase={roomState.phase}
                    />
                  </PassPhoneGate>
                );
              })()
            )}

            {roomState.phase !== "lobby" && roomState.game === "handcricket" && gameState != null && !showGameOver && (
              <HandCricketBoard
                state={gameState as HcState}
                players={roomState.players}
                selfId={playerId}
                messages={messages}
                roomCode={roomState.code}
                roomPhase={roomState.phase}
                onLeave={leaveRoom}
                onScorecardClose={triggerGameOver}
              />
            )}

            {roomState.phase !== "lobby" && roomState.game === "uno" && gameState != null && (
              <UnoBoard
                state={gameState as UnoPlayerState}
                players={roomState.players}
                selfId={playerId}
                messages={messages}
                roomCode={roomState.code}
                roomPhase={roomState.phase}
                onLeave={leaveRoom}
                onScorecardClose={triggerGameOver}
              />
            )}

            {roomState.phase !== "lobby" && roomState.game === "dotsboxes" && gameState != null && (
              (() => {
                const dbs = gameState as DotsBoxesPublicState;
                const isHost = roomState.hostId === playerId;
                const activePid = dbs.turnPlayerId;
                const activeP = roomState.players.find((p) => p.id === activePid);
                const effectiveSelfId =
                  isHost && activeP?.isLocal ? activePid : playerId;
                return (
                  <PassPhoneGate
                    activePlayerId={activePid}
                    players={roomState.players}
                    isHost={isHost}
                  >
                    <DotsBoxesBoard
                      state={dbs}
                      players={roomState.players}
                      selfId={effectiveSelfId}
                      messages={messages}
                      roomCode={roomState.code}
                      roomPhase={roomState.phase}
                      onLeave={leaveRoom}
                    />
                  </PassPhoneGate>
                );
              })()
            )}

            {roomState.phase !== "lobby" && roomState.game === "wordbuilding" && gameState != null && (
              (() => {
                const wbs = gameState as WordBuildingPublicState;
                const isHost = roomState.hostId === playerId;
                const activePid = wbs.turnPlayerId;
                const activeP = roomState.players.find((p) => p.id === activePid);
                // Pass-and-play: when the host's socket is the only one in
                // the room and the active seat is marked `isLocal`, override
                // selfId to that seat so the board's "myTurn" gate works.
                const effectiveSelfId =
                  isHost && activeP?.isLocal ? activePid : playerId;
                return (
                  <PassPhoneGate
                    activePlayerId={activePid}
                    players={roomState.players}
                    isHost={isHost}
                  >
                    <WordBuildingBoard
                      state={wbs}
                      players={roomState.players}
                      selfId={effectiveSelfId}
                      messages={messages}
                      roomCode={roomState.code}
                      roomPhase={roomState.phase}
                      onLeave={leaveRoom}
                    />
                  </PassPhoneGate>
                );
              })()
            )}

            {roomState.phase !== "lobby" && roomState.game === "memorymatch" && gameState != null && (
              <MemoryMatchBoard
                state={gameState as MemoryMatchPublicState}
                players={roomState.players}
                selfId={playerId}
                roomCode={roomState.code}
                messages={messages}
                roomPhase={roomState.phase}
              />
            )}

            {roomState.phase !== "lobby" && roomState.game === "stargame" && gameState != null && (
              <StarBoard
                state={gameState as StarPlayerView}
                players={roomState.players}
                selfId={playerId}
                roomCode={roomState.code}
                messages={messages}
                roomPhase={roomState.phase}
              />
            )}

            {/* Generic rematch panel is removed — it has moved into
                GameOverScreen, which renders as a fixed full-screen overlay
                once the game finishes. Keep this slot to avoid a dead gap. */}
          </div>

          {/* Global incoming-message toast — every game, every phase. The
              side rail's full Chat panel is hidden during Rummy gameplay and
              gets pushed off-screen on mobile during other games' play, so
              this is the only way players reliably see a teammate ping. */}
          <ChatMessageToast messages={messages} selfId={playerId} />

          {/* Every non-Rummy game now hosts its own InlineRoomRail inside
              its board card (the floating right-edge strip overlapped the
              play area on small viewports). Rummy still owns its header
              icons; the lobby keeps the full inline side rail below so the
              room code stays prominent while players join. */}

          {/* Inline side rail — kept only during the lobby (or for Rummy
              lobby) so the room code and player list are immediately visible
              while everyone joins. During gameplay this collapses into the
              FloatingRoomRail above. */}
          {roomState.phase === "lobby" && (
            <div className="space-y-4">
              <PlayerList players={roomState.players} selfId={playerId} />
              <VoicePanel players={roomState.players} selfId={playerId} />
              <Chat messages={messages} selfId={playerId} />
            </div>
          )}
        </div>
      </div>

      {/* ── GameOverScreen — fixed full-viewport overlay, z-70 ──────────
          Appears when the game session ends. For non-Rummy games it shows
          immediately on phase → "finished". For Rummy it shows after the
          in-board scorecard modal is dismissed (RummyBoard calls the
          `onScorecardClose` callback above, which calls `triggerGameOver`).
          A rematch (phase → "playing") hides it and resets the deadline. */}
      {showGameOver && gameOverDeadlineMs > 0 && (
        <GameOverScreen
          players={roomState.players}
          selfId={playerId}
          onLeave={leaveRoom}
          deadlineMs={gameOverDeadlineMs}
          winnerName={gameOverWinnerName}
          gameName={gameOverGameName}
        />
      )}

      {/* Generic scorecard modal — 90 s window for games without their own
          scorecard (Ludo, SnL, UNO, Word Building, Dots & Boxes, etc.).
          Rummy / RPS / HandCricket are excluded — they own their scorecard. */}
      {showScorecard && !showGameOver && roomState && !GAMES_WITH_OWN_SCORECARD.has(roomState.game) && (
        <GenericScorecardModal
          players={roomState.players}
          selfId={playerId}
          winnerName={gameOverWinnerName}
          winnerId={gameOverWinnerId}
          gameName={gameOverGameName}
          deadlineMs={scorecardDeadlineMs}
          onClose={triggerGameOver}
          onLeave={leaveRoom}
        />
      )}
    </div>
  );
}

/**
 * Name-entry block for someone arriving at `/room/:code` with no name stored.
 *
 * Covers two real cases:
 *   1. A friend opens the share link in a different browser.
 *   2. A returning player whose localStorage was cleared (incognito, fresh
 *      install, profile wipe).
 *
 * Submitting persists `playerName` to the store, which triggers Room's
 * useEffect and starts the join handshake. If the room turns out to have
 * evaporated server-side, the existing join error handler still fires,
 * shows the toast, and bounces home — so we don't have to handle that
 * case here.
 */
/**
 * Branded loading state shown while the socket opens and the first room
 * snapshot is in flight. Replaces the old static "Connecting to room..." text
 * with an animated gold spinner + bouncing dots so the wait reads as "working"
 * rather than "stuck". Pure Tailwind animations (spin / ping / bounce) — no
 * extra keyframes or libraries.
 */
function ConnectingScreen({ code }: { code?: string }) {
  return (
    <div className="bhalyam-font bhalyam-paper min-h-screen flex flex-col items-center justify-center gap-7 p-6 text-center">
      <div className="relative h-20 w-20" aria-hidden>
        <span className="absolute inset-0 rounded-full border-4 border-[#E4B128]/25" />
        <span className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#E4B128] animate-spin" />
        <span className="absolute inset-[34%] rounded-full bg-[#E4B128]/70 animate-ping" />
        <span className="absolute inset-[38%] rounded-full bg-[#E4B128]" />
      </div>
      <div>
        <div
          className="flex items-center justify-center gap-1 text-lg font-bold text-[#6C5A48]"
          role="status"
          aria-live="polite"
        >
          <span>Connecting to room</span>
          <span className="ml-1 inline-flex gap-1">
            <ConnectingDot delay="0ms" />
            <ConnectingDot delay="160ms" />
            <ConnectingDot delay="320ms" />
          </span>
        </div>
        {code && (
          <div className="mt-3 font-mono text-xl font-black tracking-[0.35em] text-[#2B3550]">
            {code.toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}

function ConnectingDot({ delay }: { delay: string }) {
  return (
    <span
      className="h-1.5 w-1.5 rounded-full bg-[#6C5A48] animate-bounce"
      style={{ animationDelay: delay }}
    />
  );
}

function NameEntryForRoom({
  code,
  onSubmit,
}: {
  code: string;
  onSubmit: (name: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const trimmed = draft.trim().slice(0, 20);
  const canSubmit = trimmed.length >= 1;
  return (
    <div className="bhalyam-font bhalyam-paper min-h-screen flex items-center justify-center p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) onSubmit(trimmed);
        }}
        className="w-full max-w-md bg-[#F6EDDB] border border-[#E8D8BE] rounded-2xl p-6 sm:p-7 space-y-4 shadow-[0_18px_30px_-22px_rgba(74,44,22,0.45)]"
      >
        <div className="text-center">
          <div className="text-[11px] uppercase tracking-widest font-bold text-[#A3886E]">
            Joining room
          </div>
          <div className="font-mono text-[28px] sm:text-[32px] tracking-[0.35em] font-black text-[#2B3550] mt-1">
            {code.toUpperCase()}
          </div>
          <p className="text-[#6E5E4D] text-sm mt-3">
            Enter your name so your friends know who just walked in.
          </p>
        </div>
        <input
          autoFocus
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Your name"
          maxLength={20}
          className="w-full rounded-xl border border-[#D5BFA1] dark:border-slate-600 bg-white dark:bg-slate-800 text-[#2A221B] dark:text-slate-100
                     text-lg px-4 py-3 outline-none focus:border-[#EA5A1F]
                     focus:ring-2 focus:ring-[#EA5A1F]/30 dark:placeholder:text-slate-500"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-xl bg-[#EA5A1F] hover:bg-[#D84F17]
                     text-white font-bold text-base py-3 disabled:opacity-40
                     disabled:cursor-not-allowed transition-colors"
        >
          Join Room
        </button>
      </form>
    </div>
  );
}

/** Generic end-of-session scorecard — shown for 90 s for all games that
 *  don't have their own in-board scorecard modal (Ludo, SnL, UNO, etc.).
 *  After 90 s or when the player taps "Continue", GameOverScreen takes over.
 *  The player can also leave directly. */
function GenericScorecardModal({
  players,
  selfId,
  winnerName,
  winnerId,
  gameName,
  deadlineMs,
  onClose,
  onLeave,
}: {
  players: { id: string; name: string }[];
  selfId: string | null;
  winnerName?: string | null;
  winnerId?: string | null;
  gameName?: string;
  deadlineMs: number;
  onClose: () => void;
  onLeave: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000)),
  );
  useEffect(() => {
    const id = window.setInterval(() => {
      setSecondsLeft(Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000)));
    }, 500);
    return () => window.clearInterval(id);
  }, [deadlineMs]);

  const pct = Math.max(0, secondsLeft / (SCORECARD_WINDOW_MS / 1000));
  const radius = 10;
  const circ = 2 * Math.PI * radius;

  return (
    <div className="fixed inset-0 z-[65] bg-black/75 flex items-center justify-center p-4">
      <div
        className="rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4"
        style={{
          background: "linear-gradient(160deg, #2F3A54 0%, #1a2236 100%)",
          border: "1px solid rgba(228,177,40,0.35)",
        }}
      >
        {/* Header — game name + circular countdown */}
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-widest font-bold text-amber-400/70">
            {gameName ?? "Game"} · Results
          </div>
          <div className="flex items-center gap-1.5">
            <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
              <circle cx="14" cy="14" r={radius} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2.5" />
              <circle
                cx="14" cy="14" r={radius} fill="none"
                stroke="#E4B128" strokeWidth="2.5"
                strokeDasharray={`${circ * pct} ${circ}`}
                strokeLinecap="round"
                transform="rotate(-90 14 14)"
              />
            </svg>
            <span className="text-xs font-mono text-slate-400 w-7 text-right">{secondsLeft}s</span>
          </div>
        </div>

        {/* Winner headline */}
        <div className="text-xl font-extrabold text-center text-white py-1">
          {winnerName ? `🏆 ${winnerName} wins!` : "Game Over!"}
        </div>

        {/* Player list */}
        <div className="space-y-1.5">
          {players.map((p) => {
            const isWinner = p.id === winnerId;
            const isSelf = p.id === selfId;
            return (
              <div
                key={p.id}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
                style={{
                  background: isWinner
                    ? "rgba(228,177,40,0.15)"
                    : isSelf
                    ? "rgba(255,255,255,0.07)"
                    : "rgba(255,255,255,0.04)",
                  border: isWinner
                    ? "1px solid rgba(228,177,40,0.35)"
                    : "1px solid transparent",
                }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
                  style={{
                    background: isWinner
                      ? "linear-gradient(135deg, #E4B128, #9A7410)"
                      : "rgba(255,255,255,0.12)",
                    color: isWinner ? "#1a0e00" : "#e2d9cb",
                  }}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span className="flex-1 text-sm font-semibold text-white/90 truncate">
                  {isSelf ? "You" : p.name}
                </span>
                {isWinner && <span className="text-base">🏆</span>}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onLeave}
            className="flex-1 rounded-lg py-2.5 text-sm font-semibold transition"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "rgba(255,255,255,0.70)",
            }}
          >
            Leave
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-lg py-2.5 text-sm font-extrabold transition"
            style={{
              background: "linear-gradient(135deg, #E4B128, #9A7410)",
              color: "#1a0e00",
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
