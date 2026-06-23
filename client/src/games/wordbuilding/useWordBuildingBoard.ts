import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ChatMessage,
  Player,
  WordBuildingPublicState,
  WordBuildingScoredWord,
} from "@shared/types";
import { getSocket } from "../../lib/socket";
import { hasSeenWordBuildingTutorial } from "./TutorialModal";
import { useTurnHaptics } from "../../hooks/useHaptics";
import { useTurnSecondsLeft } from "../../components/TurnTimeWarning";
import { inkFor, type Ink } from "./inks";

/**
 * Shared props for every Word Building shell (picker, mobile, desktop).
 * `messages`/`roomPhase` are accepted to match Room.tsx but intentionally
 * unused — the Word Building board has no in-board chat rail today (see
 * REFACTOR_AUDIT.md B9/C1). Preserved as-is; not wired.
 */
export interface WordBuildingBoardProps {
  state: WordBuildingPublicState;
  players: Player[];
  selfId: string | null;
  messages?: ChatMessage[];
  roomCode?: string;
  roomPhase?: string;
}

export interface WordBuildingBoardModel {
  size: number;
  myTurn: boolean;
  canPlay: boolean;
  tutorialOpen: boolean;
  setTutorialOpen: (open: boolean) => void;
  reportDismissed: boolean;
  setReportDismissed: (dismissed: boolean) => void;
  inkOf: Record<string, Ink>;
  nameOf: (id: string) => string;
  cellOverlays: Map<string, WordBuildingScoredWord[]>;
  activeAnnotation: WordBuildingScoredWord | null;
  activePulse: WordBuildingScoredWord | null;
  selected: { r: number; c: number } | null;
  setSelected: (cell: { r: number; c: number } | null) => void;
  error: string | null;
  pickCell: (r: number, c: number) => void;
  placeLetter: (letter: string) => void;
  remainingSec: number | null;
}

/**
 * useWordBuildingBoard — the board's entire logic, layout-free.
 *
 * Mounted exactly once (in whichever shell the picker selects) so the place
 * socket emit, the keyboard listener, the turn-haptic cue and the score-FX
 * timers never double-fire.
 */
export function useWordBuildingBoard({
  state,
  players,
  selfId,
}: WordBuildingBoardProps): WordBuildingBoardModel {
  const size = state.options.boardSize;
  const myTurn = state.turnPlayerId === selfId;
  const canPlay = myTurn && state.phase === "playing";

  // Buzz the device once per transition into your turn — same hook
  // Rummy / Ludo / SnL use, so the cue is consistent across BHALYAM.
  useTurnHaptics(state.phase === "playing" ? state.turnPlayerId : null, selfId);

  // Auto-open the tutorial on the very first Word Building session (per
  // browser). The "?" button on the header re-opens it anytime.
  const [tutorialOpen, setTutorialOpen] = useState<boolean>(
    () => !hasSeenWordBuildingTutorial(),
  );

  // End-of-round scorecard dismissed flag — re-opens automatically when
  // the phase flips back to "playing" (a future pool-style rematch).
  const [reportDismissed, setReportDismissed] = useState(false);
  useEffect(() => {
    if (state.phase === "playing") setReportDismissed(false);
  }, [state.phase]);

  // Map playerId → ink based on seat order.
  const inkOf = useMemo(() => {
    const map: Record<string, Ink> = {};
    state.playerOrder.forEach((pid, idx) => {
      map[pid] = inkFor(idx);
    });
    return map;
  }, [state.playerOrder]);

  const nameOf = (id: string): string =>
    players.find((p) => p.id === id)?.name ?? "?";

  // Cell -> { color, word } map of the most recent scored word that covers
  // each cell. Overlapping words layer via stacked underlines (see render).
  const cellOverlays = useMemo(() => {
    const map = new Map<string, WordBuildingScoredWord[]>();
    for (const w of state.scoredWords) {
      for (const c of w.cells) {
        const k = `${c.r},${c.c}`;
        const arr = map.get(k) ?? [];
        arr.push(w);
        map.set(k, arr);
      }
    }
    return map;
  }, [state.scoredWords]);

  /* ─── Score events (annotation + cell pulse) ──────────────────────────
   *
   * Watch `state.scoredWords` for new entries (anything we haven't seen
   * since this component mounted). Each fresh score fires:
   *   • annotation — fades in next to the last cell of the word, holds
   *     for ~2.2 s, fades out. AnimatePresence handles the exit.
   *   • cellPulse  — short glow over the word's cells, ~1.4 s.
   * Both are decorative and pointer-events-none so they NEVER block the
   * next player from clicking. We track the latest event of each by id
   * and let timers clear them; older words quietly stop pulsing.
   */
  const [activeAnnotation, setActiveAnnotation] = useState<WordBuildingScoredWord | null>(null);
  const [activePulse, setActivePulse] = useState<WordBuildingScoredWord | null>(null);
  const seenWordIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    // First mount: seed the set so we don't fire a burst of annotations
    // for a mid-game rejoin.
    if (seenWordIdsRef.current.size === 0 && state.scoredWords.length > 0) {
      for (const w of state.scoredWords) seenWordIdsRef.current.add(w.id);
      return;
    }
    const fresh = state.scoredWords.filter((w) => !seenWordIdsRef.current.has(w.id));
    if (fresh.length === 0) return;
    for (const w of fresh) seenWordIdsRef.current.add(w.id);
    // If two fire in the same render (rare — a single placement closes
    // both a row and column word), prefer the higher-scoring one for
    // the annotation slot.
    const top = fresh.reduce((a, b) => (a.points >= b.points ? a : b));
    setActiveAnnotation(top);
    setActivePulse(top);
    const aT = window.setTimeout(() => {
      setActiveAnnotation((cur) => (cur?.id === top.id ? null : cur));
    }, 2200);
    const pT = window.setTimeout(() => {
      setActivePulse((cur) => (cur?.id === top.id ? null : cur));
    }, 1400);
    return () => {
      window.clearTimeout(aT);
      window.clearTimeout(pT);
    };
  }, [state.scoredWords]);

  /* ─── Cell selection + letter input ─── */
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-clear cell selection whenever turn flips so the previous player's
  // dangling pick doesn't carry over.
  useEffect(() => {
    setSelected(null);
  }, [state.turnPlayerId]);

  function pickCell(r: number, c: number) {
    if (!canPlay) return;
    if (state.board[r][c] !== "") return;
    setSelected({ r, c });
    setError(null);
  }

  function placeLetter(letter: string) {
    if (!canPlay || !selected) return;
    const L = letter.toUpperCase();
    if (!/^[A-Z]$/.test(L)) {
      setError("A–Z only");
      return;
    }
    // `playerId: selfId` lets the server proxy this move to a local
    // pass-and-play seat when the host is acting on its behalf. For
    // normal multiplayer selfId === the caller's own id and the proxy
    // is a no-op.
    getSocket().emit("game:move", {
      type: "place",
      data: { r: selected.r, c: selected.c, letter: L },
      playerId: selfId ?? undefined,
    });
    setSelected(null);
    setError(null);
  }

  // Keyboard input: when a cell is selected, A–Z places the letter.
  useEffect(() => {
    if (!selected) return;
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key;
      if (key === "Escape") {
        setSelected(null);
        return;
      }
      if (/^[a-zA-Z]$/.test(key)) {
        e.preventDefault();
        placeLetter(key);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, canPlay]);

  /* ─── Turn timer countdown ───
   * Consolidated onto the shared useTurnSecondsLeft (the same hook
   * TurnTimeWarning uses) instead of the board's own always-on 250ms
   * interval. Display value is identical: null when there's no deadline so
   * the StudentBar chip stays hidden, otherwise whole seconds remaining. */
  const secondsLeft = useTurnSecondsLeft(state.turnDeadline);
  const remainingSec = state.turnDeadline != null ? secondsLeft : null;

  return {
    size,
    myTurn,
    canPlay,
    tutorialOpen,
    setTutorialOpen,
    reportDismissed,
    setReportDismissed,
    inkOf,
    nameOf,
    cellOverlays,
    activeAnnotation,
    activePulse,
    selected,
    setSelected,
    error,
    pickCell,
    placeLetter,
    remainingSec,
  };
}
