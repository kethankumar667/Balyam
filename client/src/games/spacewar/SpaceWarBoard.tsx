import React, { memo } from "react";
import type { SpaceWarPublicState } from "@shared/types";
import { useViewport } from "../../lib/useViewport";
import SpaceWarBoardMobile from "./SpaceWarBoardMobile";
import SpaceWarBoardDesktop from "./SpaceWarBoardDesktop";

interface SpaceWarBoardProps {
  state: SpaceWarPublicState;
  selfId: string;
  onMove: (type: string, data?: unknown) => void;
}

function SpaceWarBoard({
  state,
  selfId,
  onMove,
}: SpaceWarBoardProps) {
  const viewport = useViewport();
  const isDesktop = viewport === "desktop";

  if (isDesktop) {
    return (
      <SpaceWarBoardDesktop
        state={state}
        selfId={selfId}
        onMove={onMove}
      />
    );
  }

  return (
    <SpaceWarBoardMobile
      state={state}
      selfId={selfId}
      onMove={onMove}
    />
  );
}

/**
 * Memoized because Room.tsx re-renders its whole 1650-line tree on every
 * broadcast — twenty-one times a second in Space War. Each of those commits
 * competes with the canvas's requestAnimationFrame loop for the main thread,
 * which is dropped frames however good the interpolation is. The board only
 * ever needs to re-render when its own props change.
 */
export default memo(SpaceWarBoard);
