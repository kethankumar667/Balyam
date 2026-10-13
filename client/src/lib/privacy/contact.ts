/**
 * Who a player contacts about their data — DPDP Section 13.
 *
 * The Act requires a "readily available means" of grievance redressal, which
 * means a real address a real person reads. There is deliberately no default
 * here: a plausible-looking placeholder like `privacy@bhalyam.example` would
 * render a compliance surface that looks finished and silently swallows every
 * request, which is worse than showing nothing — the player believes they
 * have exercised a right they have not.
 *
 * So while this is unset, the UI says the channel is not live yet and points
 * people somewhere that works. Set it before the app collects anything from
 * anyone but you.
 *
 * Set `VITE_PRIVACY_CONTACT_EMAIL` in the client environment (Render → the
 * static site's environment variables) rather than hard-coding it, so the
 * address can change without a code review.
 */
const configured = (import.meta.env?.VITE_PRIVACY_CONTACT_EMAIL as string | undefined)?.trim();

/** The grievance address, or null while nobody has configured one. */
export const PRIVACY_CONTACT_EMAIL: string | null = configured && configured.includes("@") ? configured : null;

/**
 * What the Act expects us to promise once the channel is live.
 * Stated in the UI so the timeline is a commitment, not an aspiration.
 */
export const GRIEVANCE_ACK_HOURS = 24;
export const GRIEVANCE_RESOLVE_DAYS = 15;

const readEnv = (value: unknown): string | null => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * The named Grievance Officer (IT Rules 2021, Rule 3(2)). Like the address,
 * there is no default: a made-up name on a compliance page is worse than none.
 * Set `VITE_GRIEVANCE_OFFICER_NAME` / `VITE_GRIEVANCE_OFFICER_ADDRESS`.
 */
export const GRIEVANCE_OFFICER_NAME: string | null = readEnv(import.meta.env?.VITE_GRIEVANCE_OFFICER_NAME);
export const GRIEVANCE_OFFICER_ADDRESS: string | null = readEnv(import.meta.env?.VITE_GRIEVANCE_OFFICER_ADDRESS);

export const PRIVACY_CONTACT_CONFIGURED = PRIVACY_CONTACT_EMAIL !== null;
