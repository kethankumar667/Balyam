import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

/**
 * Sign out, and leave.
 *
 * Signing out on a page that belongs to the account — a Mandali, a profile, a
 * room — must not leave that page on screen. The convention everywhere else is
 * to land on the public front door and to make sure Back cannot return to what
 * was just left, so this navigates to home with `replace`.
 *
 * It leaves BEFORE the session ends, not after. Once the account is gone a
 * protected route redirects on its own (to sign-in, with a "return to" the page
 * just left); asking to leave first means the person is on the public page even
 * if ending the session is slow or fails, and that redirect has nothing left to
 * act on.
 */
export function useSignOut(): () => Promise<void> {
  const navigate = useNavigate();
  return useCallback(async () => {
    navigate("/", { replace: true });
    await useAuthStore.getState().signOut();
  }, [navigate]);
}
