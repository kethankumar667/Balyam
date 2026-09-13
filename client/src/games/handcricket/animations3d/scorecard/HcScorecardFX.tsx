import type { HcState, Player } from "@shared/types";
import { useHcSkin, type HcSkin } from "../../hc-skin";
import { HcCrackersFlowerBlast } from "./HcCrackersFlowerBlast";
import { HcRunnerCheerUp } from "./HcRunnerCheerUp";

export function HcScorecardFX({
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
  const [currentSkin] = useHcSkin();
  const skin = forcedSkin ?? currentSkin;

  if (state.phase !== "finished") return null;

  const isWinner = Boolean(state.winnerId && state.winnerId === selfId);
  const isRunner = Boolean(state.winnerId && state.winnerId !== selfId);
  const selfName = players.find((p) => p.id === selfId)?.name ?? "Player";

  if (isWinner) {
    return <HcCrackersFlowerBlast skin={skin} />;
  }

  if (isRunner) {
    return <HcRunnerCheerUp skin={skin} runnerName={selfName} />;
  }

  return null;
}
