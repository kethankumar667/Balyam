import { useState, useEffect } from "react";
import type { HcState, Player } from "@shared/types";
import { useHcCelebrationEvents, type HcCelebrationData } from "../useHcCelebrationEvents";
import { useHcSkin, type HcSkin } from "../hc-skin";
import { Hc3DStage } from "./Hc3DStage";

// Broadcast Theme
import { Broadcast3DDuck } from "./themes/broadcast/Broadcast3DDuck";
import { Broadcast3DMilestone } from "./themes/broadcast/Broadcast3DMilestone";
import { Broadcast3DSix } from "./themes/broadcast/Broadcast3DSix";
import { Broadcast3DFour } from "./themes/broadcast/Broadcast3DFour";
import { Broadcast3DBowled } from "./themes/broadcast/Broadcast3DBowled";
import { Broadcast3DHattrick } from "./themes/broadcast/Broadcast3DHattrick";
import { Broadcast3DStreak } from "./themes/broadcast/Broadcast3DStreak";
import { Broadcast3DWinner } from "./themes/broadcast/Broadcast3DWinner";

// Cricbuzz Theme
import { Cricbuzz3DDuck } from "./themes/cricbuzz/Cricbuzz3DDuck";
import { Cricbuzz3DMilestone } from "./themes/cricbuzz/Cricbuzz3DMilestone";
import { Cricbuzz3DSix } from "./themes/cricbuzz/Cricbuzz3DSix";
import { Cricbuzz3DFour } from "./themes/cricbuzz/Cricbuzz3DFour";
import { Cricbuzz3DBowled } from "./themes/cricbuzz/Cricbuzz3DBowled";
import { Cricbuzz3DHattrick } from "./themes/cricbuzz/Cricbuzz3DHattrick";
import { Cricbuzz3DStreak } from "./themes/cricbuzz/Cricbuzz3DStreak";
import { Cricbuzz3DWinner } from "./themes/cricbuzz/Cricbuzz3DWinner";

// Doordarshan Theme
import { Doordarshan3DDuck } from "./themes/doordarshan/Doordarshan3DDuck";
import { Doordarshan3DMilestone } from "./themes/doordarshan/Doordarshan3DMilestone";
import { Doordarshan3DSix } from "./themes/doordarshan/Doordarshan3DSix";
import { Doordarshan3DFour } from "./themes/doordarshan/Doordarshan3DFour";
import { Doordarshan3DBowled } from "./themes/doordarshan/Doordarshan3DBowled";
import { Doordarshan3DHattrick } from "./themes/doordarshan/Doordarshan3DHattrick";
import { Doordarshan3DStreak } from "./themes/doordarshan/Doordarshan3DStreak";
import { Doordarshan3DWinner } from "./themes/doordarshan/Doordarshan3DWinner";

// Nostalgia Theme
import { Nostalgia3DDuck } from "./themes/nostalgia/Nostalgia3DDuck";
import { Nostalgia3DMilestone } from "./themes/nostalgia/Nostalgia3DMilestone";
import { Nostalgia3DSix } from "./themes/nostalgia/Nostalgia3DSix";
import { Nostalgia3DFour } from "./themes/nostalgia/Nostalgia3DFour";
import { Nostalgia3DBowled } from "./themes/nostalgia/Nostalgia3DBowled";
import { Nostalgia3DHattrick } from "./themes/nostalgia/Nostalgia3DHattrick";
import { Nostalgia3DStreak } from "./themes/nostalgia/Nostalgia3DStreak";
import { Nostalgia3DWinner } from "./themes/nostalgia/Nostalgia3DWinner";

export function Hc3DCelebrationLayer({
  state,
  players,
  selfId,
  forcedSkin,
}: {
  state: HcState;
  players: Player[];
  selfId: string;
  forcedSkin?: HcSkin;
}) {
  const active = useHcCelebrationEvents(state, players, selfId);
  const [currentSkin] = useHcSkin();
  const skin = forcedSkin ?? currentSkin;
  const [dismissedId, setDismissedId] = useState<number | null>(null);

  useEffect(() => {
    if (active?.id !== dismissedId) {
      setDismissedId(null);
    }
  }, [active?.id, dismissedId]);

  if (!active || active.id === dismissedId) return null;

  const handleDismiss = () => {
    setDismissedId(active.id);
  };

  const glowType =
    active.kind === "wicket" || active.kind === "duck"
      ? "red"
      : skin === "cricbuzz"
      ? "emerald"
      : skin === "nostalgia"
      ? "blue"
      : "gold";

  return (
    <Hc3DStage skin={skin} onDismiss={handleDismiss} ambientGlow={glowType}>
      {renderThemedScene(skin, active)}
    </Hc3DStage>
  );
}

function renderThemedScene(skin: HcSkin, data: HcCelebrationData) {
  switch (skin) {
    case "cricbuzz":
      switch (data.kind) {
        case "duck":
          return <Cricbuzz3DDuck batter={data.batter} duckType={data.duckType} balls={data.balls} />;
        case "milestone":
          return (
            <Cricbuzz3DMilestone
              batter={data.batter}
              runs={data.runs}
              balls={data.balls}
              fours={data.fours}
              sixes={data.sixes}
            />
          );
        case "six":
          return <Cricbuzz3DSix batter={data.batter} message={data.message} />;
        case "four":
          return <Cricbuzz3DFour batter={data.batter} message={data.message} />;
        case "wicket":
          return (
            <Cricbuzz3DBowled
              batter={data.batter}
              bowler={data.bowler}
              isYorker={data.isYorker}
              message={data.message}
            />
          );
        case "hattrickWickets":
          return <Cricbuzz3DHattrick bowler={data.bowler} message={data.message} />;
        case "streak":
          return (
            <Cricbuzz3DStreak
              batter={data.batter}
              title={data.title}
              message={data.message}
              variant={data.variant}
            />
          );
        case "winner":
          return (
            <Cricbuzz3DWinner
              winnerName={data.winnerName}
              margin={data.margin}
              youWon={data.youWon}
              isTie={data.isTie}
            />
          );
      }
      break;

    case "doordarshan":
      switch (data.kind) {
        case "duck":
          return <Doordarshan3DDuck batter={data.batter} duckType={data.duckType} balls={data.balls} />;
        case "milestone":
          return (
            <Doordarshan3DMilestone
              batter={data.batter}
              runs={data.runs}
              balls={data.balls}
              fours={data.fours}
              sixes={data.sixes}
            />
          );
        case "six":
          return <Doordarshan3DSix batter={data.batter} message={data.message} />;
        case "four":
          return <Doordarshan3DFour batter={data.batter} message={data.message} />;
        case "wicket":
          return (
            <Doordarshan3DBowled
              batter={data.batter}
              bowler={data.bowler}
              isYorker={data.isYorker}
              message={data.message}
            />
          );
        case "hattrickWickets":
          return <Doordarshan3DHattrick bowler={data.bowler} message={data.message} />;
        case "streak":
          return (
            <Doordarshan3DStreak
              batter={data.batter}
              title={data.title}
              message={data.message}
              variant={data.variant}
            />
          );
        case "winner":
          return (
            <Doordarshan3DWinner
              winnerName={data.winnerName}
              margin={data.margin}
              youWon={data.youWon}
              isTie={data.isTie}
            />
          );
      }
      break;

    case "nostalgia":
      switch (data.kind) {
        case "duck":
          return <Nostalgia3DDuck batter={data.batter} duckType={data.duckType} balls={data.balls} />;
        case "milestone":
          return (
            <Nostalgia3DMilestone
              batter={data.batter}
              runs={data.runs}
              balls={data.balls}
              fours={data.fours}
              sixes={data.sixes}
            />
          );
        case "six":
          return <Nostalgia3DSix batter={data.batter} message={data.message} />;
        case "four":
          return <Nostalgia3DFour batter={data.batter} message={data.message} />;
        case "wicket":
          return (
            <Nostalgia3DBowled
              batter={data.batter}
              bowler={data.bowler}
              isYorker={data.isYorker}
              message={data.message}
            />
          );
        case "hattrickWickets":
          return <Nostalgia3DHattrick bowler={data.bowler} message={data.message} />;
        case "streak":
          return (
            <Nostalgia3DStreak
              batter={data.batter}
              title={data.title}
              message={data.message}
              variant={data.variant}
            />
          );
        case "winner":
          return (
            <Nostalgia3DWinner
              winnerName={data.winnerName}
              margin={data.margin}
              youWon={data.youWon}
              isTie={data.isTie}
            />
          );
      }
      break;

    case "broadcast":
    default:
      switch (data.kind) {
        case "duck":
          return <Broadcast3DDuck batter={data.batter} duckType={data.duckType} balls={data.balls} />;
        case "milestone":
          return (
            <Broadcast3DMilestone
              batter={data.batter}
              runs={data.runs}
              balls={data.balls}
              fours={data.fours}
              sixes={data.sixes}
            />
          );
        case "six":
          return <Broadcast3DSix batter={data.batter} message={data.message} />;
        case "four":
          return <Broadcast3DFour batter={data.batter} message={data.message} />;
        case "wicket":
          return (
            <Broadcast3DBowled
              batter={data.batter}
              bowler={data.bowler}
              isYorker={data.isYorker}
              message={data.message}
            />
          );
        case "hattrickWickets":
          return <Broadcast3DHattrick bowler={data.bowler} message={data.message} />;
        case "streak":
          return (
            <Broadcast3DStreak
              batter={data.batter}
              title={data.title}
              message={data.message}
              variant={data.variant}
            />
          );
        case "winner":
          return (
            <Broadcast3DWinner
              winnerName={data.winnerName}
              margin={data.margin}
              youWon={data.youWon}
              isTie={data.isTie}
            />
          );
      }
  }
}
