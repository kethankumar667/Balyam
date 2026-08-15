import { create } from "zustand";
import type { AccountKind } from "@shared/types";
import { capabilitiesFor, type Capabilities } from "@shared/permissions";

/**
 * Whether this browser is a guest or a member.
 *
 * ── Read this before trusting it ──────────────────────────────────────
 * There is no account backend. Signing in writes a flag to localStorage and
 * nothing verifies it — no password is checked, because there is nothing to
 * check one against. Anyone can set `bhalyam.account` in devtools and become a
 * "member". That is a known, accepted state of this branch, not an oversight.
 *
 * So what is this actually for? It makes the PRODUCT rule real end to end —
 * which screens a guest sees, which controls lock, what the server does with a
 * guest-hosted room — and it puts every one of those decisions behind one
 * resolver. When sign-in becomes server-verified, `kind` stops being read from
 * localStorage and starts being read from a session the server issued, and not
 * one call site in the app changes.
 *
 * What it is NOT for: protecting anything. No private data hangs off this
 * flag. Seat ownership is still proved by the server-signed seat token
 * (server/src/lib/seatToken.ts), which is real cryptography and is entirely
 * independent of everything here — so forging membership gets you a shareable
 * room, not somebody else's hand of cards.
 *
 * Kept in its OWN store rather than folded into `useRoomStore` because it
 * outlives every room: it is who you are between tables, not what you are
 * doing at one.
 */

const ACCOUNT_KEY = "bhalyam.account";

interface StoredAccount {
  kind: AccountKind;
  email: string | null;
  /** When this browser signed in, for the profile screen. */
  since: number | null;
}

interface AuthStore extends StoredAccount {
  /** What this identity is allowed to do. Recomputed on every kind change. */
  capabilities: Capabilities;
  /** True for a real account. Read this instead of comparing `kind` by hand. */
  isMember: boolean;
  signIn: (email: string) => void;
  signOut: () => void;
}

/** A guest is the floor, not a failure state — an unreadable store lands here. */
const GUEST: StoredAccount = { kind: "guest", email: null, since: null };

function loadAccount(): StoredAccount {
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    if (!raw) return GUEST;
    const parsed = JSON.parse(raw) as Partial<StoredAccount> | null;
    // Only "member" is honoured. Any other value — a typo, a half-written
    // record, an older shape — reads as guest, so corruption fails closed.
    if (parsed?.kind !== "member") return GUEST;
    return {
      kind: "member",
      email: typeof parsed.email === "string" ? parsed.email : null,
      since: typeof parsed.since === "number" ? parsed.since : null,
    };
  } catch {
    return GUEST;
  }
}

function saveAccount(account: StoredAccount): void {
  try {
    if (account.kind === "member") localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
    else localStorage.removeItem(ACCOUNT_KEY);
  } catch {
    /* private browsing — the identity holds for this session only */
  }
}

const initial = loadAccount();

export const useAuthStore = create<AuthStore>((set) => ({
  ...initial,
  capabilities: capabilitiesFor(initial.kind),
  isMember: initial.kind === "member",

  signIn: (email) => {
    const next: StoredAccount = {
      kind: "member",
      email: email.trim().toLowerCase() || null,
      since: Date.now(),
    };
    saveAccount(next);
    set({ ...next, capabilities: capabilitiesFor("member"), isMember: true });
  },

  /**
   * Signing out drops the account and nothing else. Display name and avatar
   * live in `useRoomStore` and stay put on purpose: they are this device's
   * profile, not the account's, and a guest is allowed to have both. Wiping
   * them would mean signing out costs you your face and your name — a
   * punishment for leaving, and it would strand you mid-room as "Player".
   */
  signOut: () => {
    saveAccount(GUEST);
    set({ ...GUEST, capabilities: capabilitiesFor("guest"), isMember: false });
  },
}));

/** What you may do. The one hook every gate in the app should call. */
export function useCapabilities(): Capabilities {
  return useAuthStore((s) => s.capabilities);
}

/**
 * The account kind to put on the wire, read outside React.
 *
 * Join and create both fire from callbacks and effects that already hold a
 * socket, where a hook is not available — and reading it live rather than
 * closing over it means a join that happens right after signing in sends the
 * new kind, not the one that was current when the component mounted.
 */
export function currentAccountKind(): AccountKind {
  return useAuthStore.getState().kind;
}
