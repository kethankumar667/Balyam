/**
 * Account ID generator and Era computation.
 *
 * ── Era Tag Rules ─────────────────────────────────────────────────────
 * - Year <= 1980: "70S"
 * - Year 1981 - 1990: "80S"
 * - Year 1991 - 2000: "90S" (1991-2000 -> 90s kid)
 * - Year 2001 - 2010: "21S" (2001-2010 -> 21st century kid)
 * - Year 2011 - 2020: "10S"
 * - Year 2021+: "20S"
 */

export function getEraFromBirthYear(year: number): string {
  if (isNaN(year) || year < 1900) return "90S";
  if (year <= 1980) return "70S";
  if (year >= 1981 && year <= 1990) return "80S";
  if (year >= 1991 && year <= 2000) return "90S";
  if (year >= 2001 && year <= 2010) return "21S";
  if (year >= 2011 && year <= 2020) return "10S";
  return "20S";
}

/**
 * Generates an Account ID in the format: BHYM-<ERA>-<XXXX>-<YYY>
 * Example: BHYM-90S-4827-11 or BHYM-21S-9481-82
 */
export function generateAccountId(dob?: string | Date | number): string {
  let year = 1995;
  if (dob) {
    if (typeof dob === "number") {
      year = dob;
    } else {
      const parsed = new Date(dob);
      const parsedYear = parsed.getFullYear();
      if (!isNaN(parsedYear) && parsedYear > 1900 && parsedYear < 2100) {
        year = parsedYear;
      }
    }
  }
  const era = getEraFromBirthYear(year);
  const xxxx = Math.floor(1000 + Math.random() * 9000); // 4 digits
  const yyy = Math.floor(10 + Math.random() * 90);      // 2 digits
  return `BHYM-${era}-${xxxx}-${yyy}`;
}

export interface UserAccountDetails {
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  dob: string;
  gender: string;
  accountId: string;
  createdAt: string;
}

const ACCOUNT_DETAILS_KEY = "bhalyam.account_details";

export function saveAccountDetails(details: UserAccountDetails): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(ACCOUNT_DETAILS_KEY, JSON.stringify(details));
  } catch {}
}

export function loadAccountDetails(): UserAccountDetails | null {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACCOUNT_DETAILS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
