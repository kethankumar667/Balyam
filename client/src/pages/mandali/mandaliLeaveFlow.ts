type Result = { success: boolean; error?: string };

export interface LeaveFlowDeps {
  transferOwnership: (mandaliId: string, newOwnerId: string) => Promise<Result>;
  leaveMandali: (mandaliId: string) => Promise<Result>;
}

/**
 * Leave a Mandali.
 *
 * An ordinary member simply leaves. The host cannot — the group would be left
 * with nobody in charge — so they name someone to take over, and the hand-over
 * happens FIRST. If it fails, nothing else happens and they remain the host. If
 * it works but leaving then fails, the host role has already moved, so the
 * message says so rather than pretending nothing changed; trying again is safe
 * because they now leave as an ordinary admin.
 */
export async function leaveMandaliFlow(
  deps: LeaveFlowDeps,
  mandaliId: string,
  newHostId?: string,
): Promise<Result> {
  const handingOver = typeof newHostId === "string" && newHostId.length > 0;

  if (handingOver) {
    const transfer = await deps.transferOwnership(mandaliId, newHostId);
    if (!transfer.success) {
      return { success: false, error: transfer.error || "Could not hand the Mandali over. You are still the host." };
    }
  }

  const left = await deps.leaveMandali(mandaliId);
  if (left.success) return { success: true };

  if (handingOver) {
    return {
      success: false,
      error: `You are no longer the host, but leaving did not go through${left.error ? `: ${left.error}` : "."} You can try leaving again.`,
    };
  }
  return left;
}
