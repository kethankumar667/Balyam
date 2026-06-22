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
import RematchPanel from "../components/RematchPanel";
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
import type { GameKind, RpsState, RummyPlayerState, LudoState, SnlState, HcState, UnoState, WordBuildingPublicState, DotsBoxesPublicState } from "@shared/types";
import WordBuildingBoard from "../games/wordbuilding/WordBuildingBoard";
import DotsBoxesBoard from "../games/dotsboxes/DotsBoxesBoard";

/**
 * Bot-control max-seat lookup. Mirrors the server-side getGameLimits map so
 * the "X seats left" pill in BotControls knows when the table is full per
 * game type. Keep in sync with server/src/games/registry.ts.
 */
const MAX_PLAYERS_BY_GAME: Record<GameKind, number> = {
  rps: 2,
  rummy: 6,
  ludo: 4,
  snl: 10,
  handcricket: 2,
  uno: 8,
  wordbuilding: 4,
  dotsboxes: 4,
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
    reset,
  } = useRoomStore();

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
      socket.emit(
        "room:join",
        { name: joinName, code: joinCode, playerId: playerId ?? undefined },
        (res) => {
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
    socket.on("connect", onConnect);
    socket.on("room:state", setRoomState);
    socket.on("game:state", setGameState);
    socket.on("chat:message", addMessage);
    socket.on("room:error", setError);
    socket.on("game:error", setError);
    socket.on("rematch:state", setRematch);

    return () => {
      socket.off("connect", onConnect);
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
  //   1. For Rummy, stash a sessionStorage flag the board reads exactly
  //      once on mount as the single source of truth for whether to play
  //      the shuffle + deal opener.
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
   * from "lobby" to "playing". Orientation is left as "any" across every
   * game so the device's auto-rotate setting decides — users wanted the
   * board to follow their phone rotation instead of being locked to a
   * single orientation.
   *
   * Game-specific responsive layouts (Rummy's rotate-prompt for portrait,
   * Ludo/SnL working at every aspect ratio) handle the actual UX. The
   * fullscreen call still fires so the address/nav bars disappear.
   */
  function orientationForGame(_game: GameKind | undefined): "landscape" | "portrait" | "any" {
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
    return (
      <div className="bhalyam-font bhalyam-paper min-h-screen flex items-center justify-center text-[#6C5A48] text-lg">
        Connecting to room...
      </div>
    );
  }

  const canStart =
    selfIsHost &&
    roomState.phase === "lobby" &&
    roomState.players.length >= 2 &&
    roomState.players.every((p) => p.isReady);

  return (
    <div
      className={
        roomState.game === "rummy" && roomState.phase !== "lobby"
          ? "bhalyam-font bhalyam-paper h-screen overflow-hidden p-0 sm:p-4"
          : "bhalyam-font bhalyam-paper min-h-screen p-2 sm:p-4"
      }
    >
      <div
        className={
          roomState.game === "rummy" && roomState.phase !== "lobby"
            ? // No space-y here — the RummyBoard fills the whole inner area
              // and any lastError banner overlays it via fixed positioning.
              "mx-auto h-full max-w-none sm:max-w-6xl"
            : "mx-auto space-y-3 sm:space-y-4 max-w-6xl"
        }
      >
        {/* Room header. Three shapes:
              1. Rummy in play: hidden entirely — Rummy renders its own.
              2. Any game during the lobby: full header with code + Leave.
              3. Any non-Rummy game during play/finished: slim header — just
                 a right-aligned Leave button. The room code, players, voice
                 and chat have all moved into the FloatingRoomRail strip per
                 the marked-area reference. */}
        {roomState.phase === "lobby" && (
          <header className="flex items-center justify-between flex-wrap gap-3">
            <RoomCode code={roomState.code} />
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
        {roomState.phase !== "lobby" && roomState.game !== "rummy" && (
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
            const rummyPlay = roomState.game === "rummy" && roomState.phase !== "lobby";
            const compactPlay = !rummyPlay && roomState.phase !== "lobby";
            if (rummyPlay) return "h-full";
            // Compact gameplay: the side rail collapses into the floating
            // right rail, so the board owns the full inner width.
            if (compactPlay) return "block";
            return "grid md:grid-cols-3 gap-4";
          })()}
        >
          <div
            className={(() => {
              const rummyPlay = roomState.game === "rummy" && roomState.phase !== "lobby";
              const compactPlay = !rummyPlay && roomState.phase !== "lobby";
              if (rummyPlay) return "h-full";
              if (compactPlay) return "w-full space-y-4";
              return "md:col-span-2 space-y-4";
            })()}
          >
            {roomState.phase === "lobby" && (
              <div className="bg-[#F6EDDB] border border-[#E8D8BE] rounded-xl p-6 text-center space-y-4">
                <RoomCodeShare code={roomState.code} game={roomState.game} />
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

            {roomState.phase !== "lobby" && roomState.game === "rps" && gameState != null && (
              <RpsBoard
                state={gameState as RpsState & { currentChoices: Partial<Record<string, "rock" | "paper" | "scissors">> }}
                players={roomState.players}
                selfId={playerId}
                messages={messages}
                roomCode={roomState.code}
                roomPhase={roomState.phase}
              />
            )}

            {roomState.phase !== "lobby" && roomState.game === "rummy" && gameState != null && (
              <RummyBoard
                state={gameState as RummyPlayerState}
                players={roomState.players}
                selfId={playerId}
                messages={messages}
                roomCode={roomState.code}
                onLeave={leaveRoom}
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

            {roomState.phase !== "lobby" && roomState.game === "handcricket" && gameState != null && (
              <HandCricketBoard
                state={gameState as HcState}
                players={roomState.players}
                selfId={playerId}
                messages={messages}
                roomCode={roomState.code}
                roomPhase={roomState.phase}
              />
            )}

            {roomState.phase !== "lobby" && roomState.game === "uno" && gameState != null && (
              <UnoBoard
                state={gameState as UnoState}
                players={roomState.players}
                selfId={playerId}
                messages={messages}
                roomCode={roomState.code}
                roomPhase={roomState.phase}
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
                    />
                  </PassPhoneGate>
                );
              })()
            )}

            {/* Generic rematch panel — host sees "Play Again", non-hosts see
                accept/decline when host requests, everyone sees the countdown.
                Rummy renders its own end-game scorecard inline with the board,
                so we skip this slot when Rummy is finished. */}
            {roomState.phase === "finished" && roomState.game !== "rummy" && (
              <div className="bg-[#F6EDDB] border border-[#E8D8BE] rounded-xl p-4">
                <RematchPanel players={roomState.players} selfId={playerId} />
              </div>
            )}
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
          className="w-full rounded-xl border border-[#D5BFA1] bg-white text-[#2A221B]
                     text-lg px-4 py-3 outline-none focus:border-[#EA5A1F]
                     focus:ring-2 focus:ring-[#EA5A1F]/30"
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
