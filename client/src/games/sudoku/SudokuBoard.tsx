import { memo } from "react";
import { useViewport } from "../../lib/useViewport";
import { useSudoku, type SudokuDifficulty } from "./useSudoku";
import SudokuBoardMobile from "./SudokuBoardMobile";
import SudokuBoardDesktop from "./SudokuBoardDesktop";

export interface SudokuBoardProps {
  onExit?: () => void;
  initialDifficulty?: SudokuDifficulty;
}

function SudokuBoard({ onExit, initialDifficulty = "medium" }: SudokuBoardProps) {
  const game = useSudoku(initialDifficulty);
  const viewport = useViewport();

  if (viewport === "desktop") {
    return <SudokuBoardDesktop game={game} onExit={onExit} />;
  }

  return <SudokuBoardMobile game={game} onExit={onExit} />;
}

export default memo(SudokuBoard);
