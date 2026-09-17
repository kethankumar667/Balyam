import { memo } from "react";
import { useViewport } from "../../lib/useViewport";
import { useGame2048 } from "./useGame2048";
import Game2048BoardMobile from "./Game2048BoardMobile";
import Game2048BoardDesktop from "./Game2048BoardDesktop";

export interface Game2048BoardProps {
  onExit?: () => void;
}

function Game2048Board({ onExit }: Game2048BoardProps) {
  const game = useGame2048();
  const viewport = useViewport();

  if (viewport === "desktop") {
    return <Game2048BoardDesktop game={game} onExit={onExit} />;
  }

  return <Game2048BoardMobile game={game} onExit={onExit} />;
}

export default memo(Game2048Board);
