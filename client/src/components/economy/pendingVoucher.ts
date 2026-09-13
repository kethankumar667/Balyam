const PENDING_VOUCHERS_KEY = "bhalyam.pending_vouchers";

/**
 * Pre-list single-slot keys. Read once as a migration fallback so a browser
 * that saved a voucher before this file grew a list doesn't lose it, then
 * folded into the list and removed — see `readRawList()`.
 */
const LEGACY_CODE_KEY = "bhalyam.pending_voucher_code";
const LEGACY_AMOUNT_KEY = "bhalyam.pending_voucher_amount";

export interface PendingVoucherData {
  code: string;
  amount?: string;
}

/**
 * Caps the queue so a bug elsewhere can't grow it without bound. Five
 * unclaimed guest wins in one sitting is already an edge case, not a
 * scenario that needs more room.
 */
const MAX_PENDING = 5;

/**
 * Every unredeemed voucher a guest has won, waiting to be claimed the moment
 * they sign up.
 *
 * ── Why a list, not a single slot ─────────────────────────────────────────
 * A guest who wins twice before signing up — exactly the flow of playing one
 * match, closing the tab, then playing another — used to have their SECOND
 * win's `savePendingVoucher()` call silently overwrite the first. The first
 * win's voucher still existed server-side (a valid, still-redeemable row),
 * but nothing in the client remembered it needed claiming, and its raw code
 * — a bearer secret shown once by design — was gone from view the moment its
 * modal closed. `BhalyamHome`'s auto-claim flow now works through this list
 * one voucher at a time instead of assuming there is ever only one.
 */
function parseList(raw: string | null): PendingVoucherData[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (v): v is PendingVoucherData =>
        !!v && typeof v === "object" && typeof (v as PendingVoucherData).code === "string" && (v as PendingVoucherData).code.trim().length > 0,
    );
  } catch {
    return [];
  }
}

function readLegacySingle(): PendingVoucherData[] {
  let code: string | null = null;
  let amount: string | null = null;
  try {
    code = sessionStorage.getItem(LEGACY_CODE_KEY);
    amount = sessionStorage.getItem(LEGACY_AMOUNT_KEY);
  } catch {}
  if (!code) {
    try {
      code = localStorage.getItem(LEGACY_CODE_KEY);
      amount = localStorage.getItem(LEGACY_AMOUNT_KEY);
    } catch {}
  }
  if (!code || !code.trim()) return [];
  return [{ code: code.trim(), amount: amount || undefined }];
}

function readRawList(): PendingVoucherData[] {
  let fromSession: PendingVoucherData[] = [];
  try {
    fromSession = parseList(sessionStorage.getItem(PENDING_VOUCHERS_KEY));
  } catch {}
  if (fromSession.length > 0) return fromSession;

  let fromLocal: PendingVoucherData[] = [];
  try {
    fromLocal = parseList(localStorage.getItem(PENDING_VOUCHERS_KEY));
  } catch {}
  if (fromLocal.length > 0) return fromLocal;

  return readLegacySingle();
}

function writeList(list: PendingVoucherData[]): void {
  const json = JSON.stringify(list);
  try {
    sessionStorage.setItem(PENDING_VOUCHERS_KEY, json);
  } catch {}
  try {
    localStorage.setItem(PENDING_VOUCHERS_KEY, json);
  } catch {}
  // Once anything has been written to the list, the legacy single-slot keys
  // must not resurrect a stale or already-claimed voucher on a later read.
  try {
    sessionStorage.removeItem(LEGACY_CODE_KEY);
    sessionStorage.removeItem(LEGACY_AMOUNT_KEY);
  } catch {}
  try {
    localStorage.removeItem(LEGACY_CODE_KEY);
    localStorage.removeItem(LEGACY_AMOUNT_KEY);
  } catch {}
}

/**
 * Adds an unredeemed voucher code (and optional amount) to the queue of
 * guest wins waiting to be claimed after signup. Appends rather than
 * overwrites — re-saving the same code moves it to the end instead of
 * duplicating it.
 */
export function savePendingVoucher(code: string, amount?: string): void {
  const trimmed = code.trim();
  if (!trimmed) return;
  const list = readRawList().filter((v) => v.code !== trimmed);
  list.push({ code: trimmed, amount });
  writeList(list.slice(-MAX_PENDING));
}

/** Every pending voucher waiting to be claimed after signup, oldest first. */
export function getPendingVouchers(): PendingVoucherData[] {
  return readRawList();
}

/**
 * The oldest pending voucher, or `null`. Back-compat single-item read for
 * callers that only ever handled one at a time.
 */
export function getPendingVoucher(): PendingVoucherData | null {
  return readRawList()[0] ?? null;
}

/**
 * Removes one voucher from the queue by code — after it redeems, or the
 * player dismisses its claim prompt without redeeming. Leaves every other
 * pending voucher untouched, which is the whole point: a queue where
 * resolving one entry doesn't erase the rest.
 */
export function removePendingVoucher(code: string): void {
  const trimmed = code.trim();
  if (!trimmed) return;
  writeList(readRawList().filter((v) => v.code !== trimmed));
}

/** Clears every pending voucher. */
export function clearPendingVoucher(): void {
  writeList([]);
}
