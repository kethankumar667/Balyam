import { memo } from "react";
import { useViewport } from "../../lib/useViewport";
import SnakeBoardMobile, { type SnakeBoardProps } from "./SnakeBoardMobile";
import SnakeBoardDesktop from "./SnakeBoardDesktop";

function SnakeBoard(props: SnakeBoardProps) {
  const viewport = useViewport();
  if (viewport === "desktop") {
    return <SnakeBoardDesktop {...props} />;
  }
  return <SnakeBoardMobile {...props} />;
}

/**
 * Memoized because Room.tsx re-renders its whole 1650-line tree on every
 * broadcast — twenty-one times a second in Space War. Each of those commits
 * competes with the canvas's requestAnimationFrame loop for the main thread,
 * which is dropped frames however good the interpolation is. The board only
 * ever needs to re-render when its own props change.
 */
export default memo(SnakeBoard);
