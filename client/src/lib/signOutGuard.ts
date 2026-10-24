import type { DeviceBestEntry } from "@shared/profile/Scorecard";
import { listDeviceBests } from "../features/myrecords/deviceRecords";
import { useScorecardStore } from "../store/scorecardStore";
import { peekPlayerCredential } from "./playerIdentity";
import { pendingScores } from "./scoreOutbox";

/** Records that signing out would destroy: they exist only on this device. */
export interface RecordsAtRisk {
  playerId: string;
  /** Finished results still waiting to be sent to the account. */
  pending: number;
  /** Bests the device holds that the account does not. */
  deviceBests: DeviceBestEntry[];
}

/** Long enough for a normal request, short enough that a dead connection cannot trap someone in the menu. */
const CHECK_TIMEOUT_MS = 4000;

const withTimeout = (work: Promise<unknown>, ms: number): Promise<unknown> =>
  Promise.race([work.catch(() => undefined), new Promise((resolve) => setTimeout(resolve, ms))]);

/**
 * What would be lost if this member signed out now, or `null` when nothing would.
 *
 * Sign-out clears local storage on purpose, so the next person on a shared phone starts clean. That also
 * deletes every score that only ever reached this device, and the player is never told. So this runs first:
 * it sends anything waiting (the account read does that before it reads), then compares what the device holds
 * with what the account holds. If the server cannot answer in time it reports what it can see and errs on the
 * side of warning, because losing a record cannot be undone and an extra question can.
 *
 * Only a signed-in member is checked. A guest's sign-out does not wipe the device.
 */
export async function checkRecordsAtRisk(timeoutMs = CHECK_TIMEOUT_MS): Promise<RecordsAtRisk | null> {
  const credential = peekPlayerCredential();
  if (credential?.kind !== "member") return null;
  const { playerId } = credential;

  await withTimeout(useScorecardStore.getState().fetchScorecards(playerId), timeoutMs);

  const { archive } = useScorecardStore.getState();
  const pending = pendingScores(playerId).length;
  const deviceBests = listDeviceBests(archive?.playerId === playerId ? archive : null);
  return pending === 0 && deviceBests.length === 0 ? null : { playerId, pending, deviceBests };
}
