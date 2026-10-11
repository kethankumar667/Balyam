import { useEffect } from "react";
import { useMandaliJoyStore } from "../../store/mandaliJoyStore";
import { AudioManager } from "../../services/AudioManager";
import { AUDIO } from "../../constants/audio";
import { HapticsManager } from "../../services/HapticsManager";
import { CoinTransferStage, STAGE_ARRIVAL_MS, STAGE_MS } from "./CoinTransferStage";

/** The stage runs five seconds, then closes itself. Skip, Escape or a newer payment end it sooner. */
export const JOY_VISIBLE_MS = STAGE_MS;

/**
 * The moment after a friend answers a coin request, wherever the player is in the app.
 *
 * Both people in the payment see the same story: the sender's face on one side, the receiver's on the
 * other, and coins crossing between them (see `CoinTransferStage`). The person who ASKED gets the coin
 * chime and a reward buzz as the last coin lands; the person who PAID gets a gentler buzz at the start,
 * because nothing arrived for them and it is a kindness, not a win. Neither blocks anything: the stage
 * never takes focus, can be skipped at any moment, and clears itself.
 */
export function CoinJoyOverlay() {
  const moment = useMandaliJoyStore((s) => s.moment);
  const clear = useMandaliJoyStore((s) => s.clear);

  useEffect(() => {
    if (!moment) return undefined;
    const timers: number[] = [window.setTimeout(clear, JOY_VISIBLE_MS)];
    if (moment.kind === "received") {
      timers.push(
        window.setTimeout(() => {
          HapticsManager.trigger("reward");
          AudioManager.play(AUDIO.REWARD_COIN);
        }, STAGE_ARRIVAL_MS),
      );
    } else {
      HapticsManager.trigger("subtle");
    }
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [moment?.key, moment?.kind, clear]);

  if (!moment) return null;

  return (
    <CoinTransferStage
      key={moment.key}
      kind={moment.kind}
      amount={moment.amount}
      self={moment.self}
      other={moment.other}
      onSkip={clear}
    />
  );
}

export default CoinJoyOverlay;
