import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useTutorialGate } from "../../components/GameTutorial";
import { useMediaQuery } from "../../lib/useMediaQuery";
import { HapticsManager } from "../../services/HapticsManager";
import { recordSoloScore } from "../../store/scorecardStore";
import { brainvitaAudio } from "./brainvitaAudio";
import { marbleCount, solveFrom, type Move } from "./brainvitaRules";
import { earnsHolo, loadSkin, loadTilt, loadUnlocked, saveSkin, saveTilt, saveUnlocked, type SkinId } from "./brainvitaSkins";
import { requestMotionPermission } from "./useParallax";
import { useJumpFlight } from "./useJumpFlight";
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
  const marbles = marbleCount(state.board);

  // ── motion: the jump animation and the tilt both stand down for anyone who asked for less movement ──
  const isReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const { flight, burst } = useJumpFlight(state.moves, !isReducedMotion);

  // ── looks: the wood table is always there; the holo table is earned ───────────────────────────
  const [unlocked, setUnlocked] = useState<readonly SkinId[]>(loadUnlocked);
  const [skin, setSkin] = useState<SkinId>(loadSkin);
  const [justUnlocked, setJustUnlocked] = useState<SkinId | null>(null);
  const unlockedRef = useRef(unlocked);
  unlockedRef.current = unlocked;

  const selectSkin = useCallback((next: SkinId) => {
    if (!unlockedRef.current.includes(next)) return;
    setSkin(next);
    saveSkin(next);
  }, []);
  const dismissUnlock = useCallback(() => setJustUnlocked(null), []);

  const [isTiltPreferred, setIsTiltPreferred] = useState(loadTilt);
  const [tiltNote, setTiltNote] = useState<string | null>(null);
  const tiltRef = useRef(isTiltPreferred);
  tiltRef.current = isTiltPreferred;

  const toggleTilt = useCallback(async () => {
    if (tiltRef.current) {
      setIsTiltPreferred(false);
      saveTilt(false);
      setTiltNote(null);
      return;
    }
    // iOS only asks when a tap asks, so this has to run straight from the switch.
    const permission = await requestMotionPermission();
    if (permission === "denied") {
      setTiltNote("Motion access was refused, so the board cannot follow your phone.");
      return;
    }
    if (permission === "unsupported") {
      setTiltNote("This device has no motion sensor.");
      return;
    }
    setIsTiltPreferred(true);
    saveTilt(true);
    setTiltNote(null);
  }, []);

  // ── the drone under the game: thins with every marble, resolves at the end, silent between games ───
  useEffect(() => {
    if (state.moves.length === 0) brainvitaAudio.stopAmbient();
    else if (!finished) brainvitaAudio.setAmbient(marbles);
  }, [state.moves.length, finished, marbles]);
  useEffect(() => () => brainvitaAudio.stopAmbient(), []);

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
      brainvitaAudio.resolveAmbient(true);
      HapticsManager.getInstance().win();
    } else {
      brainvitaAudio.playStuck();
      brainvitaAudio.resolveAmbient(false);
    }

    // The holo table is the reward for a clean, strong game. Help forfeits it, as it forfeits the leaderboard.
    if (earnsHolo(result) && !unlockedRef.current.includes("holo")) {
      const next: readonly SkinId[] = [...unlockedRef.current, "holo"];
      saveUnlocked(next);
      setUnlocked(next);
      setJustUnlocked("holo");
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
    setJustUnlocked(null);
    dispatch({ type: "restart" });
  }, []);

  const closeResult = useCallback(() => setResultOpen(false), []);

  const [isMuted, setIsMuted] = useState(brainvitaAudio.isMuted());
  const toggleMute = useCallback(() => {
    const muted = brainvitaAudio.toggleMute();
    setIsMuted(muted);
    // Unmuting mid-game brings the drone back at the right thickness for the board as it stands.
    const now = stateRef.current;
    if (!muted && now.moves.length > 0 && !isFinished(now)) brainvitaAudio.setAmbient(marbleCount(now.board));
  }, []);

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
    flight,
    burst,
    skin,
    unlockedSkins: unlocked,
    selectSkin,
    justUnlocked,
    dismissUnlock,
    isTiltAvailable: !isReducedMotion,
    isTiltOn: isTiltPreferred && !isReducedMotion,
    tiltNote,
    toggleTilt,
    canUndo: jumps > 0,
    tap,
    undo,
    restart,
    requestHint,
    closeResult,
    toggleMute,
  };
}
