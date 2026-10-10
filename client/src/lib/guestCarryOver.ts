import { useEffect } from "react";
import type { BonusResult, CarryOverResult } from "@shared/carryover";
import { useAuthStore } from "../store/authStore";
import { refreshCurrentWallet } from "../hooks/useEconomy";
import { apiJson, clearGuestIdentity, currentGuestToken } from "./playerIdentity";

/**
 * A guest who signs up brings their coins with them.
 *
 * Runs once per signed-in session, silently. The server proves both halves (the account by
 * the bearer token, the guest by its own signed token), so nothing here decides who gets
 * what; this only carries the guest token across the sign-in and clears it when it is spent.
 *
 * ── When the guest token is kept, and when it is dropped ──────────────
 * Dropped once the server says it is finished with it: the coins came over, the guest was
 * already brought over, or there was nothing there. Kept when the answer is "not yet" (the
 * email is not confirmed, or the service is unavailable), so the next visit can try again
 * without the player doing anything. It is also kept if this account already brought a
 * different guest over, because dropping it would strand that other guest's coins.
 *
 * No new browser storage is used: the guest token is the one the app already stores.
 */

const FINISHED_CODES: ReadonlySet<string> = new Set(["GUEST_ALREADY_CLAIMED", "NO_GUEST"]);

let attemptedFor: string | null = null;

/** Test seam: forget that this session already tried. */
export function resetGuestCarryOverAttempt(): void {
  attemptedFor = null;
}

export async function runGuestCarryOver(userId: string): Promise<void> {
  if (attemptedFor === userId) return;
  attemptedFor = userId;

  const guestToken = currentGuestToken();
  if (guestToken) {
    const claim = await apiJson<CarryOverResult>("/api/carryover/claim", {
      method: "POST",
      body: JSON.stringify({ guestToken }),
    });
    if (claim?.ok || (claim && !claim.ok && FINISHED_CODES.has(claim.code))) clearGuestIdentity();
    if (claim?.ok && claim.amount > 0) void refreshCurrentWallet();
  }

  // Harmless for everyone else: "nothing to claim" and "play a match first" are plain answers.
  const bonus = await apiJson<BonusResult>("/api/carryover/bonus", { method: "POST" });
  if (bonus?.ok) void refreshCurrentWallet();
}

/** Mount once near the app root. */
export function useGuestCarryOver(): void {
  const userId = useAuthStore((s) => s.userId);
  const isMember = useAuthStore((s) => s.isMember);
  useEffect(() => {
    if (!userId || !isMember) return;
    void runGuestCarryOver(userId);
  }, [userId, isMember]);
}
