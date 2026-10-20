import { useEffect, useRef, useState } from "react";
import { operationalPost } from "../../../lib/operationalApi";
import { useAuthStore } from "../../../store/authStore";
import Panel from "../../../components/admin/panel";
import { errorMessage } from "./errorMessage";

export type UserRole = "super_admin" | "admin" | "member";

const ALERT_VISIBLE_MS = 4000;

const ROLE_OPTIONS: readonly { role: UserRole; label: string }[] = [
  { role: "super_admin", label: "Super Admin" },
  { role: "admin", label: "Admin" },
  { role: "member", label: "Member" },
];

const ROLE_BUTTON =
  "min-h-[44px] whitespace-nowrap px-1 text-sm font-semibold transition-colors focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500";
const ROLE_CURRENT = "bg-amber-500 text-amber-950 cursor-default";
const ROLE_OTHER = "text-[var(--chrome-ink)] hover:bg-[var(--chrome-control)] disabled:opacity-50";

/** The console operator's own session must follow a change made to their own account. */
function syncOperatorSession(target: { id: string; email: string }, newRole: UserRole): void {
  const auth = useAuthStore.getState();
  const isOperator = auth.userId === target.id || (auth.email && auth.email.toLowerCase() === target.email.toLowerCase());
  if (!isOperator) return;
  if (newRole === "super_admin") auth.signInSuperAdmin();
  else if (newRole === "admin") auth.grantAdminAccess({ userId: target.id, email: target.email });
  else auth.setSuperAdmin(false);
}

interface UserRoleElevationProps {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  onRoleChanged: (role: UserRole) => void;
}

/**
 * Grant or revoke console roles. Super Admins only; it renders nothing for anyone else.
 * The change is a real call to `/api/admin/users/role`, not a local preview.
 */
export default function UserRoleElevation({ userId, name, email, role, onRoleChanged }: UserRoleElevationProps) {
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin);
  const [isUpdating, setIsUpdating] = useState(false);
  const [reason, setReason] = useState("");
  const [alert, setAlert] = useState<string | null>(null);
  const isMounted = useRef(true);
  const alertTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      clearTimeout(alertTimer.current);
    };
  }, []);

  if (!isSuperAdmin) return null;

  const showAlert = (text: string) => {
    setAlert(text);
    clearTimeout(alertTimer.current);
    alertTimer.current = setTimeout(() => setAlert(null), ALERT_VISIBLE_MS);
  };

  const update = async (newRole: UserRole) => {
    if (role === newRole || isUpdating) return;
    setIsUpdating(true);
    try {
      await operationalPost<{ success: boolean; role: string }>("/api/admin/users/role", {
        userId,
        role: newRole,
        reason: reason.trim() || `Role updated to ${newRole} from Admin Console UI`,
      });
      // The server has changed the role whether or not this page is still open, so the operator's own
      // session is updated either way; what is shown is only updated while it is still on screen.
      syncOperatorSession({ id: userId, email }, newRole);
      if (!isMounted.current) return;
      onRoleChanged(newRole);
      setReason("");
      showAlert(`Successfully updated ${name}'s role to ${newRole === "super_admin" ? "SUPER ADMIN" : newRole.toUpperCase()}.`);
    } catch (err) {
      if (isMounted.current) showAlert(`Role update failed: ${errorMessage(err)}`);
    } finally {
      if (isMounted.current) setIsUpdating(false);
    }
  };

  return (
    <Panel title="Console role" description="Takes effect immediately.">
      <div className="space-y-4">
        <div
          role="group"
          aria-label="Console role"
          className="grid grid-cols-3 divide-x divide-[var(--chrome-border)] overflow-hidden rounded-xl border border-[var(--chrome-border)]"
        >
          {ROLE_OPTIONS.map(({ role: option, label }) => (
            <button
              key={option}
              type="button"
              aria-pressed={role === option}
              onClick={() => void update(option)}
              disabled={role === option || isUpdating}
              className={`${ROLE_BUTTON} ${role === option ? ROLE_CURRENT : ROLE_OTHER}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div>
          <label htmlFor="role-change-reason" className="mb-1 block text-xs text-[var(--chrome-ink-soft)]">
            Audit note (optional)
          </label>
          <input
            id="role-change-reason"
            type="text"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. Approved operator elevation"
            className="min-h-[44px] w-full rounded-lg border border-[var(--chrome-border)] bg-[var(--chrome-control)] px-3 text-sm text-[var(--chrome-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          />
        </div>
        {alert && (
          <p role="status" className="text-sm font-medium text-[var(--chrome-ink)]">
            {alert}
          </p>
        )}
      </div>
    </Panel>
  );
}
