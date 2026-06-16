import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSocket } from "../lib/socket";
import { useRoomStore } from "../store/roomStore";
import PlayerList from "../components/PlayerList";
import Chat from "../components/Chat";
import RoomCode from "../components/RoomCode";
import RoomCodeShare from "../components/RoomCodeShare";
import VoicePanel from "../components/VoicePanel";
import LudoColorPicker from "../components/LudoColorPicker";
import CoinColorPicker from "../components/CoinColorPicker";
import RpsBoard from "../games/rps/RpsBoard";
import RummyBoard from "../games/rummy/RummyBoard";
import LudoBoard from "../games/ludo/LudoBoard";
import SnlBoard from "../games/snl/SnlBoard";
import HandCricketBoard from "../games/handcricket/HandCricketBoard";
import UnoBoard from "../games/uno/UnoBoard";
import type { GameKind, RpsState, RummyPlayerState, LudoState, SnlState, HcState, UnoState } from "@shared/types";

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
    setPlayerId,
    setRoomState,
    setGameState,
    addMessage,
    setError,
    reset,
  } = useRoomStore();

  useEffect(() => {
    if (!code) {
      navigate("/");
      return;
    }
    if (!playerName) {
      navigate("/");
      return;
    }
    const socket = getSocket();
    const joinName = playerName;
    const joinCode = code;

    function attemptJoin(reason: "initial" | "reconnect"): void {
      socket.emit(
        "room:join",
        { name: joinName, code: joinCode, playerId: playerId ?? undefined },
        (res) => {
          if (!res.ok) {
            const msg =
              res.error === "Room not found"
                ? reason === "reconnect"
                  ? "Room closed (server may have restarted). Returning to lobby…"
                  : "Room not found. Returning to lobby…"
                : res.error ?? "Could not join room";
            setError(msg);
            reset();
            setTimeout(() => navigate("/"), 1600);
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

    return () => {
      socket.off("connect", onConnect);
      socket.off("room:state", setRoomState);
      socket.off("game:state", setGameState);
      socket.off("chat:message", addMessage);
      socket.off("room:error", setError);
      socket.off("game:error", setError);
    };
  }, [code]);

  const selfIsHost = useMemo(
    () => roomState?.hostId === playerId,
    [roomState?.hostId, playerId]
  );

  const selfPlayer = useMemo(
    () => roomState?.players.find((p) => p.id === playerId) ?? null,
    [roomState?.players, playerId]
  );

  function toggleReady() {
    getSocket().emit("room:setReady", !selfPlayer?.isReady);
  }

  function startGame() {
    getSocket().emit("room:startGame");
  }

  function leaveRoom() {
    getSocket().emit("room:leave");
    reset();
    navigate("/");
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
          ? "bhalyam-font bhalyam-paper h-[100dvh] overflow-hidden p-0 sm:p-4"
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
        {/* Room header — hidden during Rummy play; Leave moves into the board header. */}
        {!(roomState.game === "rummy" && roomState.phase !== "lobby") && (
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
          className={
            roomState.game === "rummy" && roomState.phase !== "lobby"
              ? "h-full"
              : "grid md:grid-cols-3 gap-4"
          }
        >
          <div
            className={
              roomState.game === "rummy" && roomState.phase !== "lobby"
                ? "h-full"
                : "md:col-span-2 space-y-4"
            }
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
              <LudoBoard
                state={gameState as LudoState}
                players={roomState.players}
                selfId={playerId}
              />
            )}

            {roomState.phase !== "lobby" && roomState.game === "snl" && gameState != null && (
              <SnlBoard
                state={gameState as SnlState}
                players={roomState.players}
                selfId={playerId}
              />
            )}

            {roomState.phase !== "lobby" && roomState.game === "handcricket" && gameState != null && (
              <HandCricketBoard
                state={gameState as HcState}
                players={roomState.players}
                selfId={playerId}
              />
            )}

            {roomState.phase !== "lobby" && roomState.game === "uno" && gameState != null && (
              <UnoBoard
                state={gameState as UnoState}
                players={roomState.players}
                selfId={playerId}
              />
            )}

            {roomState.phase === "finished" && selfIsHost && (
              <div className="bg-[#F6EDDB] border border-[#E8D8BE] rounded-xl p-4 text-center">
                <button
                  onClick={() => {
                    getSocket().emit("room:setReady", false);
                  }}
                  className="text-sm text-[#786350] underline"
                >
                  Ready up to play again
                </button>
              </div>
            )}
          </div>

          {/* Side rail — hidden completely when Rummy is in play; access via header icons instead. */}
          {!(roomState.game === "rummy" && roomState.phase !== "lobby") && (
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
