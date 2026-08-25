import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  checkOperationalAccess,
  storeOperationalKey,
  clearOperationalKey,
  DEV_DEFAULT_OPERATIONAL_KEY,
  type OperationalPrincipal,
} from "../../lib/operationalApi";
import BhalyamLogo from "../bhalyam/BhalyamLogo";
import { useAuthStore } from "../../store/authStore";

/**
 * The gate on `/admin`.
 *
 * ── What was wrong ────────────────────────────────────────────────────
 * `<Route path="/admin" element={<AdminDashboardPage />} />` — no wrapper at
 * all, while `/profile` two lines above had one. Anyone could open the page,
 * and the page's own `fetch()` calls succeeded because the server was
 * fail-open. Two holes that only looked like one.
 *
 * ── What "real authorization" means here, precisely ───────────────────
 * A React route guard is not a security boundary. The bundle is public, the
 * component is in it, and anyone can execute it. So this component does not
 * DECIDE anything — it asks the server and renders the answer:
 *
 *     GET /api/operational/whoami  →  200 + principal  →  render the console
 *                                 →  401               →  render the lock
 *
 * The boundary is server-side, on the same credential every data endpoint
 * behind this screen requires. That is what makes the gate honest: there is no
 * arrangement of client state that shows the console with the data endpoints
 * still refusing, and none that shows the lock while the data is readable.
 *
 * `ProtectedRoute` still wraps this in `App.tsx`, for the ordinary reason —
 * an anonymous visitor should meet the sign-in page, not a credential prompt.
 */

type GateState =
  | { phase: "checking" }
  | { phase: "allowed"; principal: OperationalPrincipal }
  | { phase: "denied" };

export default function AdminRoute({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [state, setState] = useState<GateState>({ phase: "checking" });
  const [keyInput, setKeyInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const check = useCallback(async () => {
    const principal = await checkOperationalAccess();
    if (principal) {
      useAuthStore
        .getState()
        .grantAdminAccess(principal.kind === "admin-user" ? principal : {});
      setState({ phase: "allowed", principal });
    } else {
      setState({ phase: "denied" });
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  const submitKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) return;
    setSubmitting(true);
    storeOperationalKey(keyInput);
    const principal = await checkOperationalAccess();
    if (principal) {
      useAuthStore
        .getState()
        .grantAdminAccess(principal.kind === "admin-user" ? principal : {});
      setKeyInput("");
      setState({ phase: "allowed", principal });
    } else {
      // A key that does not work is not kept. Leaving it in storage would send
      // a rejected credential on every subsequent request for the whole tab.
      clearOperationalKey();
      setState({ phase: "denied" });
    }
    setSubmitting(false);
  };

  if (state.phase === "checking") {
    return (
      <div
        className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center"
        role="status"
        aria-live="polite"
        aria-label="Checking operational authorization"
      >
        <div className="animate-pulse flex flex-col items-center gap-3">
          <BhalyamLogo size={56} decorative />
          <span className="text-sm font-bold text-zinc-400">Checking authorization…</span>
        </div>
      </div>
    );
  }

  if (state.phase === "denied") {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <div className="flex items-center gap-3 mb-4">
            <BhalyamLogo size={36} decorative />
            <h1 className="text-lg font-bold">Operations console</h1>
          </div>
          <p className="text-sm text-zinc-400 mb-5">
            This account is not authorized for operational data. Ask an administrator to add
            your account to the admin list, or enter the operational key.
          </p>
          <form onSubmit={submitKey} className="flex flex-col gap-3">
            <label htmlFor="ops-key" className="text-xs font-semibold text-zinc-500 uppercase">
              Operational key
            </label>
            <input
              id="ops-key"
              type="password"
              autoComplete="off"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2.5 text-sm font-mono text-zinc-100 focus:outline-none focus:border-amber-500"
              placeholder="OPERATIONAL_SECRET"
            />
            {import.meta.env.DEV && (
              <button
                type="button"
                onClick={async () => {
                  setKeyInput(DEV_DEFAULT_OPERATIONAL_KEY);
                  setSubmitting(true);
                  storeOperationalKey(DEV_DEFAULT_OPERATIONAL_KEY);
                  const principal = await checkOperationalAccess();
                  if (principal) {
                    useAuthStore
        .getState()
        .grantAdminAccess(principal.kind === "admin-user" ? principal : {});
                    setKeyInput("");
                    setState({ phase: "allowed", principal });
                  } else {
                    clearOperationalKey();
                    setState({ phase: "denied" });
                  }
                  setSubmitting(false);
                }}
                className="text-xs text-left text-amber-400 hover:text-amber-300 font-medium transition-colors cursor-pointer py-1"
              >
                ⚡ 1-Click Unlock with Dev Key ({DEV_DEFAULT_OPERATIONAL_KEY})
              </button>
            )}
            <button
              type="submit"
              disabled={submitting || !keyInput.trim()}
              className="w-full rounded-lg bg-amber-500 px-3 py-2.5 text-sm font-bold text-zinc-950 disabled:opacity-40 hover:bg-amber-400 transition-colors"
            >
              {submitting ? "Checking…" : "Unlock"}
            </button>
          </form>
          <Link to="/" className="mt-5 inline-block text-xs font-semibold text-zinc-500 hover:text-zinc-300">
            ← Back to BHALYAM
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
