import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { getSudoku } from "sudoku-gen";
import { type SudokuThemeId, SUDOKU_THEMES } from "./sudokuThemes";
import { HapticsManager } from "../../services/HapticsManager";
import { recordSoloScore, useScorecardStore } from "../../store/scorecardStore";
import { sudokuAudio } from "./sudokuAudio";

export type SudokuDifficulty = "easy" | "medium" | "hard" | "expert";
export type SudokuInputMode = "cell-first" | "digit-first";

export interface SudokuLevelProgress {
  easy: number;
  medium: number;
  hard: number;
  expert: number;
}

export const STORAGE_SUDOKU_PROGRESS = "bhalyam.sudoku.progress.v1";

export function readSudokuProgress(): SudokuLevelProgress {
  try {
    const raw = localStorage.getItem(STORAGE_SUDOKU_PROGRESS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        easy: typeof parsed?.easy === "number" ? Math.max(0, parsed.easy) : 0,
        medium: typeof parsed?.medium === "number" ? Math.max(0, parsed.medium) : 0,
        hard: typeof parsed?.hard === "number" ? Math.max(0, parsed.hard) : 0,
        expert: typeof parsed?.expert === "number" ? Math.max(0, parsed.expert) : 0,
      };
    }
  } catch {
    // Ignore storage parse error
  }
  return { easy: 0, medium: 0, hard: 0, expert: 0 };
}

export function saveSudokuProgress(progress: SudokuLevelProgress): void {
  try {
    localStorage.setItem(STORAGE_SUDOKU_PROGRESS, JSON.stringify(progress));
  } catch {
    // Ignore storage write error
  }
}

export interface SudokuCell {
  index: number;
  row: number;
  col: number;
  block: number;
  value: number | null;
  solution: number;
  isGiven: boolean;
  notes: number[];
  isError: boolean;
  isHinted?: boolean;
}

export interface UseSudokuReturn {
  cells: SudokuCell[];
  selectedCellIndex: number | null;
  selectedDigit: number | null;
  difficulty: SudokuDifficulty;
  boardNumber: number;
  progress: SudokuLevelProgress;
  elapsedSeconds: number;
  isPaused: boolean;
  isComplete: boolean;
  mistakes: number;
  maxMistakes: number;
  isGameOver: boolean;
  notesMode: boolean;
  inputMode: SudokuInputMode;
  themeId: SudokuThemeId;
  canUndo: boolean;
  digitCounts: Record<number, number>;
  hintText: string | null;
  newPersonalBest: boolean;
  recentlyCompletedUnits: string[];
  ghostDelta: number | null;
  ghostDeltaFormatted: string | null;
  zenMode: boolean;
  // Actions
  selectCell: (index: number) => void;
  selectDigit: (digit: number) => void;
  inputDigit: (digit: number, targetIndex?: number) => void;
  eraseCell: () => void;
  toggleNotesMode: () => void;
  toggleInputMode: () => void;
  setThemeId: (theme: SudokuThemeId) => void;
  undo: () => void;
  useHint: () => void;
  autoFillNotes: () => void;
  togglePause: () => void;
  toggleZenMode: () => void;
  startNewGame: (diff?: SudokuDifficulty) => void;
  startNextBoard: () => void;
  restartCurrentGame: () => void;
}

function getBlockIndex(row: number, col: number): number {
  return Math.floor(row / 3) * 3 + Math.floor(col / 3);
}

function parseBoard(puzzle: string, solution: string): SudokuCell[] {
  const cells: SudokuCell[] = [];
  for (let i = 0; i < 81; i++) {
    const row = Math.floor(i / 9);
    const col = i % 9;
    const block = getBlockIndex(row, col);
    const pChar = puzzle[i];
    const sChar = solution[i];
    const isGiven = pChar !== "-";
    const value = isGiven ? Number(pChar) : null;
    const solVal = Number(sChar);

    cells.push({
      index: i,
      row,
      col,
      block,
      value,
      solution: solVal,
      isGiven,
      notes: [],
      isError: false,
    });
  }
  return cells;
}

function checkCellErrors(cells: SudokuCell[]): SudokuCell[] {
  return cells.map((cell) => {
    if (!cell.value) return { ...cell, isError: false };
    const isWrong = cell.value !== cell.solution;
    return { ...cell, isError: isWrong };
  });
}

function getCompletedUnitIds(cells: SudokuCell[]): Set<string> {
  const completed = new Set<string>();

  // Rows
  for (let r = 0; r < 9; r++) {
    const rowCells = cells.filter((c) => c.row === r);
    const isValidAndFull =
      rowCells.length === 9 &&
      rowCells.every((c) => c.value !== null && !c.isError && c.value === c.solution);
    if (isValidAndFull) completed.add(`row-${r}`);
  }

  // Columns
  for (let col = 0; col < 9; col++) {
    const colCells = cells.filter((c) => c.col === col);
    const isValidAndFull =
      colCells.length === 9 &&
      colCells.every((c) => c.value !== null && !c.isError && c.value === c.solution);
    if (isValidAndFull) completed.add(`col-${col}`);
  }

  // 3x3 Blocks
  for (let b = 0; b < 9; b++) {
    const blockCells = cells.filter((c) => c.block === b);
    const isValidAndFull =
      blockCells.length === 9 &&
      blockCells.every((c) => c.value !== null && !c.isError && c.value === c.solution);
    if (isValidAndFull) completed.add(`block-${b}`);
  }

  return completed;
}

const BENCHMARK_SECONDS: Record<SudokuDifficulty, number> = {
  easy: 240,
  medium: 420,
  hard: 660,
  expert: 900,
};

export function useSudoku(initialDifficulty: SudokuDifficulty = "medium"): UseSudokuReturn {
  const [difficulty, setDifficulty] = useState<SudokuDifficulty>(initialDifficulty);
  const [progress, setProgress] = useState<SudokuLevelProgress>(readSudokuProgress);
  const [cells, setCells] = useState<SudokuCell[]>([]);
  const [puzzleString, setPuzzleString] = useState<string>("");
  const [solutionString, setSolutionString] = useState<string>("");
  const [selectedCellIndex, setSelectedCellIndex] = useState<number | null>(null);
  const [selectedDigit, setSelectedDigit] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState<boolean>(false);
  const [inputMode, setInputMode] = useState<SudokuInputMode>("cell-first");
  const [themeId, setThemeIdState] = useState<SudokuThemeId>("chronicle");
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [mistakes, setMistakes] = useState<number>(0);
  const [hintText, setHintText] = useState<string | null>(null);
  const [newPersonalBest, setNewPersonalBest] = useState<boolean>(false);
  const [history, setHistory] = useState<Array<SudokuCell[]>>([]);
  const [recentlyCompletedUnits, setRecentlyCompletedUnits] = useState<string[]>([]);
  const [zenMode, setZenMode] = useState<boolean>(false);

  const maxMistakes = 3;
  const isGameOver = mistakes >= maxMistakes && !isComplete;

  const selectedCellIndexRef = useRef<number | null>(null);
  const selectedDigitRef = useRef<number | null>(null);
  const notesModeRef = useRef<boolean>(false);
  const inputModeRef = useRef<SudokuInputMode>("cell-first");
  const difficultyRef = useRef<SudokuDifficulty>(difficulty);
  difficultyRef.current = difficulty;
  const elapsedSecondsRef = useRef<number>(elapsedSeconds);
  elapsedSecondsRef.current = elapsedSeconds;
  const knownCompletedUnitsRef = useRef<Set<string>>(new Set());
  const sweepTimeoutRef = useRef<number | null>(null);
  const cellsRef = useRef<SudokuCell[]>(cells);
  cellsRef.current = cells;
  const historyRef = useRef<Array<SudokuCell[]>>(history);
  historyRef.current = history;

  // Cleanup sweep timeout on unmount
  useEffect(() => {
    return () => {
      if (sweepTimeoutRef.current) {
        window.clearTimeout(sweepTimeoutRef.current);
      }
    };
  }, []);

  const boardNumber = (progress[difficulty] || 0) + 1;

  // Initialize fresh puzzle via sudoku-gen
  const initGame = useCallback(
    (diff: SudokuDifficulty) => {
      if (sweepTimeoutRef.current) {
        window.clearTimeout(sweepTimeoutRef.current);
      }

      const generated = getSudoku(diff);
      const parsed = parseBoard(generated.puzzle, generated.solution);
      setPuzzleString(generated.puzzle);
      setSolutionString(generated.solution);
      setDifficulty(diff);
      difficultyRef.current = diff;
      cellsRef.current = parsed;
      setCells(parsed);
      setSelectedCellIndex(null);
      selectedCellIndexRef.current = null;
      setSelectedDigit(null);
      selectedDigitRef.current = null;
      setElapsedSeconds(0);
      elapsedSecondsRef.current = 0;
      setIsPaused(false);
      setIsComplete(false);
      setMistakes(0);
      setHintText(null);
      setNewPersonalBest(false);
      historyRef.current = [];
      setHistory([]);
      setRecentlyCompletedUnits([]);
      knownCompletedUnitsRef.current = getCompletedUnitIds(parsed);
    },
    []
  );

  useEffect(() => {
    initGame(initialDifficulty);
  }, [initGame, initialDifficulty]);

  // Chrono Timer Loop
  useEffect(() => {
    if (isPaused || isComplete || isGameOver || cells.length === 0) return;
    const interval = window.setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isPaused, isComplete, isGameOver, cells.length]);

  // Calculate placed digit counts (1..9)
  const digitCounts: Record<number, number> = useMemo(() => {
    const counts: Record<number, number> = {};
    for (let d = 1; d <= 9; d++) counts[d] = 0;
    for (const c of cells) {
      if (c.value && !c.isError) {
        counts[c.value] = (counts[c.value] || 0) + 1;
      }
    }
    return counts;
  }, [cells]);

  // Check victory condition
  const checkVictory = useCallback(
    (currentCells: SudokuCell[]) => {
      const isFull = currentCells.every((c) => c.value !== null && !c.isError);
      if (isFull) {
        const matchesSolution = currentCells.every((c) => c.value === c.solution);
        if (matchesSolution) {
          setIsComplete(true);
          HapticsManager.trigger("win");
          sudokuAudio.playVictory();

          // Increment progression
          const currentDiff = difficultyRef.current;
          const currentProg = readSudokuProgress();
          const nextProg: SudokuLevelProgress = {
            ...currentProg,
            [currentDiff]: (currentProg[currentDiff] || 0) + 1,
          };
          saveSudokuProgress(nextProg);
          setProgress(nextProg);

          // Dispatch score to BHALYAM scorecard system (with offline catch)
          void recordSoloScore("sudoku", currentDiff, elapsedSecondsRef.current).catch(() => {});
          setNewPersonalBest(true);
        }
      }
    },
    []
  );

  // Apply a number to a cell
  const applyValueToCell = useCallback(
    (targetIndex: number, digit: number, asNote: boolean) => {
      if (isPaused || isComplete || isGameOver) return;

      const prev = cellsRef.current;
      const targetCell = prev[targetIndex];
      if (!targetCell || targetCell.isGiven) return;

      historyRef.current = [...historyRef.current.slice(-30), prev];
      setHistory(historyRef.current);

      if (asNote) {
        // Toggle note candidate
        HapticsManager.trigger("subtle");
        sudokuAudio.playPencilTick();
        const hasNote = targetCell.notes.includes(digit);
        const newNotes = hasNote
          ? targetCell.notes.filter((n) => n !== digit)
          : [...targetCell.notes, digit].sort((a, b) => a - b);
        const next = prev.map((c) => (c.index === targetIndex ? { ...c, notes: newNotes } : c));
        cellsRef.current = next;
        setCells(next);
        return;
      }

      // Entering confirmed digit
      // If user taps the same value again, it is a toggle-off / erase, NOT a mistake!
      const isToggleOff = targetCell.value === digit;
      const isMistake = !isToggleOff && digit !== targetCell.solution;

      if (isMistake) {
        HapticsManager.trigger("turn");
        sudokuAudio.playMistakeGlitch();
        setMistakes((m) => m + 1);
      } else {
        HapticsManager.trigger("subtle");
        sudokuAudio.playDigitChime(digit);
      }

      const next = prev.map((c) => {
        if (c.index === targetIndex) {
          const nextVal = isToggleOff ? null : digit;
          return {
            ...c,
            value: nextVal,
            notes: [],
            isError: isMistake,
          };
        }

        // Auto-clean pencil notes in intersecting row, column, and 3x3 block
        if (!isMistake && !isToggleOff && c.notes.includes(digit)) {
          const intersects =
            c.row === targetCell.row ||
            c.col === targetCell.col ||
            c.block === targetCell.block;
          if (intersects) {
            return {
              ...c,
              notes: c.notes.filter((n) => n !== digit),
            };
          }
        }

        return c;
      });

      const validated = checkCellErrors(next);
      cellsRef.current = validated;
      setCells(validated);

      // Check if any unit was just completed (Circuit Sweep Laser)
      if (!isMistake && !isToggleOff) {
        const currentUnits = getCompletedUnitIds(validated);
        const newCompleted: string[] = [];
        for (const u of currentUnits) {
          if (!knownCompletedUnitsRef.current.has(u)) {
            newCompleted.push(u);
          }
        }
        knownCompletedUnitsRef.current = currentUnits;

        if (newCompleted.length > 0) {
          setRecentlyCompletedUnits(newCompleted);
          sudokuAudio.playCircuitSweep();
          if (sweepTimeoutRef.current) window.clearTimeout(sweepTimeoutRef.current);
          sweepTimeoutRef.current = window.setTimeout(() => {
            setRecentlyCompletedUnits([]);
          }, 850);
        }
      }

      checkVictory(validated);
    },
    [isPaused, isComplete, isGameOver, checkVictory]
  );

  // Cell Selection Handler
  const selectCell = useCallback(
    (index: number) => {
      if (isPaused || isComplete || isGameOver) return;
      HapticsManager.trigger("subtle");
      selectedCellIndexRef.current = index;
      setSelectedCellIndex(index);

      // In Digit-First mode: apply selected digit immediately
      if (inputModeRef.current === "digit-first" && selectedDigitRef.current !== null) {
        applyValueToCell(index, selectedDigitRef.current, notesModeRef.current);
      }
    },
    [isPaused, isComplete, isGameOver, applyValueToCell]
  );

  // Keypad Digit Selection Handler
  const selectDigit = useCallback(
    (digit: number) => {
      if (isPaused || isComplete || isGameOver) return;

      if (inputModeRef.current === "digit-first") {
        HapticsManager.trigger("subtle");
        const next = selectedDigitRef.current === digit ? null : digit;
        selectedDigitRef.current = next;
        setSelectedDigit(next);
      } else {
        // Cell-first mode: apply to currently selected cell
        if (selectedCellIndexRef.current !== null) {
          applyValueToCell(selectedCellIndexRef.current, digit, notesModeRef.current);
        }
      }
    },
    [isPaused, isComplete, isGameOver, applyValueToCell]
  );

  const inputDigit = useCallback(
    (digit: number, targetIndex?: number) => {
      const idx = targetIndex ?? selectedCellIndexRef.current;
      if (idx !== null) {
        applyValueToCell(idx, digit, notesModeRef.current);
      }
    },
    [applyValueToCell]
  );

  const eraseCell = useCallback(() => {
    if (isPaused || isComplete || isGameOver || selectedCellIndexRef.current === null) return;
    const targetIndex = selectedCellIndexRef.current;
    const prev = cellsRef.current;
    const cell = prev[targetIndex];
    if (!cell || cell.isGiven || (cell.value === null && cell.notes.length === 0)) return;

    HapticsManager.trigger("subtle");
    sudokuAudio.playErase();
    historyRef.current = [...historyRef.current.slice(-30), prev];
    setHistory(historyRef.current);
    const next = prev.map((c) =>
      c.index === targetIndex ? { ...c, value: null, notes: [], isError: false } : c
    );
    const validated = checkCellErrors(next);
    cellsRef.current = validated;
    setCells(validated);
  }, [isPaused, isComplete, isGameOver]);

  const undo = useCallback(() => {
    if (historyRef.current.length === 0 || isPaused || isComplete || isGameOver) return;
    HapticsManager.trigger("subtle");
    const prevBoard = historyRef.current[historyRef.current.length - 1];
    if (prevBoard) {
      historyRef.current = historyRef.current.slice(0, -1);
      setHistory(historyRef.current);
      cellsRef.current = prevBoard;
      setCells(prevBoard);
    }
  }, [isPaused, isComplete, isGameOver]);

  // Smart Neural Laser Hint Scanner
  const useHint = useCallback(() => {
    if (isPaused || isComplete || isGameOver) return;
    const prev = cellsRef.current;
    const target = prev.find((c) => !c.isGiven && (c.value === null || c.value !== c.solution));
    if (!target) return;

    HapticsManager.trigger("subtle");
    historyRef.current = [...historyRef.current.slice(-30), prev];
    setHistory(historyRef.current);

    selectedCellIndexRef.current = target.index;
    setSelectedCellIndex(target.index);
    setHintText(`Neural Scanner: Row ${target.row + 1}, Col ${target.col + 1} locked to ${target.solution}`);
    sudokuAudio.playDigitChime(target.solution);

    const next = prev.map((c) => {
      if (c.index === target.index) {
        return {
          ...c,
          value: target.solution,
          notes: [],
          isError: false,
          isHinted: true,
        };
      }
      if (c.notes.includes(target.solution)) {
        const intersects =
          c.row === target.row ||
          c.col === target.col ||
          c.block === target.block;
        if (intersects) {
          return {
            ...c,
            notes: c.notes.filter((n) => n !== target.solution),
          };
        }
      }
      return c;
    });

    const validated = checkCellErrors(next);
    cellsRef.current = validated;
    setCells(validated);
    checkVictory(validated);
  }, [isPaused, isComplete, isGameOver, checkVictory]);

  // Auto-Fill candidate notes across empty cells
  const autoFillNotes = useCallback(() => {
    if (isPaused || isComplete || isGameOver) return;
    HapticsManager.trigger("subtle");
    sudokuAudio.playPencilTick();

    const prev = cellsRef.current;
    historyRef.current = [...historyRef.current.slice(-30), prev];
    setHistory(historyRef.current);
    const next = prev.map((cell) => {
      if (cell.value !== null) return cell;

      const candidates: number[] = [];
      for (let d = 1; d <= 9; d++) {
        const conflict = prev.some(
          (other) =>
            other.value === d &&
            (other.row === cell.row ||
              other.col === cell.col ||
              other.block === cell.block)
        );
        if (!conflict) candidates.push(d);
      }

      return { ...cell, notes: candidates };
    });
    cellsRef.current = next;
    setCells(next);
  }, [isPaused, isComplete, isGameOver]);

  const toggleNotesMode = useCallback(() => {
    HapticsManager.trigger("subtle");
    const next = !notesModeRef.current;
    notesModeRef.current = next;
    setNotesMode(next);
  }, []);

  const toggleInputMode = useCallback(() => {
    HapticsManager.trigger("subtle");
    const next = inputModeRef.current === "cell-first" ? "digit-first" : "cell-first";
    inputModeRef.current = next;
    setInputMode(next);
    selectedDigitRef.current = null;
    setSelectedDigit(null);
  }, []);

  const togglePause = useCallback(() => {
    HapticsManager.trigger("subtle");
    setIsPaused((p) => !p);
  }, []);

  const toggleZenMode = useCallback(() => {
    HapticsManager.trigger("subtle");
    setZenMode((z) => !z);
  }, []);

  const setThemeId = useCallback((id: SudokuThemeId) => {
    setThemeIdState(id);
    const theme = SUDOKU_THEMES[id];
    if (theme) {
      sudokuAudio.setSoundProfile(theme.soundProfile);
    }
  }, []);

  useEffect(() => {
    const theme = SUDOKU_THEMES[themeId];
    if (theme) {
      sudokuAudio.setSoundProfile(theme.soundProfile);
    }
  }, [themeId]);

  const startNewGame = useCallback(
    (diff?: SudokuDifficulty) => {
      initGame(diff || difficulty);
    },
    [difficulty, initGame]
  );

  const startNextBoard = useCallback(() => {
    initGame(difficulty);
  }, [difficulty, initGame]);

  const restartCurrentGame = useCallback(() => {
    if (!puzzleString || !solutionString) return;
    const fresh = parseBoard(puzzleString, solutionString);
    cellsRef.current = fresh;
    setCells(fresh);
    historyRef.current = [];
    setHistory([]);
    setSelectedCellIndex(null);
    selectedCellIndexRef.current = null;
    setSelectedDigit(null);
    selectedDigitRef.current = null;
    setElapsedSeconds(0);
    elapsedSecondsRef.current = 0;
    setIsPaused(false);
    setIsComplete(false);
    setMistakes(0);
    setHintText(null);
    setHistory([]);
    setRecentlyCompletedUnits([]);
    knownCompletedUnitsRef.current = getCompletedUnitIds(fresh);
  }, [puzzleString, solutionString]);

  // Ghost Pace Delta calculation
  const archive = useScorecardStore((s) => s.archive);
  const pbSeconds = archive?.games?.sudoku?.modes?.[difficulty]?.bestScore;
  const benchmarkTime = (typeof pbSeconds === "number" && pbSeconds > 0) ? pbSeconds : BENCHMARK_SECONDS[difficulty];

  const emptyCellsCount = useMemo(() => cells.filter((c) => !c.isGiven).length, [cells]);
  const solvedCellsCount = useMemo(
    () => cells.filter((c) => !c.isGiven && c.value !== null && !c.isError).length,
    [cells]
  );

  const ghostDelta: number | null = useMemo(() => {
    if (emptyCellsCount === 0 || solvedCellsCount === 0 || isComplete) return null;
    const expectedTime = Math.round(benchmarkTime * (solvedCellsCount / emptyCellsCount));
    return elapsedSeconds - expectedTime;
  }, [emptyCellsCount, solvedCellsCount, isComplete, benchmarkTime, elapsedSeconds]);

  const ghostDeltaFormatted: string | null = useMemo(() => {
    if (ghostDelta === null) return null;
    const abs = Math.abs(ghostDelta);
    const m = Math.floor(abs / 60);
    const s = abs % 60;
    const formatted = `${m}:${s.toString().padStart(2, "0")}`;
    return ghostDelta <= 0 ? `-${formatted}` : `+${formatted}`;
  }, [ghostDelta]);

  return {
    cells,
    selectedCellIndex,
    selectedDigit,
    difficulty,
    boardNumber,
    progress,
    elapsedSeconds,
    isPaused,
    isComplete,
    mistakes,
    maxMistakes,
    isGameOver,
    notesMode,
    inputMode,
    themeId,
    canUndo: history.length > 0,
    digitCounts,
    hintText,
    newPersonalBest,
    recentlyCompletedUnits,
    ghostDelta,
    ghostDeltaFormatted,
    zenMode,
    selectCell,
    selectDigit,
    inputDigit,
    eraseCell,
    toggleNotesMode,
    toggleInputMode,
    setThemeId,
    undo,
    useHint,
    autoFillNotes,
    togglePause,
    toggleZenMode,
    startNewGame,
    startNextBoard,
    restartCurrentGame,
  };
}
