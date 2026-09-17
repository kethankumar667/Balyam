import React from "react";
import { useViewport } from "../../lib/useViewport";
import type { PlayerScorecardArchive } from "@shared/profile/Scorecard";
import ChronoScorecardDeckMobile from "./ChronoScorecardDeckMobile";
import ChronoScorecardDeckDesktop from "./ChronoScorecardDeckDesktop";

interface ChronoScorecardDeckProps {
  archive: PlayerScorecardArchive;
  playerName: string;
  avatar?: string;
  className?: string;
}

export default function ChronoScorecardDeck({
  archive,
  playerName,
  avatar,
  className = "",
}: ChronoScorecardDeckProps) {
  const viewport = useViewport();

  if (viewport === "mobile") {
    return (
      <ChronoScorecardDeckMobile
        archive={archive}
        playerName={playerName}
        avatar={avatar}
        className={className}
      />
    );
  }

  return (
    <ChronoScorecardDeckDesktop
      archive={archive}
      playerName={playerName}
      avatar={avatar}
      className={className}
    />
  );
}
