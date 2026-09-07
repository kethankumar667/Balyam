const PENDING_VOUCHER_CODE_KEY = "bhalyam.pending_voucher_code";
const PENDING_VOUCHER_AMOUNT_KEY = "bhalyam.pending_voucher_amount";

export interface PendingVoucherData {
  code: string;
  amount?: string;
}

/**
 * Persists an unredeemed voucher code (and optional amount) in browser session/local
 * storage so guest players who click "Claim Coins" can complete signup and immediately
 * claim their winnings upon arriving on the home page.
 */
export function savePendingVoucher(code: string, amount?: string): void {
  const trimmed = code.trim();
  if (!trimmed) return;
  try {
    sessionStorage.setItem(PENDING_VOUCHER_CODE_KEY, trimmed);
    if (amount) sessionStorage.setItem(PENDING_VOUCHER_AMOUNT_KEY, amount);
  } catch {}
  try {
    localStorage.setItem(PENDING_VOUCHER_CODE_KEY, trimmed);
    if (amount) localStorage.setItem(PENDING_VOUCHER_AMOUNT_KEY, amount);
  } catch {}
}

/**
 * Retrieves any pending voucher waiting to be claimed after signup.
 */
export function getPendingVoucher(): PendingVoucherData | null {
  let code: string | null = null;
  let amount: string | null = null;
  try {
    code = sessionStorage.getItem(PENDING_VOUCHER_CODE_KEY);
    amount = sessionStorage.getItem(PENDING_VOUCHER_AMOUNT_KEY);
  } catch {}
  if (!code) {
    try {
      code = localStorage.getItem(PENDING_VOUCHER_CODE_KEY);
      amount = localStorage.getItem(PENDING_VOUCHER_AMOUNT_KEY);
    } catch {}
  }
  if (!code || !code.trim()) return null;
  return { code: code.trim(), amount: amount || undefined };
}

/**
 * Clears pending voucher storage after redemption or dismissal.
 */
export function clearPendingVoucher(): void {
  try {
    sessionStorage.removeItem(PENDING_VOUCHER_CODE_KEY);
    sessionStorage.removeItem(PENDING_VOUCHER_AMOUNT_KEY);
  } catch {}
  try {
    localStorage.removeItem(PENDING_VOUCHER_CODE_KEY);
    localStorage.removeItem(PENDING_VOUCHER_AMOUNT_KEY);
  } catch {}
}
