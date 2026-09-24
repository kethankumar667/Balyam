import { useCallback, useEffect, useRef, useState } from "react";
import type { MandaliChannel, MandaliMember } from "@shared/mandali/types.js";
import { MANDALI_COIN_AMOUNT } from "@shared/mandali/coinRules.js";
import { useMandaliStore } from "../../store/mandaliStore";
import { useIsCountingDown } from "../../hooks/useCountdown";
import { toast } from "../../hooks/useToast";
import { pickCoinRequestPayer } from "../../lib/pickCoinRequestPayer";

interface Args {
  mandaliId: string | null;
  playerId: string | null;
  members: MandaliMember[];
  channels: MandaliChannel[];
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
export function useCoinRequestAction({ mandaliId, playerId, members, channels, activeChannelId }: Args) {
  const createCoinRequest = useMandaliStore((s) => s.createCoinRequest);
  const fetchCoinRequestCooldown = useMandaliStore((s) => s.fetchCoinRequestCooldown);
  const cooldownEndsAt = useMandaliStore((s) => s.coinRequestCooldownEndsAt);
  const isCoolingDown = useIsCountingDown(cooldownEndsAt);
  const [showCooldown, setShowCooldown] = useState(false);
  // A ref, not state: two quick taps in the same tick must not both get through.
  const inFlight = useRef(false);

  useEffect(() => {
    void fetchCoinRequestCooldown();
  }, [fetchCoinRequestCooldown]);

  const requestCoins = useCallback(async (): Promise<void> => {
    if (!mandaliId || inFlight.current) return;

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
      toast.error("There is no one else in this Mandali to ask yet.");
      return;
    }

    inFlight.current = true;
    try {
      const result = await createCoinRequest(mandaliId, channelId, payer.playerId, MANDALI_COIN_AMOUNT);
      if (result.success) {
        toast.success(`Asked @${payer.displayName} for ${MANDALI_COIN_AMOUNT} coins.`);
      } else if (typeof result.retryAfterMs === "number") {
        setShowCooldown(true);
      } else {
        toast.error(result.error || "Could not send your request.");
      }
    } finally {
      inFlight.current = false;
    }
  }, [mandaliId, playerId, members, channels, activeChannelId, isCoolingDown, createCoinRequest]);

  return {
    requestCoins,
    isCoolingDown,
    cooldownEndsAt,
    showCooldown,
    closeCooldown: useCallback(() => setShowCooldown(false), []),
  };
}
