import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ChatMessage,
  DotsBoxesPublicState,
  Player,
} from "@shared/types";
import { getSocket } from "../../lib/socket";
import { useTurnHaptics } from "../../hooks/useHaptics";
import {
  getPlayerTheme,
  getPlayerThemeByColor,
  type DotsBoxesPlayerTheme,
  type DotsBoxesSkin,
} from "./dotsboxes-theme";
import { AudioManager } from "../../services/AudioManager";
import { useTurnSecondsLeft } from "../../components/TurnTimeWarning";

export interface DotsBoxesBoardProps {
  state: DotsBoxesPublicState;
  players: Player[];
  selfId: string | null;
  messages?: ChatMessage[];
  roomCode?: string;
  roomPhase?: string;
  onLeave?: () => void;
  onScorecardClose?: () => void;
}

export interface ActivityEvent {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  badge: string;
  timestamp: string;
}

export interface RankedPlayer {
  pid: string;
  name: string;
  score: number;
  theme: DotsBoxesPlayerTheme;
  avatar?: string;
  rank: number;
}

export interface DotsBoxesBoardModel {
  state: DotsBoxesPublicState;
  players: Player[];
  selfId: string | null;
  size: number;
  boxesPerSide: number;
  totalBoxes: number;
  targetBoxes: number;
  isFinished: boolean;
  myTurn: boolean;
  canPlay: boolean;
  secondsLeft: number;
  skin: DotsBoxesSkin;
  setSkin: (skin: DotsBoxesSkin) => void;
  toggleSkin: () => void;
  themeOf: (id: string) => DotsBoxesPlayerTheme;
  nameOf: (id: string) => string;
  avatarOf: (id: string) => string | undefined;
  isBot: (id: string) => boolean;
  scoreOf: (id: string) => number;
  activities: ActivityEvent[];
  undoCount: number;
  useUndo: () => void;
  isMuted: boolean;
  toggleMute: () => void;
  error: string | null;
  showScorecard: boolean;
  setShowScorecard: (v: boolean) => void;
  rankedPlayers: RankedPlayer[];
  winner: RankedPlayer | null;
  isTie: boolean;
  drawLine: (kind: "h" | "v", r: number, c: number) => void;
  comboStreak: number;
  comboBanner: string | null;
  lastClosedClaim: { r: number; c: number; ownerId: string } | null;
}

export function useDotsBoxesBoard(props: DotsBoxesBoardProps): DotsBoxesBoardModel {
  const { state, players, selfId, roomPhase } = props;
  const size = state.options.boardSize;
  const boxesPerSide = size - 1;
  const totalBoxes = boxesPerSide * boxesPerSide;
  const targetBoxes = Math.max(1, Math.ceil(totalBoxes / Math.max(2, state.playerOrder.length)) + 2);
  
  // Skin mode (default to realistic notebook)
  const [skin, setSkinState] = useState<DotsBoxesSkin>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("bhalyam.dotsboxes.skin");
      if (saved === "neon" || saved === "notebook") return saved;
    }
    return "notebook";
  });

  useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem("bhalyam.dotsboxes.skin");
      if (saved === "neon" || saved === "notebook") {
        setSkinState(saved);
      }
    };
    window.addEventListener("dotsboxes:skinChange", handleStorage);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("dotsboxes:skinChange", handleStorage);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const setSkin = useCallback((newSkin: DotsBoxesSkin) => {
    setSkinState(newSkin);
    if (typeof window !== "undefined") {
      localStorage.setItem("bhalyam.dotsboxes.skin", newSkin);
      window.dispatchEvent(new Event("dotsboxes:skinChange"));
    }
  }, []);

  const toggleSkin = useCallback(() => {
    setSkin(skin === "notebook" ? "neon" : "notebook");
  }, [skin, setSkin]);

  const isFinished =
    state.phase === "finished" ||
    roomPhase === "finished" ||
    state.claims.length >= totalBoxes;

  const myTurn = !isFinished && state.turnPlayerId === selfId;
  const canPlay = !isFinished && myTurn && state.phase === "playing";

  // Real-time 30s turn timer remaining
  const secondsLeft = useTurnSecondsLeft(state.turnDeadline);

  // Self-contained audio manager subscription
  const [isMuted, setIsMuted] = useState(() => AudioManager.getInstance().getSettings().isMuted);

  useEffect(() => {
    const audio = AudioManager.getInstance();
    return audio.subscribe((settings) => setIsMuted(settings.isMuted));
  }, []);

  const toggleMute = useCallback(() => {
    AudioManager.getInstance().toggleMute();
  }, []);

  useTurnHaptics(state.phase === "playing" && !isFinished ? state.turnPlayerId : null, selfId);

  // Scorecard modal state
  const [showScorecard, setShowScorecard] = useState(isFinished);
  useEffect(() => {
    if (isFinished) {
      setShowScorecard(true);
    }
  }, [isFinished]);

  // Player helper functions — Always return real player name so initials (e.g. "K" for kethan) work
  const nameOf = useCallback(
    (id: string): string => {
      const found = players.find((p) => p.id === id);
      if (found?.name) return found.name;
      return id === selfId ? "You" : "Player";
    },
    [players, selfId]
  );

  const themeOf = useCallback(
    (id: string): DotsBoxesPlayerTheme => {
      const seatIndex = state.playerOrder.indexOf(id);
      const safeIndex = seatIndex >= 0 ? seatIndex : 0;
      const p = players.find((pl) => pl.id === id);
      if (p?.penColor) {
        const custom = getPlayerThemeByColor(p.penColor, skin, safeIndex);
        if (custom) return custom;
      }
      return getPlayerTheme(safeIndex, skin);
    },
    [players, state.playerOrder, skin]
  );

  const avatarOf = useCallback(
    (id: string): string | undefined => players.find((p) => p.id === id)?.avatar,
    [players]
  );

  const isBot = useCallback(
    (id: string): boolean => !!players.find((p) => p.id === id)?.isBot,
    [players]
  );

  const scoreOf = useCallback(
    (id: string): number => state.scores[id] ?? 0,
    [state.scores]
  );

  // Ranked leaderboard
  const rankedPlayers = useMemo((): RankedPlayer[] => {
    return [...state.playerOrder]
      .map((pid) => ({
        pid,
        name: nameOf(pid),
        score: scoreOf(pid),
        theme: themeOf(pid),
        avatar: avatarOf(pid),
      }))
      .sort((a, b) => b.score - a.score)
      .map((p, idx) => ({ ...p, rank: idx + 1 }));
  }, [state.playerOrder, nameOf, scoreOf, themeOf, avatarOf]);

  const winner = rankedPlayers[0] ?? null;
  const isTie = rankedPlayers.length >= 2 && rankedPlayers[0].score === rankedPlayers[1].score;

  // Activity Feed Logger & Combo Tracker
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const prevClaimsCount = useRef(0);
  const [comboStreak, setComboStreak] = useState(0);
  const [comboBanner, setComboBanner] = useState<string | null>(null);
  const [lastClosedClaim, setLastClosedClaim] = useState<{ r: number; c: number; ownerId: string } | null>(null);
  const prevTurnPlayerRef = useRef(state.turnPlayerId);

  // Reset combo streak on turn change
  useEffect(() => {
    if (state.turnPlayerId !== prevTurnPlayerRef.current) {
      setComboStreak(0);
      prevTurnPlayerRef.current = state.turnPlayerId;
    }
  }, [state.turnPlayerId]);

  useEffect(() => {
    if (state.claims.length > prevClaimsCount.current) {
      const newClaims = state.claims.slice(prevClaimsCount.current);
      prevClaimsCount.current = state.claims.length;

      const latest = newClaims[newClaims.length - 1];
      if (latest) {
        setLastClosedClaim({ r: latest.r, c: latest.c, ownerId: latest.ownerId });
      }

      // Update combo streak
      const streak = newClaims.length > 1 ? newClaims.length : comboStreak + 1;
      setComboStreak(streak);

      if (streak === 2) {
        setComboBanner("DOUBLE BOX! 🔥");
      } else if (streak === 3) {
        setComboBanner("TRIPLE COMBO! ⚡");
      } else if (streak >= 4) {
        setComboBanner("CHAIN MASTER! 👑");
      }

      const timer = setTimeout(() => {
        setComboBanner(null);
      }, 2500);

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      const newEvents: ActivityEvent[] = newClaims.map((claim, i) => {
        const pName = nameOf(claim.ownerId);
        return {
          id: `${claim.closedAt}-${i}`,
          playerId: claim.ownerId,
          playerName: pName,
          text: `${pName} completed a box`,
          badge: "+1 Box",
          timestamp: timeStr,
        };
      });

      setActivities((prev) => [...newEvents, ...prev].slice(0, 15));
      return () => clearTimeout(timer);
    }
  }, [state.claims, nameOf, comboStreak]);

  // Undo System (3 per round visual budget)
  const [undoCount, setUndoCount] = useState(3);
  const useUndo = useCallback(() => {
    if (undoCount > 0) {
      setUndoCount((c) => Math.max(0, c - 1));
    }
  }, [undoCount]);

  // Move dispatch
  const [error, setError] = useState<string | null>(null);

  const drawLine = useCallback(
    (kind: "h" | "v", r: number, c: number) => {
      if (!canPlay) return;
      getSocket().emit("game:move", {
        type: "draw",
        data: { kind, r, c },
        playerId: selfId ?? undefined,
      });
      setError(null);
    },
    [canPlay, selfId]
  );

  return {
    state,
    players,
    selfId,
    size,
    boxesPerSide,
    totalBoxes,
    targetBoxes,
    isFinished,
    myTurn,
    canPlay,
    secondsLeft,
    skin,
    setSkin,
    toggleSkin,
    themeOf,
    nameOf,
    avatarOf,
    isBot,
    scoreOf,
    activities,
    undoCount,
    useUndo,
    isMuted,
    toggleMute,
    error,
    showScorecard,
    setShowScorecard,
    rankedPlayers,
    winner,
    isTie,
    drawLine,
    comboStreak,
    comboBanner,
    lastClosedClaim,
  };
}
