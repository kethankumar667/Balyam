import { useEffect, useRef } from "react";
import { useAuthStore } from "../store/authStore";
import { checkOperationalAccess } from "./operationalApi";

/**
 * Ask the server, once per sign-in, whether this signed-in member is also on
 * the admin allowlist — and if so, unlock admin state immediately.
 *
 * ── Why this exists ────────────────────────────────────────────────────
 * Without it, `isAdmin`/`isSuperAdmin` only ever became true after someone
 * actually navigated to `/admin` and `AdminRoute` ran its check — so an
 * admin's own account looked exactly like an ordinary member's everywhere
 * else in the app (profile badge, nav) until they happened to type the URL.
 * This runs the same `GET /api/operational/whoami` check `AdminRoute` uses,
 * just proactively, so the rest of the UI can show admin status and an
 * admin entry point without gating it behind that first visit.
 *
 * ── Why this lives outside authStore.ts ───────────────────────────────
 * `operationalApi.ts` already imports `currentAccessToken` from
 * `authStore.ts`. Importing `checkOperationalAccess` back into
 * `authStore.ts` would make that a real circular value-import; this hook
 * depends on both modules instead, so neither depends on it.
 *
 * ── Cost, and why it's worth it ───────────────────────────────────────
 * One extra request per sign-in for every member, not just admins — the
 * server has no cheaper way to answer "is this specific person on the
 * allowlist" than the same check `/admin` already performs. Runs once per
 * `userId` (via the ref below), not on every render or store update.
 */
export function useAdminAutoCheck(): void {
  const userId = useAuthStore((s) => s.userId);
  const isMember = useAuthStore((s) => s.isMember);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const checkedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!isMember || !userId || isAdmin) return;
    if (checkedFor.current === userId) return;
    checkedFor.current = userId;

    void checkOperationalAccess().then((principal) => {
      if (!principal) return;
      useAuthStore
        .getState()
        .grantAdminAccess(principal.kind === "admin-user" ? principal : {});
    });
  }, [userId, isMember, isAdmin]);
}
