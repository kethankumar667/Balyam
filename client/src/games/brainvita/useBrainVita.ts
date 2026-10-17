import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useTutorialGate } from "../../components/GameTutorial";
import { HapticsManager } from "../../services/HapticsManager";
import { recordSoloScore } from "../../store/scorecardStore";
import { brainvitaAudio } from "./brainvitaAudio";
import { solveFrom, type Move } from "./brainvitaRules";
import { createGameState, gameResult, isFinished, reduceGame, targetsOf, type GameResult } from "./brainvitaGame";

/** The Game Academy is found by the first segment of this key; the rest is the seen-it flag. */
export const BRAINVITA_TUTORIAL_KEY = "brainvita.tutorial.completed.v1";
export const BRAINVITA_MODE_ID = "classic";

const NO_SOLUTION_NOTE = "No way to finish on one marble from here. Try undo.";

/**
 * Everything a Brain Vita screen needs: the game state, a clock that runs from the first jump, hints
 * from the solver, sounds, and posting an unassisted result to the leaderboard. The phone and desktop
 * layouts differ only in how they draw this.
 */
export function useBrainVita() {
  const [state, dispatch] = useReducer(reduceGame, undefined, createGameState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const finished = isFinished(state);
  const result: GameResult | null = useMemo(() => (finished ? gameResult(state) : null), [finished, state]);
  const lastMove: Move | null = state.moves.length > 0 ? state.moves[state.moves.length - 1] : null;

  // ── the clock: from the first jump to the last ────────────────────────────────────────────────
  const [seconds, setSeconds] = useState(0);
  const startedAt = useRef<number | null>(null);
  const jumps = state.moves.length;

  useEffect(() => {
    if (jumps === 0) {
      startedAt.current = null;
      setSeconds(0);
      return;
    }
    if (startedAt.current === null) startedAt.current = Date.now();
    const elapsed = () => Math.floor((Date.now() - (startedAt.current ?? Date.now())) / 1000);
    setSeconds(elapsed());
    if (finished) return;
    const timer = window.setInterval(() => setSeconds(elapsed()), 1000);
    return () => window.clearInterval(timer);
  }, [jumps, finished]);

  // ── hints ──────────────────────────────────────────────────────────────────────────────────────
  const [hintNote, setHintNote] = useState<string | null>(null);

  const requestHint = useCallback(() => {
    if (isFinished(stateRef.current)) return;
    // The search can take a moment on a fresh board, so let the tap register first.
    window.setTimeout(() => {
      const solution = solveFrom(stateRef.current.board);
      const move = solution !== null && solution.length > 0 ? solution[0] : null;
      setHintNote(move === null ? NO_SOLUTION_NOTE : null);
      dispatch({ type: "hint", move });
    }, 0);
  }, []);

  useEffect(() => {
    if (state.hint !== null) setHintNote(null);
  }, [state.hint]);

  // ── finishing: sound, the results dialog, and posting an unassisted result ───────────────────
  const [resultOpen, setResultOpen] = useState(false);
  const [newPersonalBest, setNewPersonalBest] = useState(false);
  const gameId = useRef(0);
  const handled = useRef(false);

  useEffect(() => {
    if (!finished || result === null) {
      handled.current = false;
      setResultOpen(false);
      return;
    }
    if (handled.current) return;
    handled.current = true;
    setResultOpen(true);
    if (result.marblesLeft === 1) {
      brainvitaAudio.playWin();
      HapticsManager.getInstance().win();
    } else {
      brainvitaAudio.playStuck();
    }

    // A hint or an undo hands over (part of) the answer, so that result is for practice and never posted;
    // "personal best" is claimed only if the scorecard confirms it.
    if (result.usedHelp) return;
    const thisGame = gameId.current;
    void recordSoloScore("brainvita", BRAINVITA_MODE_ID, result.marblesLeft, { seconds, moves: result.moves })
      .then((recorded) => {
        if (gameId.current === thisGame && recorded?.isNewPersonalBest) setNewPersonalBest(true);
      })
      .catch(() => {});
    // `seconds` is read at the moment of finishing, not re-run when the clock stops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, result]);

  // ── actions ───────────────────────────────────────────────────────────────────────────────────
  const tap = useCallback((hole: number) => {
    const before = stateRef.current;
    if (isFinished(before)) return;
    dispatch({ type: "tap", hole });
    const hadSelection = before.selected !== null;
    const isLanding = hadSelection && targetsOf(before).includes(hole);
    if (isLanding) {
      brainvitaAudio.playJump();
      HapticsManager.getInstance().subtle();
    } else if (before.board[hole]) {
      brainvitaAudio.playPick();
    } else if (hadSelection) {
      brainvitaAudio.playRefuse();
    }
  }, []);

  const undo = useCallback(() => dispatch({ type: "undo" }), []);

  const restart = useCallback(() => {
    gameId.current += 1;
    setNewPersonalBest(false);
    setHintNote(null);
    dispatch({ type: "restart" });
  }, []);

  const closeResult = useCallback(() => setResultOpen(false), []);

  const [isMuted, setIsMuted] = useState(brainvitaAudio.isMuted());
  const toggleMute = useCallback(() => setIsMuted(brainvitaAudio.toggleMute()), []);

  // Auto-open the lesson once, but never mid-game.
  const tutorial = useTutorialGate(BRAINVITA_TUTORIAL_KEY, jumps === 0);

  return {
    state,
    targets: targetsOf(state),
    lastMove,
    finished,
    result,
    seconds,
    hintNote,
    resultOpen,
    newPersonalBest,
    isMuted,
    tutorial,
    canUndo: jumps > 0,
    tap,
    undo,
    restart,
    requestHint,
    closeResult,
    toggleMute,
  };
}
