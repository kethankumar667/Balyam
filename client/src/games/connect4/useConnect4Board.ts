import { useEffect, useMemo, useState } from "react";
import { getSocket } from "../../lib/socket";
import { HapticsManager } from "../../services/HapticsManager";
import { connect4Audio } from "./connect4Audio";
import { getConnect4Theme, type Connect4ThemeId } from "./connect4Themes";
import type { Connect4BoardProps } from "./Connect4BoardProps";
import { useConnect4Move } from "./useConnect4Move";
import { describeConnect4Outcome } from "./connect4Outcome";
import { useTurnSecondsLeft } from "../../components/TurnTimeWarning";
import { hasSeenConnect4Tutorial } from "./Connect4TutorialModal";
import { detectConnect4Threat } from "./connect4Threats";

type BoardHookProps = Pick<Connect4BoardProps, "state" | "players" | "selfId">;

/**
 * State, derived values, sound/haptic effects, and handlers shared by
 * Connect4BoardMobile and Connect4BoardDesktop. The two board components
 * were byte-for-byte identical from theme state through handleRematch,
 * diverging only in JSX/layout (and mobile's extra chat-sheet state) —
 * this hook is the single source of truth for that shared block so the
 * two layouts can never drift out of sync on game logic.
 */
export function useConnect4Board({ state, players, selfId }: BoardHookProps) {
  const [themeId, setThemeId] = useState<Connect4ThemeId>(() => {
    try {
      const saved = localStorage.getItem("bhalyam.connect4.theme");
      if (
        saved === "royal_parlour" ||
        saved === "cyber_arcade" ||
        saved === "championship_lounge"
      ) {
        return saved;
      }
    } catch {
      // Ignore storage read error
    }
    return "royal_parlour";
  });

  const [isMuted, setIsMuted] = useState(connect4Audio.isMuted());
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [tutorialOpen, setTutorialOpen] = useState(() => !hasSeenConnect4Tutorial());
  const [themeModalOpen, setThemeModalOpen] = useState(false);

  const theme = useMemo(() => getConnect4Theme(themeId), [themeId]);

  const selfDisc = state.playerDiscs[selfId];
  const { isPending, isMyTurn, dropDisc } = useConnect4Move({ state, selfId });
  const isOver = state.phase === "finished";
  const outcome = useMemo(
    () => describeConnect4Outcome(state, selfId, players),
    [state, selfId, players]
  );
  const isSpectator = selfDisc === undefined;

  const p1 = players.find((p) => p.id === state.playerOrder[0]) ?? players[0];
  const p2 = players.find((p) => p.id === state.playerOrder[1]) ?? players[1];

  const p1Disc = state.playerDiscs[p1?.id ?? ""] ?? "R";
  const p2Disc = state.playerDiscs[p2?.id ?? ""] ?? "Y";

  const p1DiscsPlaced = state.discsPlaced[p1?.id ?? ""] ?? 0;
  const p2DiscsPlaced = state.discsPlaced[p2?.id ?? ""] ?? 0;

  const secondsLeft = useTurnSecondsLeft(state.turnDeadline);
  const isTimerCritical =
    state.phase === "playing" &&
    state.turnDeadline != null &&
    secondsLeft <= 5 &&
    secondsLeft > 0;

  // Active Tactical Threat
  const threat = useMemo(() => {
    if (isOver) return null;
    return detectConnect4Threat(state.grid);
  }, [state.grid, isOver]);

  // Sound triggers on game events with depth pitch modulation and environmental profile
  useEffect(() => {
    if (state.lastMove) {
      connect4Audio.playDiscDrop(state.lastMove.row, theme.soundProfile);
      HapticsManager.trigger("turn");
    }
  }, [state.moveCount, theme.soundProfile]);

  useEffect(() => {
    if (isSpectator) return;
    if (outcome.kind === "win") {
      connect4Audio.playVictoryFanfare(theme.soundProfile);
      HapticsManager.trigger("win");
    } else if (outcome.kind === "loss") {
      connect4Audio.playDefeatDrone();
      HapticsManager.trigger("subtle");
    }
  }, [outcome.kind, isSpectator, theme.soundProfile]);

  const handleSelectTheme = (nextThemeId: Connect4ThemeId) => {
    setThemeId(nextThemeId);
    try {
      localStorage.setItem("bhalyam.connect4.theme", nextThemeId);
    } catch {
      // Ignore storage write error
    }
  };

  const handleMuteToggle = () => {
    const next = connect4Audio.toggleMute();
    setIsMuted(next);
  };

  const handleRematch = () => {
    getSocket().emit("rematch:request");
  };

  return {
    themeId,
    theme,
    handleSelectTheme,
    isMuted,
    handleMuteToggle,
    hoveredCol,
    setHoveredCol,
    tutorialOpen,
    setTutorialOpen,
    themeModalOpen,
    setThemeModalOpen,
    selfDisc,
    isPending,
    isMyTurn,
    dropDisc,
    isOver,
    outcome,
    isSpectator,
    p1,
    p2,
    p1Disc,
    p2Disc,
    p1DiscsPlaced,
    p2DiscsPlaced,
    secondsLeft,
    isTimerCritical,
    threat,
    handleRematch,
  };
}
