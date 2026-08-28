import { useEffect, useMemo, useRef, useState, useCallback, lazy, Suspense } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { generateActionId, getSocket } from "../lib/socket";
import { logConn } from "../lib/connectionLog";
import { useRoomStore } from "../store/roomStore";
import { currentAccessToken, currentAccountKind, useAuthStore } from "../store/authStore";
import { currentGuestToken } from "../lib/playerIdentity";
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
import RoomHeader from "../components/room/RoomHeader";
import RoomShareCard from "../components/room/RoomShareCard";
import ParticipantPanel from "../components/room/ParticipantPanel";
import CompactColorSelector from "../components/room/CompactColorSelector";
import LobbyActionBar from "../components/room/LobbyActionBar";
import CommunicationPanel from "../components/room/CommunicationPanel";
import { useRoomViewModel } from "../hooks/useRoomViewModel";
import { BoardLoadingFallback } from "../components/BoardLoadingFallback";
import BhalyamMatchCountdown from "../animations/app/BhalyamMatchCountdown";
import FallingPetals from "../animations/app/FallingPetals";
import { EveryoneReadyBanner } from "../animations/app/ReadyCheckmarkDraw";
import { recoveryManager } from "../core/recovery/RecoveryManager";
import { EconomyMotionOrchestrator, useEconomyMotion, useElementAnchor } from "../components/economy/motion";
import { LobbyPrizePool } from "../components/economy/LobbyPrizePool";
import { LobbyCoinFlight, type CoinParticle } from "../components/economy/LobbyCoinFlight";
import { useCheckoutQuote } from "../hooks/useEconomy";
import { deriveLobbyLockPhase } from "../lib/lobbyEconomy";
import { deriveTerminalMatchId, isMatchStartTransition, buildCommitmentPayload } from "../lib/economyMotionTriggers";
import BhalyamResultModal from "../components/BhalyamResultModal";
import { GAME_DISPLAY_NAMES, GAME_LIMITS, NO_BOT_GAMES } from "@shared/catalog";
import type { GameKind, Player, RpsState, RummyPlayerState, LudoState, SnlState, HcState, UnoPlayerState, WordBuildingPublicState, DotsBoxesPublicState, BotDifficulty } from "@shared/types";
import type { StarPlayerView, NamePlaceAnimalPlayerState, TambolaPlayerState } from "@shared/types";
import type { BingoPlayerState } from "@shared/types";
import GameErrorBoundary from "../components/GameErrorBoundary";
import type { SnakePublicState, CarromPublicState, ChessPublicState, SpaceWarPublicState } from "@shared/types";

// ── Lazy-loaded game boards (code-split per game) ──
const RpsBoard = lazy(() => import("../games/rps/RpsBoard"));
const RummyBoard = lazy(() => import("../games/rummy/RummyBoard"));
const LudoBoard = lazy(() => import("../games/ludo/LudoBoard"));
const SnlBoard = lazy(() => import("../games/snl/SnlBoard"));
const HandCricketBoard = lazy(() => import("../games/handcricket/HandCricketBoard"));
const UnoBoard = lazy(() => import("../games/uno/UnoBoard"));
const WordBuildingBoard = lazy(() => import("../games/wordbuilding/WordBuildingBoard"));
const DotsBoxesBoard = lazy(() => import("../games/dotsboxes/DotsBoxesBoard"));
const StarBoard = lazy(() => import("../games/stargame/StarBoard"));
const BingoBoard = lazy(() => import("../games/bingo/BingoBoard"));
const NamePlaceAnimalBoard = lazy(() => import("../games/namesplaceanimal/NamePlaceAnimalBoard"));
const TambolaBoard = lazy(() => import("../games/tambola/TambolaBoard"));
const SnakeBoard = lazy(() => import("../games/snake/SnakeBoard"));
const CarromBoard = lazy(() => import("../games/carrom/CarromBoard"));
const ChessBoard = lazy(() => import("../games/chess/ChessBoard"));
const SpaceWarBoard = lazy(() => import("../games/spacewar/SpaceWarBoard"));

/**
 * Bot-control max-seat lookup. Mirrors the server-side getGameLimits map so
 * the "X seats left" pill in BotControls knows when the table is full per
 * game type. Keep in sync with server/src/games/registry.ts
 */
const MAX_PLAYERS_BY_GAME: Record<GameKind, number> = Object.fromEntries(
  Object.entries(GAME_LIMITS).map(([k, v]) => [k, v.max])
) as Record<GameKind, number>;

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
          className="relative p-2.5 -m-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-full"
        >
          <span className="w-6 h-6 rounded-full flex items-center justify-center bg-rose-950 hover:bg-rose-900 text-rose-200 font-extrabold text-xs">
            ✕
          </span>
        </button>
      </div>
    </div>
  );
}

function BotControls({
  players,
  maxPlayers,
  game,
}: {
  players: Player[];
  maxPlayers: number;
  game: GameKind;
}) {
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
          guestToken: currentGuestToken(),
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
          if (res.playerId) {
            setPlayerId(res.playerId);
            recoveryManager.attachRoom(joinCode, res.playerId, res.seatToken, joinName, useRoomStore.getState().avatarId ?? undefined);
          }
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
  const economyMotion = useEconomyMotion();
  // Stable across renders (see useEconomyMotion.ts: each is a useCallback
  // with its own stable deps, and this component never passes soundHooks/
  // onPhaseChange/onSequenceComplete options) — destructured so effect
  // dependency arrays name exactly what they use, instead of the whole
  // `economyMotion` object (a fresh reference every render, which made
  // every effect below re-run on every unrelated re-render of this page).
  const { phase: economyPhase, cancelMotion, startAwaitingAuthority, triggerCommitmentSequence, resetMotion } = economyMotion;

  // Real screen position of the lobby wallet chip (RoomHeader), so the
  // coin-departure flight in the commitment ceremony below launches from
  // the actual wallet the coins are leaving, not a hardcoded screen corner.
  const hostWalletAnchor = useElementAnchor({ elementId: "host-wallet-chip" });

  // Cancel economy motion on error toast
  useEffect(() => {
    if (lastError) {
      cancelMotion(lastError);
    }
  }, [lastError, cancelMotion]);

  // Neutral anticipation while server commits match entry (authoritative lifecycleState: STARTING)
  useEffect(() => {
    if (roomState?.lifecycleState === "STARTING" && economyPhase === "idle") {
      startAwaitingAuthority();
    }
  }, [roomState?.lifecycleState, economyPhase, startAwaitingAuthority]);

  // Hand control from the live-match ceremony (this orchestrator) to the
  // authoritative, HTTP-fetched SettlementView once a match concludes — the
  // two must never both be mid-animation for the same match. Resetting here
  // means the orchestrator is idle (renders nothing) by the time
  // BhalyamResultModal/SettlementView takes over.
  const prevPhaseForMotionResetRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const prev = prevPhaseForMotionResetRef.current;
    const next = roomState?.phase;
    if (next === "finished" && prev !== "finished") {
      resetMotion();
    }
    prevPhaseForMotionResetRef.current = next;
  }, [roomState?.phase, resetMotion]);

  // Detect the lobby → playing transition.
  const [showMatchCountdown, setShowMatchCountdown] = useState(false);
  const [showAllReadyBanner, setShowAllReadyBanner] = useState(false);

  // Phase 7F: Lobby coin particles and seat transition tracking
  const [lobbyParticles, setLobbyParticles] = useState<CoinParticle[]>([]);
  const prevPlayerIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (roomState?.phase !== "lobby") {
      prevPlayerIdsRef.current = new Set(roomState?.players.map((p) => p.id) ?? []);
      return;
    }
    const currentIds = new Set(roomState.players.map((p) => p.id));
    const prevIds = prevPlayerIdsRef.current;

    // Detect newly joined players / bots
    const joinedPlayers = roomState.players.filter((p) => !prevIds.has(p.id));
    if (joinedPlayers.length > 0 && prevIds.size > 0) {
      const potElement = typeof document !== "undefined" ? document.getElementById("lobby-prize-pool-card") : null;
      const potRect = potElement?.getBoundingClientRect();
      const targetX = potRect ? potRect.left + potRect.width / 2 : (typeof window !== "undefined" ? window.innerWidth / 2 : 200);
      const targetY = potRect ? potRect.top + potRect.height / 2 : 120;

      const newParticles: CoinParticle[] = joinedPlayers.slice(0, 4).map((p) => {
        const seatEl = typeof document !== "undefined" ? document.getElementById(`seat-${p.id}`) : null;
        const seatRect = seatEl?.getBoundingClientRect();
        const startX = seatRect ? seatRect.left + 30 : (typeof window !== "undefined" ? window.innerWidth / 2 : 200);
        const startY = seatRect ? seatRect.top + 30 : (typeof window !== "undefined" ? window.innerHeight / 2 : 200);

        return {
          id: `particle-${p.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          startX,
          startY,
          targetX,
          targetY,
          createdAt: Date.now(),
        };
      });

      if (newParticles.length > 0) {
        setLobbyParticles((prev) => [...prev.slice(-3), ...newParticles]);
      }
    }

    prevPlayerIdsRef.current = currentIds;
  }, [roomState?.players, roomState?.phase]);

  const handleCompleteLobbyParticle = useCallback((id: string) => {
    setLobbyParticles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // Phase 7F: authoritative lobby checkout quote — the ONLY source for seat
  // cost and prize distribution shown pre-commit. Never computed locally;
  // see lib/lobbyEconomy.ts's own doc comment for why. Fetched for every
  // lobby participant (the quote is identity-independent: cost/prizes are a
  // pure function of seat count, not of whose wallet is checked), gated to
  // the lobby phase with at least one seat filled.
  const lobbyHumanSeatCount = roomState?.players.filter((p) => !p.isBot).length ?? 0;
  const lobbyBotSeatCount = roomState?.players.filter((p) => p.isBot).length ?? 0;
  const lobbySeatCount = lobbyHumanSeatCount + lobbyBotSeatCount;
  const { quote: lobbyQuote, isLoading: isLobbyQuoteLoading } = useCheckoutQuote(
    roomState?.phase === "lobby" && lobbySeatCount > 0
      ? { seatCount: lobbySeatCount, humanSeatCount: lobbyHumanSeatCount, botSeatCount: lobbyBotSeatCount }
      : null,
  );
  // "Locked" requires the server to have actually confirmed the commit
  // succeeded (`currentMatchId` populated) — NOT merely that Start Game was
  // clicked (`lifecycleState === "STARTING"` fires before the commit RPC
  // even resolves). See deriveLobbyLockPhase's own doc comment.
  const lobbyLockPhase = deriveLobbyLockPhase(Boolean(roomState?.currentMatchId), roomState?.lifecycleState);

  const prevRoomPhaseRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const prev = prevRoomPhaseRef.current;
    const next = roomState?.phase;
    // A rematch goes "finished" -> "playing" directly (RoomManager.
    // startRematch sets `phase` straight to "playing", it never passes
    // back through "lobby") — both are real match starts.
    if (isMatchStartTransition(prev, next)) {
      // Real amounts, straight off the authoritative broadcast — never a
      // client-side guess, never fired ahead of the server's own commit.
      // `null` means either economy isn't configured for this deployment
      // or the match bypassed requestGameStart's commit step — either
      // way, nothing authoritative to animate. A room-code-based fallback
      // id is deliberately NOT used here: the code is stable across a
      // room's entire lifetime including every rematch, which would
      // silently suppress the ceremony on the second and every later
      // match in the room.
      const commitment = roomState ? buildCommitmentPayload(roomState, playerId, hostWalletAnchor) : null;
      if (commitment) {
        // Economy-gated match: the coin-flight + "MATCH COMMENCED" +
        // pot-total + 3-2-1-PLAY ceremony (EconomyMotionOrchestrator /
        // GameStartSequence) owns the full countdown for this match.
        // Showing the generic BhalyamMatchCountdown at the same time
        // would stack two competing full-screen "3..2..1" overlays.
        triggerCommitmentSequence(commitment);
      } else {
        // No authoritative commit to animate — the generic countdown
        // remains the only ceremony for this match.
        setShowMatchCountdown(true);
      }
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
  }, [roomState, code, playerId, triggerCommitmentSequence, hostWalletAnchor]);

  const allPlayersReady = useMemo(() => {
    if (!roomState || roomState.phase !== "lobby" || roomState.players.length < 2) return false;
    return roomState.players.every((p) => p.isReady);
  }, [roomState]);

  const prevAllReadyRef = useRef(false);
  useEffect(() => {
    if (allPlayersReady && !prevAllReadyRef.current) {
      setShowAllReadyBanner(true);
    }
    prevAllReadyRef.current = allPlayersReady;
  }, [allPlayersReady]);

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

  const viewModel = useRoomViewModel(roomState, playerId);

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
    economyMotion.resetMotion();
    if (isFullscreenActive()) void exitFullscreen();
    destroyVoiceSession();
    recoveryManager.detachRoom();
    getSocket().emit("room:leave");
    reset();
    navigate("/");
  }

  // Two ways to land here without being seated yet:
  //   1. No name at all — a shared link opened in a fresh browser, or storage
  //      that was cleared. Nobody can join a table anonymously.
  //   2. A guest arriving at a table that is not theirs, who declares
  //      themselves once per room even if a name is already stored.
  // Either way, submitting persists the name and the join effect above picks
  // it up on the next render.
  if (!playerName || mustDeclare) {
    return (
      <AppLayout onSelectGame={() => navigate("/")}>
        <NameEntryForRoom
          code={code ?? ""}
          initialName={playerName}
          guest={mustDeclare}
          onSubmit={(n) => {
            setPlayerName(n);
            setDeclaredHere(true);
          }}
        />
      </AppLayout>
    );
  }

  if (!roomState) {
    return (
      <AppLayout onSelectGame={() => navigate("/")}>
        <ConnectingScreen code={code} />
      </AppLayout>
    );
  }

  const minPlayersNeeded =
    roomState.game === "snake" ||
    roomState.game === "carrom" ||
    roomState.game === "spacewar"
      ? 1
      : 2;

  const canStart =
    selfIsHost &&
    roomState.phase === "lobby" &&
    roomState.players.length >= minPlayersNeeded &&
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
    stargame:     "Star Game",
    bingo:        "Bingo",
    namesplaceanimal: "Name Place Animal Thing",
    tambola: "Tambola (Housie)",
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

  const rankedPlayers = useMemo(() => {
    if (!roomState) return [];
    return roomState.players.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.id === gameOverWinnerId ? 100 : 0,
      avatar: p.avatar,
    }));
  }, [roomState, gameOverWinnerId]);

  // Ludo in play is viewport-locked (its shell is sized off `100svh`), so it
  // needs the same "no inline banners, no extra padding" treatment Rummy gets.
  const ludoInPlay = roomState.game === "ludo" && roomState.phase !== "lobby";

  return (
    /**
     * The one screen in the app with no global header or side nav.
     *
     * Chrome is off for the whole room session rather than only once play
     * starts, deliberately. Toggling it on Start would relayout the page
     * under everyone at the exact moment the board appears, and the lobby
     * already carries its own header — room code, room name, Leave Room — so
     * the global set was a second navigation competing with it.
     */
    <AppLayout chrome={false} onSelectGame={() => navigate("/")}>
      <div
        className={
          FULL_BLEED_GAMES.has(roomState.game) && roomState.phase !== "lobby"
            ? "bhalyam-font bhalyam-paper h-full min-h-screen overflow-hidden p-0"
            : ludoInPlay
              ? "bhalyam-font bhalyam-paper min-h-screen p-1 pb-[max(1rem,env(safe-area-inset-bottom))]"
              : "bhalyam-font bhalyam-paper min-h-screen px-3.5 py-3 sm:px-6 sm:py-5 pb-[max(3rem,calc(env(safe-area-inset-bottom)+1.5rem))]"
        }
      >
      {roomState.phase === "lobby" && <FallingPetals />}
      <div
        className={
          (FULL_BLEED_GAMES.has(roomState.game) && roomState.phase !== "lobby"
            ? // No space-y here — the board fills the whole inner area
              // and any lastError banner overlays it via fixed positioning.
              "mx-auto h-full max-w-none"
            : roomState.game === "ludo" && roomState.phase !== "lobby"
              ? // Ludo in play wants the full desktop width so the board can
                // be large between its side rails (max-w-6xl squeezed it).
                "mx-auto space-y-3 sm:space-y-4 max-w-[110rem]"
              : "mx-auto space-y-3 sm:space-y-4 max-w-6xl") +
          // FallingPetals is a fixed, z-0 background layer during the lobby —
          // give the lobby content explicit stacking so it paints above the
          // petals instead of losing to CSS's positioned-over-static default.
          (roomState.phase === "lobby" ? " relative z-10" : "")
        }
      >
        {roomState.phase === "lobby" ? (
          <RoomHeader
            roomState={roomState}
            isHost={selfIsHost}
            onLeave={leaveRoom}
          />
        ) : (
          roomState.game !== "rummy" && roomState.game !== "wordbuilding" && roomState.game !== "dotsboxes" && roomState.game !== "uno" && roomState.game !== "ludo" && roomState.game !== "carrom" && (
            <header
              className={
                roomState.game === "stargame"
                  ? "pointer-events-none absolute right-3 top-3 z-30 flex items-center justify-end"
                  : "flex items-center justify-end"
              }
            >
              <button
                onClick={leaveRoom}
                className="pointer-events-auto text-sm bg-[#4A3F35] hover:bg-[#3F352C] dark:bg-slate-800/90 dark:hover:bg-red-950/60 dark:hover:text-red-300 dark:border dark:border-slate-700/60 text-[#FFF3E3] dark:text-slate-200 px-3.5 py-1.5 rounded-lg shadow-lg transition font-medium"
              >
                Leave
              </button>
            </header>
          )
        )}

        {/* Errors render inline for most games and as a fixed toast for the
            viewport-locked boards — Rummy's felt and Ludo's in-play shell are
            both sized to fill the viewport, so an inline banner adds height
            they never budgeted for and scrolls the board off-screen. The fixed
            toast sits above the board (z-40) but below modal overlays (z-50). */}
        {lastError && !(roomState.game === "rummy" && roomState.phase !== "lobby") && !ludoInPlay && (
          <div className="bg-[#FEE2E2] dark:bg-red-950/40 border border-[#FCA5A5] dark:border-red-800/60 text-[#9F1239] dark:text-red-300 rounded-xl p-3 text-sm">
            {lastError}
            <button onClick={() => setError(null)} className="float-right">
              ✕
            </button>
          </div>
        )}
        {lastError && ((roomState.game === "rummy" && roomState.phase !== "lobby") || ludoInPlay) && (
          <Toast message={lastError} onClose={() => setError(null)} />
        )}

        {roomState.phase === "lobby" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column (approx 62% - lg:col-span-7 xl:col-span-8) */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-4 pb-28 lg:pb-0">
              {roomState.sealed ? (
                <SignInWall
                  from="room"
                  reason="This table is just you and the bots"
                />
              ) : (
                <RoomShareCard
                  code={roomState.code}
                  game={roomState.game}
                  name={roomState.name}
                />
              )}

              {/* Live Match Prize Pool (Phase 7F) */}
              <LobbyPrizePool
                seatCount={viewModel.totalPlayersCount}
                readyCount={viewModel.readyPlayersCount}
                allReady={viewModel.allReady}
                quote={lobbyQuote}
                isQuoteLoading={isLobbyQuoteLoading}
                lockPhase={lobbyLockPhase}
                isHost={selfIsHost}
              />

              <ParticipantPanel
                players={roomState.players}
                maxPlayers={viewModel.maxPlayers}
                selfId={playerId}
                isHost={selfIsHost}
                game={roomState.game}
                onAddBot={(name, diff) => { getSocket().emit("room:addBot", name, diff); }}
                onRemoveBot={(id) => { getSocket().emit("room:removeBot", id); }}
                onRemoveLocalPlayer={(id) => { getSocket().emit("room:removeLocalPlayer", id); }}
                onRenameBot={(id, newName) => { getSocket().emit("room:renameBot", id, newName); }}
              />

              {viewModel.colorPickerKind && (
                <CompactColorSelector
                  kind={viewModel.colorPickerKind}
                  players={roomState.players}
                  selfId={playerId}
                  onChooseLudoColor={(c) => getSocket().emit("room:chooseColor", c)}
                  onChooseCoinColor={(c) => getSocket().emit("room:chooseCoinColor", c)}
                  onChoosePenColor={(c) => getSocket().emit("room:choosePenColor", c)}
                />
              )}

              {/* Mobile / Tablet communication drawer trigger */}
              <div className="block lg:hidden">
                <CommunicationPanel
                  messages={messages}
                  players={roomState.players}
                  selfId={playerId}
                  isMobile={true}
                />
              </div>

              {/* Mobile / Tablet sticky bottom action bar */}
              <div className="block lg:hidden">
                <LobbyActionBar
                  isHost={selfIsHost}
                  isReady={viewModel.selfIsReady}
                  canStart={viewModel.canStartGame}
                  startGameDisabledReason={viewModel.startGameDisabledReason}
                  readyCount={viewModel.readyPlayersCount}
                  totalCount={viewModel.totalPlayersCount}
                  commitmentCoins={lobbyQuote?.totalCommitment ?? null}
                  onToggleReady={toggleReady}
                  onStartGame={startGame}
                  variant="sticky-mobile"
                />
              </div>
            </div>

            {/* Right Column (approx 38% - lg:col-span-5 xl:col-span-4) - Desktop only */}
            <div className="hidden lg:flex flex-col gap-4 lg:sticky lg:top-4 lg:col-span-5 xl:col-span-4 w-full">
              <LobbyActionBar
                isHost={selfIsHost}
                isReady={viewModel.selfIsReady}
                canStart={viewModel.canStartGame}
                startGameDisabledReason={viewModel.startGameDisabledReason}
                readyCount={viewModel.readyPlayersCount}
                totalCount={viewModel.totalPlayersCount}
                commitmentCoins={lobbyQuote?.totalCommitment ?? null}
                onToggleReady={toggleReady}
                onStartGame={startGame}
                variant="desktop-panel"
              />

              <CommunicationPanel
                messages={messages}
                players={roomState.players}
                selfId={playerId}
                isMobile={false}
              />
            </div>
          </div>
        ) : (
          <div
            id="game-board-container"
            data-pot-target="true"
            className={
              FULL_BLEED_GAMES.has(roomState.game)
                ? "h-full"
                : "w-full space-y-4"
            }
          >
            <GameErrorBoundary
              gameName={roomState.game}
              onReset={() => window.location.reload()}
            >
              <Suspense fallback={<BoardLoadingFallback gameName={GAME_DISPLAY_NAMES[roomState.game] || roomState.game} />}>
                {roomState.game === "rps" && gameState != null && !showGameOver && (
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

              {roomState.game === "rummy" && gameState != null && !showGameOver && (
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

              {roomState.game === "ludo" && gameState != null && (
                (() => {
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
                        onScorecardClose={triggerGameOver}
                      />
                    </PassPhoneGate>
                  );
                })()
              )}

              {roomState.game === "snl" && gameState != null && (
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

              {roomState.game === "handcricket" && gameState != null && !showGameOver && (
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

              {roomState.game === "uno" && gameState != null && (
                <UnoBoard
                  state={gameState as UnoPlayerState}
                  players={roomState.players}
                  selfId={playerId}
                  messages={messages}
                  roomCode={roomState.code}
                  roomPhase={roomState.phase}
                  onLeave={leaveRoom}
                  history={roomState.unoHistory}
                  champion={roomState.unoChampion}
                  onScorecardClose={triggerGameOver}
                />
              )}

              {roomState.game === "dotsboxes" && gameState != null && (
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
                        onScorecardClose={triggerGameOver}
                      />
                    </PassPhoneGate>
                  );
                })()
              )}

              {roomState.game === "wordbuilding" && gameState != null && (
                (() => {
                  const wbs = gameState as WordBuildingPublicState;
                  const isHost = roomState.hostId === playerId;
                  const activePid = wbs.turnPlayerId;
                  const activeP = roomState.players.find((p) => p.id === activePid);
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

              {roomState.game === "stargame" && gameState != null && (
                <StarBoard
                  state={gameState as StarPlayerView}
                  players={roomState.players}
                  selfId={playerId}
                  roomCode={roomState.code}
                  messages={messages}
                  roomPhase={roomState.phase}
                />
              )}

              {roomState.game === "bingo" && gameState != null && !showGameOver && (
                <BingoBoard
                  state={gameState as BingoPlayerState}
                  players={roomState.players}
                  selfId={playerId}
                  messages={messages}
                  roomCode={roomState.code}
                  roomPhase={roomState.phase}
                  onLeave={leaveRoom}
                  onScorecardClose={triggerGameOver}
                />
              )}

              {roomState.game === "namesplaceanimal" && gameState != null && (
                <NamePlaceAnimalBoard
                  state={gameState as NamePlaceAnimalPlayerState}
                  myAnswers={(gameState as NamePlaceAnimalPlayerState).myAnswers}
                  myPlayerId={playerId || ""}
                  onMove={sendMove}
                  players={roomState.players}
                  messages={messages}
                  roomCode={roomState.code}
                  roomPhase={roomState.phase}
                />
              )}

              {roomState.game === "tambola" && gameState != null && (
                <TambolaBoard
                  state={gameState as TambolaPlayerState}
                  selfId={playerId || ""}
                  onMove={sendMove}
                  players={roomState.players}
                  messages={messages}
                  roomCode={roomState.code}
                  roomPhase={roomState.phase}
                />
              )}

              {roomState.game === "snake" && gameState != null && (
                <SnakeBoard
                  onMove={sendMove}
                  state={gameState as SnakePublicState}
                  selfId={playerId || ""}
                  players={roomState.players}
                  messages={messages}
                  roomCode={roomState.code}
                  roomPhase={roomState.phase}
                />
              )}

              {roomState.game === "carrom" && gameState != null && (
                <CarromBoard
                  state={gameState as CarromPublicState}
                  players={roomState.players}
                  selfId={playerId || ""}
                  messages={messages}
                  roomCode={roomState.code}
                  roomPhase={roomState.phase}
                  onLeave={leaveRoom}
                  onMove={sendMove}
                />
              )}

              {roomState.game === "chess" && gameState != null && (
                <ChessBoard
                  state={gameState as ChessPublicState}
                  players={roomState.players}
                  selfId={playerId || ""}
                  messages={messages}
                  roomCode={roomState.code}
                  roomPhase={roomState.phase}
                  onMove={sendMove}
                />
              )}

              {roomState.game === "spacewar" && gameState != null && (
                <SpaceWarBoard
                  onMove={sendMove}
                  state={gameState as SpaceWarPublicState}
                  selfId={playerId || ""}
                />
              )}
              </Suspense>
            </GameErrorBoundary>
          </div>
        )}

      {linkDown && (
        <div
          role="status"
          aria-live="assertive"
          className="fixed top-0 inset-x-0 z-[80] flex items-center justify-center gap-2
                     px-3 py-2 text-[13px] font-bold text-[#FFF3E3]"
          style={{ background: "#8A5A2B", borderBottom: "1px solid #B4232A" }}
        >
          <span
            aria-hidden
            className="w-2 h-2 rounded-full bg-[#F2C879] animate-pulse flex-shrink-0"
          />
          <span>
            Connection lost. Reconnecting
            {linkAttempts > 0 ? ` (attempt ${linkAttempts})` : ""}...
          </span>
          <button
            type="button"
            onClick={() => {
              setLinkAttempts((n) => n + 1);
              getSocket().connect();
            }}
            className="ml-1 rounded-full px-2.5 py-1 text-[12px] font-extrabold
                       bg-[#FFF3E3] text-[#8A5A2B] active:translate-y-px"
          >
            Retry now
          </button>
        </div>
      )}

      <ChatMessageToast messages={messages} selfId={playerId} />

      <SoundboardLayer players={roomState.players} selfId={playerId} />

      {/* ── GameOverScreen — fixed full-viewport overlay, z-70 ──────────
          Appears when the game session ends. For non-Rummy games it shows
          immediately on phase → "finished". For Rummy it shows after the
          in-board scorecard modal is dismissed (RummyBoard calls the
          `onScorecardClose` callback above, which calls `triggerGameOver`).
          A rematch (phase → "playing") hides it and resets the deadline. */}
      {/* "I'm back" — shown ONLY to the player whose seat is being auto-played.
          Any interaction already reclaims the seat silently (see the presence
          effect above), but a player who has just returned to a board that has
          moved without them needs to be told what is happening and given an
          unmistakable way out — not left to guess that clicking somewhere will
          fix it. Everyone else sees the robot on that seat instead. */}
      {selfIsAutoPlaying && roomState?.phase === "playing" && (
        <div className="fixed inset-x-0 bottom-4 z-[70] flex justify-center px-4 pointer-events-none">
          <button
            type="button"
            onClick={() => {
              try {
                getSocket().emit("room:awake");
              } catch {
                /* socket down — the reconnect path clears the seat instead */
              }
            }}
            className="pointer-events-auto flex items-center gap-2 rounded-full px-5 py-3 font-extrabold text-sm shadow-2xl active:scale-95 transition"
            style={{
              background: "linear-gradient(135deg,#fde68a,#f59e0b)",
              color: "#1f1300",
              border: "2px solid #b45309",
            }}
          >
            <span aria-hidden>🤖</span>
            <span>Auto-play is on — tap to take back your turn</span>
          </button>
        </div>
      )}

      {/* Universal BHALYAM Match Countdown */}
      {showMatchCountdown && (
        <BhalyamMatchCountdown onComplete={() => setShowMatchCountdown(false)} />
      )}

      {/* Everyone Ready Banner in Lobby */}
      {showAllReadyBanner && (
        <EveryoneReadyBanner onComplete={() => setShowAllReadyBanner(false)} />
      )}

      {/* Phase 7F: Lobby Coin Flight Particles */}
      {roomState?.phase === "lobby" && (
        <LobbyCoinFlight
          particles={lobbyParticles}
          onCompleteParticle={handleCompleteLobbyParticle}
        />
      )}

      {/* Authoritative Economy Motion Orchestrator */}
      <EconomyMotionOrchestrator
        phase={economyMotion.phase}
        commitment={economyMotion.activeCommitment}
        settlement={economyMotion.activeSettlement}
        refund={economyMotion.activeRefund}
        escrow={economyMotion.activeEscrow}
        errorMessage={economyMotion.errorMessage}
        onGameStartComplete={resetMotion}
      />

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

      {/* Match result & settlement modal — displays ranked outcomes and authoritative settlement */}
      {showScorecard && !showGameOver && roomState && !GAMES_WITH_OWN_SCORECARD.has(roomState.game) && (
        <BhalyamResultModal
          players={roomState.players}
          rankedPlayers={rankedPlayers}
          selfId={playerId}
          winnerName={gameOverWinnerName ?? undefined}
          winnerId={gameOverWinnerId}
          matchId={deriveTerminalMatchId(roomState)}
          title={gameOverGameName ? `${gameOverGameName} Results` : "Match Results"}
          onClose={triggerGameOver}
          onLeave={leaveRoom}
        />
      )}
        </div>
      </div>
    </AppLayout>
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
    <div className="bhalyam-font bhalyam-paper min-h-screen flex flex-col items-center justify-center gap-7 p-6 text-center pb-[max(1.5rem,env(safe-area-inset-bottom))]">
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
  initialName = "",
  guest = false,
}: {
  code: string;
  onSubmit: (name: string) => void;
  /** Prefill, so a guest with a stored name confirms rather than retypes. */
  initialName?: string;
  /** True when this is a guest announcing themselves at someone else's table
   *  — the copy changes, because they are not missing a name, they are being
   *  asked to introduce themselves. */
  guest?: boolean;
}) {
  const [draft, setDraft] = useState(initialName);
  const trimmed = draft.trim().slice(0, 20);
  const canSubmit = trimmed.length >= 1;
  return (
    <div className="bhalyam-font bhalyam-paper min-h-screen flex items-center justify-center p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) onSubmit(trimmed);
        }}
        className="w-full max-w-md bg-[#F6EDDB] border border-[#E8D8BE] rounded-2xl p-6 sm:p-7 space-y-4 shadow-[0_18px_30px_-22px_rgba(74,44,22,0.45)]"
      >
        <div className="text-center">
          <div className="text-[11px] uppercase tracking-widest font-bold text-[#A3886E]">
            {guest ? "Joining as a guest" : "Joining room"}
          </div>
          <div className="font-mono text-[28px] sm:text-[32px] tracking-[0.35em] font-black text-[#2B3550] mt-1">
            {code.toUpperCase()}
          </div>
          <p className="text-[#6E5E4D] text-sm mt-3">
            {guest
              ? "This is someone else's table. Tell them who's sitting down."
              : "Enter your name so your friends know who just walked in."}
          </p>
        </div>
        <input
          autoFocus
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Your name"
          maxLength={20}
          className="w-full rounded-xl border border-[var(--room-field-edge)] bg-[var(--room-field)] text-[var(--room-ink)]
                     text-lg px-4 py-3 outline-none focus:border-[#EA5A1F]
                     focus:ring-2 focus:ring-[#EA5A1F]/30 placeholder:text-[var(--room-ink-mute)]"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-xl bg-[#EA5A1F] hover:bg-[#D84F17]
                     text-white font-bold text-base py-3 disabled:opacity-40
                     disabled:cursor-not-allowed transition-colors"
        >
          {guest ? "Enter the game" : "Join Room"}
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
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSecondsLeft(Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000)));
    }, 500);
    return () => window.clearInterval(id);
  }, [deadlineMs]);

  const pct = Math.max(0, secondsLeft / (SCORECARD_WINDOW_MS / 1000));
  const radius = 10;
  const circ = 2 * Math.PI * radius;

  if (previewMode) {
    return (
      <BoardPreviewPill
        onClosePreview={() => setPreviewMode(false)}
        targetElementId="game-board-container"
      />
    );
  }

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
            onClick={() => setPreviewMode(true)}
            className="rounded-lg px-3 py-2 text-xs font-bold transition flex items-center justify-center gap-1 bg-amber-600 hover:bg-amber-500 text-white cursor-pointer shadow"
          >
            👁 Preview Board
          </button>
          <button
            onClick={onLeave}
            className="flex-1 rounded-lg py-2 text-xs font-semibold transition cursor-pointer"
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
            className="flex-1 rounded-lg py-2 text-xs font-extrabold transition cursor-pointer"
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
