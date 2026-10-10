/**
 * Browser storage keys that a feature once wrote and nothing writes any more.
 *
 * Removing a feature does not remove what it left on players' devices. These three held a
 * guest's unredeemed voucher code between winning it and signing up to claim it; vouchers are
 * gone (a guest's prize is paid straight into their wallet), so a code left behind can never be
 * redeemed and is only a stranded credential. They were never declared in the privacy inventory
 * (`lib/privacy/dataInventory.ts`), so the "erase my data" control would not have found them
 * either — this is the one place that clears them.
 *
 * Add a key here when a feature that stored one is deleted. Never remove one while a browser
 * could still hold it.
 */
export const RETIRED_STORAGE_KEYS: readonly string[] = [
  "bhalyam.pending_vouchers",
  "bhalyam.pending_voucher_code",
  "bhalyam.pending_voucher_amount",
];

/** Remove every retired key from both kinds of storage. Safe to call on every start; never throws. */
export function purgeRetiredStorage(): void {
  for (const area of ["localStorage", "sessionStorage"] as const) {
    try {
      const storage = window[area];
      for (const key of RETIRED_STORAGE_KEYS) storage.removeItem(key);
    } catch {
      // Storage blocked or unavailable (private mode, a locked-down browser): nothing was written
      // there that this device could read back, so there is nothing to clear.
    }
  }
}
