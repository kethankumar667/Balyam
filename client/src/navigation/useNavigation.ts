import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { resolveNavigation } from "./routeResolver";
import type { NavItemAction, ResolvedNavigationSection } from "./types";

export interface NavigationActions {
  openJoin?: () => void;
  openCreateRoom?: () => void;
  openProfile?: () => void;
  openSettings?: () => void;
  openNotifications?: () => void;
  openGameSheet?: (slug: string) => void;
}

export function useNavigation(actions?: NavigationActions): {
  section: ResolvedNavigationSection;
  handleAction: (action?: NavItemAction, param?: string) => void;
} {
  const location = useLocation();
  const isMember = useAuthStore((s) => s.isMember);
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin);
  const capabilities = useAuthStore((s) => s.capabilities);

  const section = useMemo(() => {
    return resolveNavigation({
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      isMember,
      isSuperAdmin,
      unlockAllFeatures: capabilities.unlockAllFeatures,
      accessAdminPanel: capabilities.accessAdminPanel,
    });
  }, [location.pathname, location.search, location.hash, isMember, isSuperAdmin, capabilities]);

  const handleAction = (action?: NavItemAction, param?: string) => {
    if (!action || !actions) return;

    switch (action) {
      case "openJoin":
        actions.openJoin?.();
        break;
      case "openCreateRoom":
        actions.openCreateRoom ? actions.openCreateRoom() : actions.openJoin?.();
        break;
      case "openProfile":
        actions.openProfile?.();
        break;
      case "openSettings":
        actions.openSettings?.();
        break;
      case "openNotifications":
        actions.openNotifications?.();
        break;
      case "openGameSheet":
        if (param) actions.openGameSheet?.(param);
        break;
      default:
        break;
    }
  };

  return {
    section,
    handleAction,
  };
}
