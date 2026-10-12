/**
 * When to invite a first-time visitor to sign in.
 *
 * ── The rule, in one sentence ─────────────────────────────────────────
 * A guest who is on their first visit and has spent two minutes in the app is
 * shown one warm invitation, once, somewhere it will not interrupt play.
 *
 * ── Why "first visit" needs no new storage ────────────────────────────
 * The consent record (`bhalyam.consent`) is written the moment someone answers
 * the first-run consent dialog and is kept even when they decline, so "no
 * record when the app loads" means "has never been here". Returning visitors
 * therefore never see this, and nothing new is stored — which means nothing new
 * for the privacy inventory to declare and no notice version to bump.
 *
 * ── Where it stays quiet ──────────────────────────────────────────────
 * Over a live table (a modal mid-game is the one place an invitation does harm),
 * on the sign-in pages themselves, on the legal pages (someone reading the
 * privacy notice is deciding whether to trust us, not browsing), and in the
 * admin console. And it waits for the consent question to be answered first:
 * two dialogs at once is a wall.
 *
 * The decision is a pure function of its inputs so it can be tested without a
 * clock; the hook that feeds it lives in `hooks/useSignInInvite.ts`.
 */

/** Two minutes of active time before the invitation appears. */
export const SIGN_IN_INVITE_DELAY_MS = 2 * 60 * 1000;

/** Route prefixes where an invitation would be intrusive or pointless. */
const QUIET_PREFIXES: readonly string[] = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/room",
  "/tv",
  "/watch",
  "/privacy",
  "/terms",
  "/safety",
  "/admin",
  "/diagnostics",
  "/preview",
];

/** True for a path equal to a quiet prefix or nested under it — whole segments only. */
export function isQuietRoute(pathname: string): boolean {
  return QUIET_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export interface InviteContext {
  /** No consent record existed when the app loaded. */
  firstVisit: boolean;
  /** Visible time spent in the app this visit. */
  engagedMs: number;
  isMember: boolean;
  /** The session check has finished, so "not a member" is a fact, not a guess. */
  authReady: boolean;
  /** Accounts are connected in this build; without them there is nothing to sign in to. */
  authConfigured: boolean;
  /** The consent dialog is still waiting for an answer. */
  consentPending: boolean;
  pathname: string;
  /** Already shown during this visit. */
  alreadyShown: boolean;
}

export function shouldShowSignInInvite(context: InviteContext): boolean {
  return (
    context.firstVisit &&
    context.authReady &&
    context.authConfigured &&
    !context.isMember &&
    !context.alreadyShown &&
    !context.consentPending &&
    context.engagedMs >= SIGN_IN_INVITE_DELAY_MS &&
    !isQuietRoute(context.pathname)
  );
}
