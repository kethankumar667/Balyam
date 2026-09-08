import { deleteAccount } from "./supabase/profile";
import { isSupabaseConfigured } from "./supabase/client";
import { apiFetch } from "./playerIdentity";
import { eraseLocalData } from "./privacy/dataInventory";
import { clearAccountDetails } from "./accountGenerator";
import { clearGuestIdentity } from "./playerIdentity";
import { useRoomStore } from "../store/roomStore";
import { useAuthStore } from "../store/authStore";
import { capabilitiesFor } from "@shared/permissions";
import { RecentlyPlayedManager } from "../services/RecentlyPlayedManager";
import { FavouritesManager } from "../services/FavouritesManager";

const GUEST_STATE = {
  kind: "guest" as const,
  email: null,
  since: null,
};

export interface AccountDeletionResult {
  ok: boolean;
  error?: string;
}

/**
 * Executes a complete, irreversible account deletion across all layers:
 * 1. Supabase database: Purges auth.users row and cascading public.profiles.
 * 2. Game server: Deletes server-side profile, stats, and achievements via DELETE /api/profile/:id.
 * 3. Client storage: Clears all browser storage (localStorage, sessionStorage) and in-memory caches.
 * 4. Auth & Room stores: Resets session to a clean, unauthenticated Guest state.
 */
export async function executeAccountDeletion(
  effectivePlayerId?: string | null,
): Promise<AccountDeletionResult> {
  const isMember = useAuthStore.getState().isMember;
  const hasSupabaseAccount = isMember && isSupabaseConfigured;

  // 1. Supabase Account Deletion (if configured)
  if (hasSupabaseAccount) {
    const supabaseRes = await deleteAccount();
    if (!supabaseRes.ok) {
      return {
        ok: false,
        error:
          supabaseRes.error ??
          "Your account could not be deleted from the database. Please check your connection and try again.",
      };
    }
  }

  // 2. Game Server Profile Purge
  if (effectivePlayerId) {
    try {
      await apiFetch(`/api/profile/${encodeURIComponent(effectivePlayerId)}`, {
        method: "DELETE",
      });
    } catch {
      // Non-fatal: local and Supabase accounts still proceed
    }
  }

  // 3. Client Storage & Inventory Wipe
  try {
    eraseLocalData();
  } catch {}

  try {
    clearAccountDetails();
  } catch {}

  try {
    clearGuestIdentity();
  } catch {}

  try {
    RecentlyPlayedManager.clearRecentlyPlayed();
    FavouritesManager.clearFavourites();
  } catch {}

  try {
    useRoomStore.getState().resetIdentity();
  } catch {}

  try {
    localStorage.clear();
  } catch {}

  try {
    sessionStorage.clear();
  } catch {}

  // 4. Reset Auth Store to Fresh Guest State
  try {
    useAuthStore.setState({
      ...GUEST_STATE,
      userId: null,
      capabilities: capabilitiesFor("guest"),
      isMember: false,
      isAdmin: false,
      isSuperAdmin: false,
      ready: true,
    });
  } catch {}

  return { ok: true };
}
