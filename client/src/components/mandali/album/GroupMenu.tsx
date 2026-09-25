import type { ReactNode } from "react";
import { Bell, BellOff, ChevronRight, Coins, Info, Link2, LogOut, ShieldCheck, UserCheck, type LucideIcon } from "lucide-react";
import type { NotificationLevel } from "@shared/mandali/notifications.js";
import { useTranslation } from "../../../hooks/useTranslation";

export interface GroupMenuProps {
  notificationLevel: NotificationLevel;
  canManageMembers: boolean;
  pendingRequestCount: number;
  onInvite: () => void;
  onCoins?: () => void;
  onInfo: () => void;
  /** Omit and the notifications row is not shown. */
  onNotifications?: () => void;
  onManage: () => void;
  onRequests: () => void;
  onLeave: () => void;
  /** Called first on every choice, so a sheet showing this menu can close itself. */
  onChoose?: () => void;
  /**
   * "list" is the full menu (labels and a line saying what each does). "icons" is the
   * folded desktop rail: the same actions as 44px buttons, each named by its tooltip
   * and screen-reader label.
   */
  variant?: "list" | "icons";
}

interface Row {
  key: string;
  icon: LucideIcon;
  label: string;
  hint?: ReactNode;
  badge?: number;
  onSelect: () => void;
  tone?: "danger";
  ariaLabel?: string;
}

/**
 * Everything you can do with the group, as one plain list.
 *
 * Six small icon tiles used to sit in a grid of 9-pixel captions; here each is
 * a full-width row with a real label and a line saying what it does, which is
 * what the least technical person in the group needs. The same list is the
 * mobile menu sheet and the desktop side rail.
 */
export function GroupMenu({
  notificationLevel,
  canManageMembers,
  pendingRequestCount,
  onInvite,
  onCoins,
  onInfo,
  onNotifications,
  onManage,
  onRequests,
  onLeave,
  onChoose,
  variant = "list",
}: GroupMenuProps) {
  const { t } = useTranslation();
  const choose = (action: () => void) => () => {
    onChoose?.();
    action();
  };

  const notificationLabel =
    notificationLevel === "MUTED"
      ? t("mandali.menu.notifications.muted")
      : notificationLevel === "INVITES_ONLY"
        ? t("mandali.menu.notifications.invitesOnly")
        : t("mandali.menu.notifications.all");

  const rows: Row[] = [
    { key: "invite", icon: Link2, label: t("mandali.menu.invite"), hint: t("mandali.menu.invite.hint"), onSelect: choose(onInvite) },
    ...(onCoins ? [{ key: "coins", icon: Coins, label: t("mandali.menu.coins"), hint: t("mandali.menu.coins.hint"), onSelect: choose(onCoins) }] : []),
    { key: "info", icon: Info, label: t("mandali.menu.info"), hint: t("mandali.menu.info.hint"), onSelect: choose(onInfo) },
    ...(onNotifications
      ? [{
          key: "notifications",
          icon: notificationLevel === "MUTED" ? BellOff : Bell,
          label: t("mandali.menu.notifications"),
          hint: notificationLabel,
          onSelect: choose(onNotifications),
        }]
      : []),
    ...(canManageMembers
      ? [
          { key: "manage", icon: ShieldCheck, label: t("mandali.menu.manage"), hint: t("mandali.menu.manage.hint"), onSelect: choose(onManage) },
          {
            key: "requests",
            icon: UserCheck,
            label: t("mandali.menu.requests"),
            hint: t("mandali.menu.requests.hint"),
            badge: pendingRequestCount,
            onSelect: choose(onRequests),
          },
        ]
      : []),
    { key: "leave", icon: LogOut, label: t("mandali.menu.leave"), hint: t("mandali.menu.leave.hint"), tone: "danger", onSelect: choose(onLeave) },
  ];

  if (variant === "icons") {
    return (
      <ul className="m-0 flex list-none flex-col items-center gap-1 p-0">
        {rows.map((row) => {
          const Icon = row.icon;
          const danger = row.tone === "danger";
          return (
            <li key={row.key} className={danger ? "mt-2 border-t border-album-line pt-2" : undefined}>
              <button
                type="button"
                onClick={row.onSelect}
                title={row.label}
                aria-label={row.badge ? `${row.label} (${row.badge})` : row.label}
                className={`album-focus relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl transition-colors ${
                  danger ? "text-album-danger hover:bg-album-danger/10" : "text-album-foil hover:bg-album-field"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {row.badge ? (
                  <span
                    aria-hidden="true"
                    className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-album-foilfill px-1 text-sm font-bold leading-none text-album-onfoil"
                  >
                    {row.badge}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul className="m-0 list-none space-y-1 p-0">
      {rows.map((row) => {
        const Icon = row.icon;
        const danger = row.tone === "danger";
        return (
          <li key={row.key} className={danger ? "mt-3 border-t border-album-line pt-3" : undefined}>
            <button
              type="button"
              onClick={row.onSelect}
              className="album-focus flex min-h-[60px] w-full cursor-pointer items-center gap-3.5 rounded-2xl px-3 py-2 text-left transition-colors hover:bg-album-field"
            >
              <span
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
                  danger ? "bg-album-danger/10 text-album-danger" : "bg-album-field text-album-foil"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-base font-semibold leading-tight ${danger ? "text-album-danger" : "text-album-ink"}`}>
                  {row.label}
                </span>
                {row.hint && <span className="mt-0.5 block text-sm leading-snug text-album-ink3">{row.hint}</span>}
              </span>
              {row.badge ? (
                <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-album-foilfill px-2 text-sm font-bold text-album-onfoil">
                  {row.badge}
                </span>
              ) : (
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-album-ink3" aria-hidden="true" />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
