import React from "react";
import type { SpaceWarPublicState } from "@shared/types";
import { useViewport } from "../../lib/useViewport";
import SpaceWarBoardMobile from "./SpaceWarBoardMobile";
import SpaceWarBoardDesktop from "./SpaceWarBoardDesktop";

interface SpaceWarBoardProps {
  state: SpaceWarPublicState;
  selfId: string;
  onMove: (type: string, data?: unknown) => void;
}

export default function SpaceWarBoard({
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
