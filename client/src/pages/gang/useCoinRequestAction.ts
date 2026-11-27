import { useCallback, useEffect, useRef, useState } from "react";
import type { GangChannel, GangMember } from "@shared/gang/types.js";
import { GANG_COIN_AMOUNT } from "@shared/gang/coinRules.js";
import { useGangStore } from "../../store/gangStore";
import { useIsCountingDown } from "../../hooks/useCountdown";
import { toast } from "../../hooks/useToast";
import { pickCoinRequestPayer } from "../../lib/pickCoinRequestPayer";

interface Args {
  gangId: string | null;
  playerId: string | null;
  members: GangMember[];
  channels: GangChannel[];
  activeChannelId: string | null;
}

/**
 * The "Request Coins" button.
 *
 * Eligible → the request is sent immediately, no dialog. Still inside the
 * 4-hour window → nothing is sent and a dialog explains the wait with a live
 * countdown. The server enforces the window, so if this device's idea of it is
 * stale (another tab, a fresh load before the check returned) the server's
 * answer flips to the dialog instead of a confusing error.
 */
export function useCoinRequestAction({ gangId, playerId, members, channels, activeChannelId }: Args) {
  const createCoinRequest = useGangStore((s) => s.createCoinRequest);
  const fetchCoinRequestCooldown = useGangStore((s) => s.fetchCoinRequestCooldown);
  const cooldownEndsAt = useGangStore((s) => s.coinRequestCooldownEndsAt);
  const isCoolingDown = useIsCountingDown(cooldownEndsAt);
  const [showCooldown, setShowCooldown] = useState(false);
  // A ref, not state: two quick taps in the same tick must not both get through.
  const inFlight = useRef(false);

  useEffect(() => {
    void fetchCoinRequestCooldown();
  }, [fetchCoinRequestCooldown]);

  const requestCoins = useCallback(async (): Promise<void> => {
    if (!gangId || inFlight.current) return;

    if (isCoolingDown) {
      setShowCooldown(true);
      return;
    }

    const channelId =
      activeChannelId || channels.find((c) => c.type === "TEXT")?.channelId || channels[0]?.channelId;
    if (!channelId) {
      toast.error("No chat channel to post your request in.");
      return;
    }

    const payer = pickCoinRequestPayer(members, playerId);
    if (!payer) {
      toast.error("There is no one else in this Gang to ask yet.");
      return;
    }

    inFlight.current = true;
    try {
      const result = await createCoinRequest(gangId, channelId, payer.playerId, GANG_COIN_AMOUNT);
      if (result.success) {
        toast.success(`Asked the group for ${GANG_COIN_AMOUNT} coins.`);
      } else if (typeof result.retryAfterMs === "number") {
        setShowCooldown(true);
      } else {
        toast.error(result.error || "Could not send your request.");
      }
    } finally {
      inFlight.current = false;
    }
  }, [gangId, playerId, members, channels, activeChannelId, isCoolingDown, createCoinRequest]);

  return {
    requestCoins,
    isCoolingDown,
    cooldownEndsAt,
    showCooldown,
    closeCooldown: useCallback(() => setShowCooldown(false), []),
  };
}
