import { useCallback, useEffect, useRef, useState } from "react";
import type { AdminUserDetails, AdminUserSummary } from "@shared/adminUsers";
import { operationalFetch } from "../../../lib/operationalApi";
import { errorMessage } from "./errorMessage";

/**
 * One identity's recorded details.
 *
 * `isLoading` is true only until the first answer. A reload (after a suspension, say) keeps the details
 * already on screen and replaces them when the new ones arrive, rather than blanking the whole dashboard
 * to a skeleton for a moment. A retry after a failure has nothing on screen, so it does show loading.
 */
export function useUserDetails(userId: string, onLoaded: (user: AdminUserSummary) => void) {
  const [details, setDetails] = useState<AdminUserDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloads, setReloads] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const hasDetails = useRef(false);
  const onLoadedRef = useRef(onLoaded);

  useEffect(() => {
    onLoadedRef.current = onLoaded;
  }, [onLoaded]);

  useEffect(() => {
    let active = true;
    setIsLoading(!hasDetails.current);
    setError(null);
    void operationalFetch<AdminUserDetails>(`/api/admin/users/${encodeURIComponent(userId)}`)
      .then((response) => {
        if (response.user?.id !== userId || !Array.isArray(response.sections) || !Array.isArray(response.coverage)) {
          throw new Error("Invalid user details response.");
        }
        if (active) {
          hasDetails.current = true;
          setDetails(response);
          onLoadedRef.current(response.user);
        }
      })
      .catch((failure: unknown) => {
        if (active) {
          hasDetails.current = false;
          setError(errorMessage(failure));
          setDetails(null);
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId, reloads]);

  const reload = useCallback(() => setReloads((count) => count + 1), []);
  const replaceUser = useCallback(
    (user: AdminUserSummary) => setDetails((current) => (current ? { ...current, user } : current)),
    [],
  );

  return { details, error, isLoading, reload, reloads, replaceUser };
}
