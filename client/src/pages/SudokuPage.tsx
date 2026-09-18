import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import SudokuBoard from "../games/sudoku/SudokuBoard";
import { useAudio } from "../hooks/useAudio";
import { type SudokuDifficulty } from "../games/sudoku/useSudoku";

export default function SudokuPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const diffParam = searchParams.get("diff");
  const initialDifficulty: SudokuDifficulty =
    diffParam === "easy" || diffParam === "hard" || diffParam === "expert"
      ? diffParam
      : "medium";

  const { setActiveGame } = useAudio();
  useEffect(() => {
    setActiveGame("sudoku");
    return () => setActiveGame(null);
  }, [setActiveGame]);

  return (
    <div className="w-full min-h-dvh-safe h-dvh-safe overflow-y-auto overflow-x-hidden overscroll-none">
      <h1 className="sr-only">Sudoku Cyber-Matrix — Futuristic Neural Puzzle</h1>
      <SudokuBoard
        initialDifficulty={initialDifficulty}
        onExit={() => navigate("/games")}
      />
    </div>
  );
}
