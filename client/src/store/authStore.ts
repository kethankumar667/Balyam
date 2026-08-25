import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import type { AccountKind } from "@shared/types";
import { capabilitiesFor, type Capabilities } from "@shared/permissions";
import { useRoomStore } from "./roomStore";
import { getSupabase, isSupabaseConfigured, SESSION_STORAGE_KEY } from "../lib/supabase/client";
import { fetchProfile, saveProfile } from "../lib/supabase/profile";
import { saveAccountDetails, clearAccountDetails } from "../lib/accountGenerator";
import { clearGuestIdentity } from "../lib/playerIdentity";

/**
 * The name Supabase itself already knows for this person, if any.
 *
 * Signup and Google OAuth both write to `user_metadata`, but under
 * different keys (`display_name` from our own signup form, `full_name` or
 * `name` from Google) — checked in that order because `display_name` is
 * the one the person actually chose, when it exists. Used to seed a brand
 * new `profiles` row so the identity Supabase already has for someone is
 * never discarded in favor of whatever this device's local guest nickname
 * happened to be.
 */
export function metadataDisplayName(meta: Record<string, unknown> | null | undefined): string | null {
  if (!meta) return null;
  const name = meta.display_name ?? meta.full_name ?? meta.name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

/**
 * Whether this browser is a guest or a member.
 *
 * ── Two backings, one shape ───────────────────────────────────────────
 * With Supabase keys configured, `kind` is read off a real session issued by
 * a real auth service: a password was checked, and the same session yields an
 * access token the game server verifies before it will open a shareable room.
 * Membership is a fact.
 *
 * With no keys — the default, and what `npm run dev` still gets — nothing has
 * changed from before: signing in writes a flag to `bhalyam.account` and
 * nothing verifies it. Anyone can set that key in devtools and become a
 * "member". Those builds say so on the sign-in screen rather than pretending.
 *
 * The seam this store was built around is the whole point, and it held: not
 * one gate, page or call site changes between the two. `capabilities` is
 * still the only thing anything reads.
 *
 * ── What is still not protected by this ───────────────────────────────
 * Seat ownership. That is proved by the server-signed seat token
 * (server/src/lib/seatToken.ts), which is independent of everything here and
 * remains the only thing standing between a room code and somebody else's
 * hand of cards.
 *
 * Kept in its OWN store rather than folded into `useRoomStore` because it
 * outlives every room: it is who you are between tables, not what you are
 * doing at one.
 */

const ACCOUNT_KEY = "bhalyam.account";

interface StoredAccount {
  kind: AccountKind;
  email: string | null;
  /** Epoch ms. Sign-in time locally; account creation time with Supabase. */
  since: number | null;
}

interface AuthStore extends StoredAccount {
  /** What this identity is allowed to do. Recomputed on every kind change. */
  capabilities: Capabilities;
  /** True for a real account. Read this instead of comparing `kind` by hand. */
  isMember: boolean;
  /** True for an admin or super admin account. */
  isAdmin: boolean;
  /** True for a super admin account with all platform features unlocked. */
  isSuperAdmin: boolean;
  /** Supabase user id. `null` on the local-flag path — there is no user. */
  userId: string | null;
  /**
   * True once the real session state is known.
   *
   * Only ever false for the first moments of a configured build, while the
   * stored session is re-checked. A screen that would flash a sign-in wall at
   * a signed-in player can wait on this; most do not need to, because the
   * optimistic read below usually gets the first paint right.
   */
  ready: boolean;
  /** Sign in on the local-flag path. Does nothing when Supabase is configured. */
  signInLocal: (email: string) => void;
  /** Sign in as Super Admin with all platform features and admin tools unlocked. */
  signInSuperAdmin: () => void;
  /** Dynamically toggle Super Admin state. */
  setSuperAdmin: (enabled: boolean) => void;
  signOut: () => Promise<void>;
}

/** A guest is the floor, not a failure state — an unreadable store lands here. */
const GUEST: StoredAccount = { kind: "guest", email: null, since: null };

function loadLocalAccount(): StoredAccount {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return GUEST;
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    if (!raw) return GUEST;
    const parsed = JSON.parse(raw) as Partial<StoredAccount> | null;
    if (parsed?.kind === "super_admin" || parsed?.kind === "admin" || parsed?.kind === "member") {
      return {
        kind: parsed.kind,
        email: typeof parsed.email === "string" ? parsed.email : null,
        since: typeof parsed.since === "number" ? parsed.since : null,
      };
    }
    return GUEST;
  } catch {
    return GUEST;
  }
}

function saveLocalAccount(account: StoredAccount): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  try {
    if (account.kind === "member" || account.kind === "admin" || account.kind === "super_admin") {
      localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
    } else {
      localStorage.removeItem(ACCOUNT_KEY);
    }
  } catch {
    /* private browsing — the identity holds for this session only */
  }
}

/**
 * Guess the session from storage, before the auth client has confirmed it.
 *
 * supabase-js resolves the stored session asynchronously — it may refresh an
 * expired token over the network first — so a hard refresh would otherwise
 * paint one frame as a guest and lock a signed-in player out of their own
 * controls before correcting itself. Reading the same record synchronously
 * removes the flash.
 *
 * Being wrong here is cheap and self-correcting: `onAuthStateChange` fires
 * within a tick either way, and nothing downstream trusts this value — the
 * server checks the token before it opens a shareable room, so an optimistic
 * "member" that turns out to be stale buys a moment of enabled buttons and
 * nothing else.
 */
function peekStoredSession(): { email: string | null; userId: string | null } | null {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      expires_at?: number;
      refresh_token?: string;
      user?: { id?: string; email?: string };
    } | null;
    if (!parsed?.user?.id) return null;
    // An expired access token is fine as long as a refresh token can renew
    // it; only a session with neither is genuinely dead.
    const stillValid =
      (typeof parsed.expires_at === "number" && parsed.expires_at * 1000 > Date.now()) ||
      typeof parsed.refresh_token === "string";
    if (!stillValid) return null;
    return { email: parsed.user.email ?? null, userId: parsed.user.id };
  } catch {
    return null;
  }
}

function initialState(): StoredAccount & { userId: string | null; ready: boolean } {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return { ...GUEST, userId: null, ready: true };
  }
  const local = loadLocalAccount();
  if (local.kind === "super_admin" || local.kind === "admin" || local.kind === "member") {
    return { ...local, userId: null, ready: true };
  }
  if (!isSupabaseConfigured) {
    return { ...local, userId: null, ready: true };
  }
  const peeked = peekStoredSession();
  return peeked
    ? { kind: "member", email: peeked.email, since: null, userId: peeked.userId, ready: false }
    : { ...GUEST, userId: null, ready: false };
}

const initial = initialState();

export const useAuthStore = create<AuthStore>((set) => ({
  ...initial,
  capabilities: capabilitiesFor(initial.kind),
  isMember: initial.kind === "member" || initial.kind === "admin" || initial.kind === "super_admin",
  isAdmin: initial.kind === "admin" || initial.kind === "super_admin",
  isSuperAdmin: initial.kind === "super_admin",

  signInLocal: (email) => {
    const next: StoredAccount = {
      kind: "member",
      email: email.trim().toLowerCase() || null,
      since: Date.now(),
    };
    saveLocalAccount(next);
    set({
      ...next,
      capabilities: capabilitiesFor("member"),
      isMember: true,
      isAdmin: false,
      isSuperAdmin: false,
      ready: true,
    });
  },

  signInSuperAdmin: () => {
    const next: StoredAccount = {
      kind: "super_admin",
      email: "superadmin@bhalyam.io",
      since: Date.now(),
    };
    saveLocalAccount(next);
    set({
      ...next,
      capabilities: capabilitiesFor("super_admin"),
      isMember: true,
      isAdmin: true,
      isSuperAdmin: true,
      ready: true,
    });
  },

  setSuperAdmin: (enabled) => {
    if (enabled) {
      const next: StoredAccount = {
        kind: "super_admin",
        email: "superadmin@bhalyam.io",
        since: Date.now(),
      };
      saveLocalAccount(next);
      set({
        ...next,
        capabilities: capabilitiesFor("super_admin"),
        isMember: true,
        isAdmin: true,
        isSuperAdmin: true,
        ready: true,
      });
    } else {
      const next: StoredAccount = {
        kind: "member",
        email: null,
        since: Date.now(),
      };
      saveLocalAccount(next);
      set({
        ...next,
        capabilities: capabilitiesFor("member"),
        isMember: true,
        isAdmin: false,
        isSuperAdmin: false,
        ready: true,
      });
    }
  },

  signOut: async () => {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    }
    saveLocalAccount(GUEST);
    clearAccountDetails();
    try {
      clearGuestIdentity();
    } catch {}
    // A deliberate sign-out, unlike a routine "no session" resolution on page
    // load (see applyGuest below), is the one moment the player has actually
    // asked to stop being this account — so the device identity resets with
    // it rather than quietly carrying the old name/avatar into the next
    // guest session.
    useRoomStore.getState().setPlayerName("");
    useRoomStore.getState().setAvatarId(null);
    set({
      ...GUEST,
      userId: null,
      capabilities: capabilitiesFor("guest"),
      isMember: false,
      isAdmin: false,
      isSuperAdmin: false,
      ready: true,
    });
  },
}));

if (typeof window !== "undefined") {
  (window as any).__authStore = useAuthStore;
}

/* ──────────────────── Session → store, and profile sync ──────────────────── */

/** Latest access token, kept outside React for the socket payloads below. */
let accessToken: string | null = null;

/** Undoes the roomStore subscription when the player signs out. */
let stopProfileSync: (() => void) | null = null;

function applySession(session: Session | null): void {
  accessToken = session?.access_token ?? null;

  if (!session?.user) {
    if (!isSupabaseConfigured) {
      const local = loadLocalAccount();
      if (local.kind === "super_admin" || local.kind === "admin" || local.kind === "member") {
        useAuthStore.setState({
          ...local,
          userId: null,
          capabilities: capabilitiesFor(local.kind),
          isMember: true,
          isAdmin: local.kind === "admin" || local.kind === "super_admin",
          isSuperAdmin: local.kind === "super_admin",
          ready: true,
        });
        return;
      }
    }
    applyGuest();
    return;
  }
  const createdAt = Date.parse(session.user.created_at ?? "");
  const meta = session.user.user_metadata;
  if (meta) {
    saveAccountDetails({
      firstName: meta.first_name || "",
      lastName: meta.last_name || "",
      displayName: metadataDisplayName(meta) || session.user.email?.split("@")[0] || "Player",
      email: session.user.email || "",
      dob: meta.dob || "",
      gender: meta.gender || "",
      accountId: meta.account_id || "",
      createdAt: new Date(session.user.created_at || Date.now()).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    });
  }
  const local = loadLocalAccount();
  const kind: AccountKind =
    local.kind === "super_admin" || local.kind === "admin" ? local.kind : "member";
  useAuthStore.setState({
    kind,
    email: session.user.email ?? null,
    since: Number.isNaN(createdAt) ? null : createdAt,
    userId: session.user.id,
    capabilities: capabilitiesFor(kind),
    isMember: true,
    isAdmin: kind === "super_admin" || kind === "admin",
    isSuperAdmin: kind === "super_admin",
    ready: true,
  });
}

function applyGuest(): void {
  saveLocalAccount(GUEST);
  clearAccountDetails();
  /*
   * Used to also wipe `useRoomStore`'s playerName/avatarId here — but this
   * runs on EVERY resolved "no session" check, which for an actual guest is
   * every single page load (`getSession()` always resolves with no session
   * for them). `useRoomStore`'s own initializer already restores the name
   * from localStorage synchronously at import time, before this async
   * handler ever runs — so the sequence on every guest page load was: name
   * renders correctly for a moment, then this callback fires a beat later
   * and erases it, in both memory and localStorage. Name/avatar are a
   * device play-identity, independent of auth state; this function's job
   * is only to reset the *auth* state to guest.
   */
  useAuthStore.setState({
    ...GUEST,
    userId: null,
    capabilities: capabilitiesFor("guest"),
    isMember: false,
    ready: true,
  });
}

/**
 * Keep the profile row and this device's name/avatar in step.
 *
 * ── Which side wins ───────────────────────────────────────────────────
 * On sign-in, the server does, when it has anything to say. That is the
 * reason the row exists: sign in on a phone after setting your name on a
 * laptop and you should still be you, not "Player 3". Where the row is empty
 * — a brand-new account, or one made before this table did — a name Supabase
 * already knows for this person (signup's `display_name`, or Google's
 * `full_name`/`name`) goes up instead. Only once neither source has a name
 * does this device's current, possibly-unrelated guest nickname get pushed
 * up — otherwise the first sign-in on a browser that happened to have
 * "Jetpacker" typed in from local guest play would overwrite the real name
 * permanently, and every later sign-in would keep re-pulling it back down.
 *
 * ── Why the loop does not run away ────────────────────────────────────
 * Pulling the profile writes to `useRoomStore`, and writes to `useRoomStore`
 * are what trigger a push. `lastSynced` breaks the cycle: a change that
 * matches what we just read is not a change worth sending back.
 */
async function startProfileSync(
  userId: string,
  meta: Record<string, unknown> | null | undefined,
): Promise<void> {
  stopProfileSync?.();

  const room = useRoomStore.getState();
  const local = {
    displayName: metadataDisplayName(meta) || room.playerName.trim() || null,
    avatarId: room.avatarId,
    bio: room.bio.trim() || null,
    region: room.region.trim() || null,
  };
  const remote = await fetchProfile(userId);

  let lastSynced = {
    displayName: remote?.displayName ?? null,
    avatarId: remote?.avatarId ?? null,
    bio: remote?.bio ?? null,
    region: remote?.region ?? null,
  };

  if (remote?.displayName || remote?.avatarId || remote?.accountId) {
    if (remote.displayName) useRoomStore.getState().setPlayerName(remote.displayName);
    if (remote.avatarId) useRoomStore.getState().setAvatarId(remote.avatarId);
    if (remote.bio) useRoomStore.getState().setBio(remote.bio);
    if (remote.region) useRoomStore.getState().setRegion(remote.region);
    saveAccountDetails({
      firstName: remote.firstName || "",
      lastName: remote.lastName || "",
      displayName: remote.displayName || "Player",
      email: remote.email || "",
      dob: remote.dob || "",
      gender: remote.gender || "",
      accountId: remote.accountId || "",
      createdAt: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
    });
    // A field the row left empty is still worth carrying up from here.
    const merged = {
      ...remote,
      displayName: remote.displayName ?? local.displayName,
      avatarId: remote.avatarId ?? local.avatarId,
      bio: remote.bio ?? local.bio,
      region: remote.region ?? local.region,
    };
    if (
      merged.displayName !== lastSynced.displayName ||
      merged.avatarId !== lastSynced.avatarId ||
      merged.bio !== lastSynced.bio ||
      merged.region !== lastSynced.region
    ) {
      lastSynced = merged;
      void saveProfile(userId, merged);
    }
  } else if (local.displayName || local.avatarId || local.bio || local.region) {
    lastSynced = local;
    void saveProfile(userId, local);
  }

  // Debounced, because the profile screen writes on every keystroke and each
  // one would otherwise be its own round trip.
  let timer: number | null = null;
  const unsubscribe = useRoomStore.subscribe((state) => {
    const next = {
      displayName: state.playerName.trim() || null,
      avatarId: state.avatarId,
      bio: state.bio.trim() || null,
      region: state.region.trim() || null,
    };
    if (
      next.displayName === lastSynced.displayName &&
      next.avatarId === lastSynced.avatarId &&
      next.bio === lastSynced.bio &&
      next.region === lastSynced.region
    ) {
      return;
    }
    if (timer !== null) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = null;
      // Signed out while the timer was pending — the row is not ours to write.
      if (useAuthStore.getState().userId !== userId) return;
      lastSynced = next;
      void saveProfile(userId, next);
    }, 800);
  });

  stopProfileSync = () => {
    if (timer !== null) window.clearTimeout(timer);
    unsubscribe();
    stopProfileSync = null;
  };
}

/**
 * Wire the store to the auth service. Runs once, at import.
 *
 * `onAuthStateChange` covers every way a session can begin or end that this
 * app does not initiate itself: the OAuth redirect landing back on a route,
 * a recovery link opening, a refresh token expiring overnight, or another tab
 * signing out. Polling for those, or setting state at each call site, is how
 * two screens end up disagreeing about who is signed in.
 */
if (isSupabaseConfigured) {
  const supabase = getSupabase();
  if (supabase) {
    let syncedUserId: string | null = null;

    const onSession = (session: Session | null): void => {
      applySession(session);
      const userId = session?.user?.id ?? null;
      if (userId && userId !== syncedUserId) {
        syncedUserId = userId;
        void startProfileSync(userId, session?.user?.user_metadata);
      } else if (!userId && syncedUserId) {
        syncedUserId = null;
        stopProfileSync?.();
      }
    };

    // Resolves the stored session, exchanging an OAuth or recovery `?code=`
    // for one first if the page was reached from an emailed link.
    void supabase.auth
      .getSession()
      .then(({ data }) => onSession(data.session))
      .catch(() => applyGuest());

    supabase.auth.onAuthStateChange((_event, session) => onSession(session));
  }
}

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

/**
 * The access token that PROVES that kind, or `undefined` when there is none.
 *
 * Sent alongside `accountKind` on create and join. The server treats the kind
 * as a claim and this as the evidence: with verification configured, a claim
 * without evidence is downgraded to guest. On the local-flag path there is no
 * token to send and the server has nothing to check it with, so both sides
 * fall back to trusting the claim, exactly as before.
 */
export function currentAccessToken(): string | undefined {
  return accessToken ?? undefined;
}

/** True when the current user is an admin or super admin. */
export function useIsAdmin(): boolean {
  return useAuthStore((s) => s.isAdmin || s.isSuperAdmin);
}

/** True when the current user is a super admin with all features unlocked. */
export function useIsSuperAdmin(): boolean {
  return useAuthStore((s) => s.isSuperAdmin);
}
