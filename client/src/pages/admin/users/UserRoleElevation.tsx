import { useEffect, useRef, useState, type ComponentType } from "react";
import { Crown, Shield, UserCheck } from "lucide-react";
import { operationalPost } from "../../../lib/operationalApi";
import { useAuthStore } from "../../../store/authStore";
import { errorMessage } from "./errorMessage";

export type UserRole = "super_admin" | "admin" | "member";

const ALERT_VISIBLE_MS = 4000;

const ROLE_OPTIONS: readonly {
  role: UserRole;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  current: string;
  other: string;
}[] = [
  {
    role: "super_admin",
    label: "Super Admin",
    Icon: Crown,
    current: "bg-amber-500 text-amber-950 opacity-60 cursor-not-allowed shadow-inner",
    other: "bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 border border-amber-500/40 active:scale-95",
  },
  {
    role: "admin",
    label: "Admin",
    Icon: Shield,
    current: "bg-emerald-500 text-emerald-950 opacity-60 cursor-not-allowed shadow-inner",
    other: "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 active:scale-95",
  },
  {
    role: "member",
    label: "Member",
    Icon: UserCheck,
    current: "bg-[var(--chrome-control)] text-[var(--chrome-ink)] opacity-60 cursor-not-allowed shadow-inner",
    other: "bg-[var(--chrome-control)] hover:bg-[var(--chrome-control-hi)] text-[var(--chrome-ink)] border border-[var(--chrome-border)] active:scale-95",
  },
];

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
      showAlert(`✓ Successfully updated ${name}'s role to ${newRole === "super_admin" ? "SUPER ADMIN" : newRole.toUpperCase()}!`);
    } catch (err) {
      if (isMounted.current) showAlert(`Role update failed: ${errorMessage(err)}`);
    } finally {
      if (isMounted.current) setIsUpdating(false);
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent border-2 border-amber-500/40 space-y-3.5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
          <Crown className="w-4 h-4 text-amber-500" />
          <span>Super Admin Role Elevation</span>
        </h4>
        <span className="text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full bg-amber-500/25 text-amber-900 dark:text-amber-200 font-extrabold border border-amber-500/30">
          Current: {role.toUpperCase()}
        </span>
      </div>
      <p className="text-xs text-[var(--chrome-ink-soft)] leading-relaxed">
        Super Admins can grant or revoke administrative roles directly from this console. Permissions and console access take effect immediately.
      </p>

      <div className="grid grid-cols-3 gap-2 pt-1">
        {ROLE_OPTIONS.map(({ role: option, label, Icon, current, other }) => (
          <button
            key={option}
            type="button"
            onClick={() => void update(option)}
            disabled={role === option || isUpdating}
            className={`min-h-[44px] px-2 py-2 rounded-xl text-xs font-extrabold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${role === option ? current : other}`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="pt-1">
        <label htmlFor="role-change-reason" className="block text-[11px] font-bold text-[var(--chrome-ink-soft)] mb-1">
          Elevation Reason / Audit Note (Optional)
        </label>
        <input
          id="role-change-reason"
          type="text"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="e.g. Approved operator elevation via console"
          className="w-full h-9 px-3 text-xs rounded-xl bg-[var(--chrome-control)] border border-[var(--chrome-border)] text-[var(--chrome-ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        />
      </div>

      {alert && (
        <p role="status" className="text-xs font-bold text-amber-700 dark:text-amber-300">
          {alert}
        </p>
      )}
    </div>
  );
}
