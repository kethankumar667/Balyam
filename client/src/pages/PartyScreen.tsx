import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { Tv, LogIn, UserPlus } from "lucide-react";
import type { Player, RoomPublicState } from "@shared/types";
import { getSocket } from "../lib/socket";
import { useCapabilities, currentAccessToken, useAuthStore } from "../store/authStore";
import { TvHeader } from "./party/TvHeader";
import { TvLobbyView } from "./party/TvLobbyView";
import { TvGameArena } from "./party/TvGameArena";
import { TvVictoryPodium } from "./party/TvVictoryPodium";
import { useTvAudio } from "./party/useTvAudio";
import { useTvScreenShake } from "./party/useTvScreenShake";
import { TvCrowdReactions } from "./party/TvCrowdReactions";
import { TvClimaxBanner, isGameInClimax } from "./party/TvClimaxBanner";
import { TvCommentaryTicker } from "./party/TvCommentaryTicker";
import type { TvActiveTurnInfo, TvPodiumEntry } from "./party/types";

/**
 * Smart TV / Party Mode — the big-screen living-room spectator experience.
 *
 * Open `/tv/<CODE>` on a TV, console browser, or laptop plugged into a TV/projector.
 * Seated players hold their smartphones as wireless gamepad controllers.
 *
 * Security & Boundary Guarantee:
 * - This spectator screen takes ZERO player seats.
 * - It receives ONLY public room and game states (room.engine.getPublicState()).
 * - Private player cards and hidden hands NEVER reach this screen.
 * - Sized for 10-foot viewing (3+ meters away) with high-contrast arcade styling.
 */
export default function PartyScreen() {
  const { code } = useParams<{ code: string }>();
  const [room, setRoom] = useState<RoomPublicState | null>(null);
  const [gameState, setGameState] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const canSpectate = useCapabilities().spectate;

  // Active turn extraction
  const activeTurn = useMemo<TvActiveTurnInfo>(() => {
    const defaultTurn: TvActiveTurnInfo = {
      playerId: "",
      name: "Waiting...",
      deadlineMs: null,
    };

    if (!room || !gameState) {
      if (room?.players?.[0]) {
        return {
          playerId: room.players[0].id,
          name: room.players[0].name,
          avatar: room.players[0].avatar,
          color: undefined,
          deadlineMs: null,
        };
      }
      return defaultTurn;
    }

    // Try turnPlayerId first (standard across Rummy, Ludo, SnL, UNO, etc.)
    const turnPlayerId =
      (gameState.turnPlayerId as string | undefined) ??
      (gameState.batterId as string | undefined) ??
      (gameState.activePlayerId as string | undefined);

    const player = room.players.find((p) => p.id === turnPlayerId) ?? room.players[0];

    const deadlineMs =
      typeof gameState.turnDeadline === "number"
        ? gameState.turnDeadline
        : typeof gameState.arrangeDeadline === "number"
        ? gameState.arrangeDeadline
        : null;

    const actionText =
      typeof gameState.turnPhase === "string"
        ? gameState.turnPhase
        : typeof gameState.turnAction === "string"
        ? gameState.turnAction
        : typeof gameState.lastAction === "string"
        ? gameState.lastAction
        : undefined;

    return {
      playerId: player?.id ?? "",
      name: player?.name ?? "Player",
      avatar: player?.avatar,
      color: undefined,
      actionText,
      deadlineMs,
    };
  }, [room, gameState]);

  // Audio system hook
  const { isAudioUnlocked, isMuted, unlockAudio, toggleMute } = useTvAudio({
    phase: room?.phase ?? "lobby",
    turnDeadline: activeTurn.deadlineMs,
    activePlayerId: activeTurn.playerId,
  });

  // Screen shake engine
  const { shakeLevel, triggerShake } = useTvScreenShake({
    game: room?.game,
    gameState,
  });

  // Climax / Sudden Death status
  const inClimax = useMemo(() => {
    return room ? isGameInClimax(room.game, gameState) : false;
  }, [room, gameState]);

  // Socket spectator subscription & lifecycle
  useEffect(() => {
    if (!code) return;
    if (!canSpectate) return;

    const socket = getSocket();
    const upperCode = code.toUpperCase();

    const attach = () => {
      socket.emit(
        "room:spectate",
        {
          code: upperCode,
          accessToken: currentAccessToken(),
          accountKind: useAuthStore.getState().kind,
        },
        (res) => {
          if (res.ok) {
            setConnected(true);
            setError(null);
          } else {
            setError(res.error ?? "Could not attach to that room");
          }
        }
      );
    };

    const onRoomState = (state: RoomPublicState) => {
      setRoom(state);
    };

    const onGameState = (st: unknown) => {
      setGameState(st as Record<string, unknown> | null);
    };

    socket.on("room:state", onRoomState);
    socket.on("game:state", onGameState);
    socket.on("connect", attach);

    attach();

    return () => {
      socket.off("room:state", onRoomState);
      socket.off("game:state", onGameState);
      socket.off("connect", attach);
      socket.emit("room:stopSpectate");
    };
  }, [code, canSpectate]);

  // Screen WakeLock: prevents TV/monitor from sleeping during long game sessions
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      try {
        if ("wakeLock" in navigator) {
          lock = await navigator.wakeLock.request("screen");
        }
      } catch {
        // Ignored if denied or unsupported
      }
    };

    void request();

    const onVisible = () => {
      if (document.visibilityState === "visible" && !cancelled) void request();
    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => {});
    };
  }, []);

  // Global Keyboard Shortcuts (Space: Audio Mute Toggle, F: Fullscreen)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        toggleMute();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        if (!document.fullscreenElement) {
          void document.documentElement.requestFullscreen().catch(() => {});
        } else {
          void document.exitFullscreen().catch(() => {});
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [toggleMute]);

  // Compute Victory Podium entries when finished
  const podiumEntries = useMemo<TvPodiumEntry[]>(() => {
    if (!room || room.phase !== "finished") return [];

    const players = room.lastMatchPlayers ?? room.players;
    const winnerId = (gameState?.winnerId as string | undefined) ?? (gameState?.winner as string | undefined);

    // If there is an explicit champion or winnerId
    if (winnerId) {
      const winner = players.find((p) => p.id === winnerId);
      const others = players.filter((p) => p.id !== winnerId);
      const result: TvPodiumEntry[] = [];

      if (winner) {
        result.push({
          rank: 1,
          playerId: winner.id,
          name: winner.name,
          avatar: winner.avatar,
          scoreOrStat: "Champion",
          isHost: winner.isHost,
          isBot: winner.isBot,
        });
      }

      others.forEach((p, idx) => {
        result.push({
          rank: idx + 2,
          playerId: p.id,
          name: p.name,
          avatar: p.avatar,
          scoreOrStat: `#${idx + 2}`,
          isHost: p.isHost,
          isBot: p.isBot,
        });
      });

      return result;
    }

    // Default ranking based on order
    return players.map((p, idx) => ({
      rank: idx + 1,
      playerId: p.id,
      name: p.name,
      avatar: p.avatar,
      scoreOrStat: idx === 0 ? "1st Place" : `#${idx + 1}`,
      isHost: p.isHost,
      isBot: p.isBot,
    }));
  }, [room, gameState]);

  const hostPlayer = useMemo(() => {
    return room?.players.find((p) => p.isHost);
  }, [room]);

  // Gate check: guest accounts see TV instructions
  if (!canSpectate) {
    return (
      <TvShell>
        <div className="w-full max-w-xl p-8 rounded-3xl bg-black/60 border border-amber-900/50 shadow-2xl backdrop-blur-md text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-2">
            <Tv className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-black text-amber-100">Party Mode Needs an Account</h2>
          <p className="text-sm sm:text-base text-amber-200/80 leading-relaxed">
            Putting a table on the big screen is an account feature. Sign in or create a free member
            account to host the living-room TV arcade!
          </p>
          <div className="flex items-center gap-3 mt-4">
            <Link
              to="/signup?from=tv"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 font-bold text-sm shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Free Account</span>
            </Link>
            <Link
              to="/login?from=tv"
              className="px-6 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 border border-amber-900/40 text-amber-200 font-bold text-sm active:scale-95 transition-all flex items-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </Link>
          </div>
        </div>
      </TvShell>
    );
  }

  if (error) {
    return (
      <TvShell>
        <div className="p-8 rounded-3xl bg-black/70 border border-rose-900/50 shadow-2xl text-center max-w-md">
          <h2 className="text-2xl font-black text-rose-300 mb-2">{error}</h2>
          <p className="text-sm text-stone-400 mb-6">
            Please check the 6-character room code on the host&apos;s phone.
          </p>
          <Link
            to="/"
            className="px-6 py-2.5 rounded-xl bg-amber-500 text-stone-950 font-bold text-sm hover:bg-amber-400 transition"
          >
            Return to Lounge
          </Link>
        </div>
      </TvShell>
    );
  }

  if (!room) {
    return (
      <TvShell>
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Tv className="w-8 h-8 animate-pulse" />
          </div>
          <p className="text-xl font-bold font-mono tracking-wider text-amber-200/90">
            {connected ? "SYNCING ROOM BROADCAST…" : "CONNECTING TO STADIUM…"}
          </p>
        </div>
      </TvShell>
    );
  }

  return (
    <TvShell shakeLevel={shakeLevel} inClimax={inClimax}>
      {/* Top TV Status Bar */}
      <TvHeader
        roomCode={room.code}
        game={room.game}
        roomName={room.name}
        phase={room.phase}
        spectatorCount={room.spectatorCount}
        isAudioUnlocked={isAudioUnlocked}
        isMuted={isMuted}
        onToggleAudio={toggleMute}
        climaxBanner={<TvClimaxBanner game={room.game} gameState={gameState} />}
      />

      {/* Main Content Area based on Room Phase */}
      <main className="flex-1 w-full flex flex-col justify-center items-center min-h-0 overflow-hidden relative">
        {room.phase === "lobby" && (
          <TvLobbyView
            roomCode={room.code}
            players={room.players}
            maxPlayers={room.maxPlayers}
            game={room.game}
            isAudioUnlocked={isAudioUnlocked}
            onUnlockAudio={unlockAudio}
          />
        )}

        {room.phase === "playing" && (
          <TvGameArena
            room={room}
            gameState={gameState}
            activeTurn={activeTurn}
          />
        )}

        {room.phase === "finished" && (
          <TvVictoryPodium
            entries={podiumEntries}
            roomName={room.name}
            gameName={room.game.toUpperCase()}
            hostPlayer={hostPlayer}
          />
        )}

        {/* Live Audience Reactions & Throwables Canvas */}
        <TvCrowdReactions
          players={room.players}
          onTriggerShake={triggerShake}
        />
      </main>

      {/* Live Play-by-Play Commentary Lower-Third Ticker during Active Match */}
      {room.phase === "playing" && (
        <TvCommentaryTicker
          game={room.game}
          gameState={gameState}
          players={room.players}
          activePlayerName={activeTurn.name}
        />
      )}
    </TvShell>
  );
}

function TvShell({
  children,
  shakeLevel = "none",
  inClimax = false,
}: {
  children: React.ReactNode;
  shakeLevel?: "none" | "subtle" | "intense";
  inClimax?: boolean;
}) {
  const shakeClass =
    shakeLevel === "intense"
      ? "tv-shake-intense"
      : shakeLevel === "subtle"
      ? "tv-shake-subtle"
      : "";

  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-between p-2.5 sm:p-4 overflow-hidden select-none bg-[#0B0F19] text-[#F8FAFC] transition-all duration-300 ${shakeClass} ${
        inClimax ? "tv-climax-border border-4 border-amber-500/80" : ""
      }`}
      style={{
        backgroundImage: inClimax
          ? "radial-gradient(ellipse at 50% 10%, rgba(239, 68, 68, 0.25) 0%, rgba(11, 15, 25, 0.98) 70%)"
          : "radial-gradient(ellipse at 50% 10%, rgba(245, 158, 11, 0.12) 0%, rgba(11, 15, 25, 0.98) 70%)",
      }}
    >
      {children}
    </div>
  );
}
