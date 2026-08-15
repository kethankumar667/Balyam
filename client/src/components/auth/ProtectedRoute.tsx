import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import BhalyamLogo from "../bhalyam/BhalyamLogo";

interface ProtectedRouteProps {
  children?: React.ReactNode;
  requireMember?: boolean;
}

/**
 * Route protection middleware component.
 *
 * ── Authorization vs Authentication ───────────────────────────────────
 * - Authentication: Is there an active, verified session (isMember = true)?
 * - Ready check: Waits for optimistic storage / token resolution before making
 *   a routing decision to prevent flickering redirect walls.
 * - Redirect preservation: Preserves destination URL in `?redirectTo=...` for
 *   seamless post-login restoration.
 */
export default function ProtectedRoute({
  children,
  requireMember = true,
}: ProtectedRouteProps): React.JSX.Element {
  const { isMember, ready } = useAuthStore();
  const location = useLocation();

  if (!ready) {
    return (
      <div
        className="min-h-screen bhalyam-paper flex flex-col items-center justify-center p-6 text-center"
        role="status"
        aria-live="polite"
        aria-label="Verifying authentication session"
      >
        <div className="animate-pulse flex flex-col items-center gap-3">
          <BhalyamLogo size={56} decorative />
          <div className="flex items-center gap-2 text-sm font-bold text-[#8A6D4B] dark:text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span>Checking session…</span>
          </div>
        </div>
      </div>
    );
  }

  if (requireMember && !isMember) {
    const redirectTarget = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirectTo=${redirectTarget}`} replace />;
  }

  return <>{children}</>;
}
