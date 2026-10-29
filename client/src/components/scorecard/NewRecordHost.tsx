import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getGameModeConfig } from "@shared/profile/GameModes";
import { getSocket } from "../../lib/socket";
import { parseNewRecord } from "../../lib/newRecord";
import { useNewRecordStore } from "../../store/newRecordStore";
import PersonalBestOverdriveModal from "./PersonalBestOverdriveModal";

/**
 * Says "you beat your own record" in any game, the moment it happens.
 *
 * Mounted once in `App`, so it works over every board and page. It shows whatever `newRecordStore` holds, one popup
 * at a time: a solo game's save puts its result there directly, and this component also listens for the server's
 * `scorecard:newBest`, which is how a room game (scored on the server) reaches the player who set the record.
 * Only the player's own socket is ever told, so nobody else at the table sees it.
 */
export default function NewRecordHost() {
  const current = useNewRecordStore((s) => s.queue[0] ?? null);
  const announce = useNewRecordStore((s) => s.announce);
  const dismiss = useNewRecordStore((s) => s.dismiss);
  const navigate = useNavigate();

  useEffect(() => {
    const socket = getSocket();
    const onNewBest = (payload: unknown) => {
      const result = parseNewRecord(payload);
      if (result) announce(result);
    };
    socket.on("scorecard:newBest" as never, onNewBest as never);
    return () => {
      socket.off("scorecard:newBest" as never, onNewBest as never);
    };
  }, [announce]);

  if (!current) return null;

  const config = getGameModeConfig(current.game);
  const unit = config.modes.find((mode) => mode.modeId === current.scorecard.modeId)?.unit;

  return (
    <PersonalBestOverdriveModal
      key={`${current.game}:${current.scorecard.modeId}:${current.scorecard.bestScoreMatchId}`}
      result={current}
      gameName={config.displayName}
      unit={unit}
      onClose={dismiss}
      onViewScorecards={() => navigate("/myrecords")}
    />
  );
}
