import React, { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import AppHeader from "./AppHeader";
import FallingPetals from "../../animations/app/FallingPetals";
import AppSidebar from "./AppSidebar";
import JoinRoomModal from "../bhalyam/JoinRoomModal";
import GameRoomSheet from "../bhalyam/GameRoomSheet";
import Breadcrumbs from "../navigation/Breadcrumbs";
import { type BreadcrumbItem } from "../navigation/breadcrumbsConfig";
import { ProfileSheet, type NotificationItem, INITIAL_NOTIFICATIONS } from "../../pages/home/sheets/ProfileSheet";
import { MenuSheet } from "../../pages/home/sheets/MenuSheet";
import { type BhalyamGameSlug } from "../bhalyam/data";
import { useTheme } from "../../lib/useTheme";
import { useAuthStore } from "../../store/authStore";
import { WalletDrawer } from "../economy/WalletDrawer";

interface AppLayoutContextType {
  openJoin: () => void;
  openGameSheet: (slug: BhalyamGameSlug) => void;
  openSettings: () => void;
  openProfile: () => void;
  openNotifications: () => void;
  openWallet: () => void;
}

const AppLayoutContext = createContext<AppLayoutContextType>({
  openJoin: () => {},
  openGameSheet: () => {},
  openSettings: () => {},
  openProfile: () => {},
  openNotifications: () => {},
  openWallet: () => {},
});

export const useAppLayout = () => useContext(AppLayoutContext);

interface AppLayoutProps {
  children: ReactNode;
  onSelectGame?: (slug: BhalyamGameSlug) => void;
  /**
   * Whether to draw the global header and side nav around `children`.
   *
   * Every screen in the app gets them except one: a live game. A board is
   * sized against the viewport it is given — Ludo's shell is built on
   * `100svh`, Rummy's felt fills what it is handed — so an 80px header and a
   * 256px rail are not decoration there, they are board area taken away, and
   * on a phone that is the difference between a playable board and a cramped
   * one. The room screen also carries its own in-board chrome (room code,
   * Leave, the inline room rail), so the global set is duplicate navigation
   * competing with it for the same taps.
   *
   * Off does NOT mean stranded: `false` is only ever passed by a screen that
   * has its own way out. The room's pre-game states (name entry, connecting)
   * deliberately keep the chrome, because someone who has not joined anything
   * yet needs an ordinary way back.
   */
  chrome?: boolean;
  sidebar?: boolean;
  /** Optional custom breadcrumbs override */
  breadcrumbs?: BreadcrumbItem[];
  /** Optional custom tail for the active route's crumb */
  customTail?: string;
  /** Whether to show the top breadcrumbs bar (defaults to true) */
  showBreadcrumbs?: boolean;
  /**
   * Ambient falling-petals background (see `FallingPetals`). Opt-in per
   * layout consumer rather than always-on here, so it only shows up on the
   * pages it was actually asked for instead of silently reaching every
   * screen that happens to render through `AppLayout`.
   */
  showFallingPetals?: boolean;
}

export default function AppLayout({
  children,
  onSelectGame,
  chrome = true,
  sidebar = true,
  breadcrumbs,
  customTail,
  showBreadcrumbs = true,
  showFallingPetals = false,
}: AppLayoutProps) {
  const { pathname, search } = useLocation();
  const [theme] = useTheme();
  const isDark = theme === "dark";

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [sheetGame, setSheetGame] = useState<BhalyamGameSlug | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileInitialView, setProfileInitialView] = useState<"profile" | "notifications">("profile");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Automatically close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname, search]);

  // Close on Escape key press
  useEffect(() => {
    if (!mobileMenuOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  // Lock body scroll when mobile menu is open to prevent touch events from being swallowed
  useEffect(() => {
    if (mobileMenuOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [mobileMenuOpen]);

  /**
   * `INITIAL_NOTIFICATIONS` is dummy design/dev-reference data (see its own
   * comment in BhalyamHome.tsx) — never a guest's real notifications, since
   * there is no backend that produces those yet. Guests always start empty;
   * only a signed-in member sees the sample set, and only once auth has
   * actually resolved (`ready`) so a guest mid-load never gets a one-frame
   * flash of it.
   *
   * The `else` matters as much as the `if`: this is plain component state,
   * not a store `signOut()` can reach, so without it a member's sample
   * notifications — and the header's unread badge — survived sign-out
   * untouched. This effect re-syncs on every isMember change, both ways.
   */
  const { isMember, ready } = useAuthStore();
  useEffect(() => {
    if (!ready) return;
    setNotifications(isMember ? INITIAL_NOTIFICATIONS : []);
  }, [ready, isMember]);

  /**
   * Drop the drawer when the chrome goes away.
   *
   * Without this the flag survives the transition into a game, and the drawer
   * would slide back over the board the moment the chrome returned — a menu
   * nobody opened, restored from a tap several screens ago.
   */
  useEffect(() => {
    if (!chrome) setMobileMenuOpen(false);
  }, [chrome]);

  const handleSelectGame = (slug: BhalyamGameSlug) => {
    if (onSelectGame) {
      onSelectGame(slug);
    } else {
      setSheetGame(slug);
    }
  };

  const contextValue: AppLayoutContextType = {
    openJoin: () => setJoinOpen(true),
    openGameSheet: (slug: BhalyamGameSlug) => setSheetGame(slug),
    openSettings: () => setSettingsOpen(true),
    openProfile: () => {
      setProfileInitialView("profile");
      setProfileOpen(true);
    },
    openNotifications: () => {
      setProfileInitialView("notifications");
      setProfileOpen(true);
    },
    openWallet: () => setWalletOpen(true),
  };

  return (
    <AppLayoutContext.Provider value={contextValue}>
      <div
        className={`h-screen min-h-[100dvh] w-full max-w-full overflow-hidden flex flex-col select-none transition-colors ${
          isDark
            ? "bg-[#070B14] text-white selection:bg-amber-500/30 selection:text-amber-200"
            : "bg-[#FAF3E0] text-[#3D2005] selection:bg-amber-300 selection:text-amber-900"
        }`}
      >
        {/* Fixed Top Header */}
        {chrome && (
          <AppHeader
            onOpenJoin={() => setJoinOpen(true)}
            onOpenProfile={() => {
              setProfileInitialView("profile");
              setProfileOpen(true);
            }}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenWallet={() => setWalletOpen(true)}
            onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
            onSelectGame={handleSelectGame}
            unreadCount={notifications.filter((n) => n.unread).length}
          />
        )}

        {/* Layout Body Container */}
        <div className="flex-1 flex overflow-hidden relative min-w-0 w-full max-w-full">
          {/* Desktop Left Sidebar (Permanently fixed, never scrolls with page) */}
          {chrome && sidebar && (
            <div className="hidden lg:block h-full flex-shrink-0">
              <AppSidebar
                onOpenJoin={() => setJoinOpen(true)}
                onOpenCreateRoom={() => setJoinOpen(true)}
                onOpenProfile={() => {
                  setProfileInitialView("profile");
                  setProfileOpen(true);
                }}
                onOpenSettings={() => setSettingsOpen(true)}
                onOpenNotifications={() => {
                  setProfileInitialView("notifications");
                  setProfileOpen(true);
                }}
                onOpenGameSheet={(slug) => handleSelectGame(slug as BhalyamGameSlug)}
              />
            </div>
          )}

          {/* Mobile Drawer Sidebar */}
          <AnimatePresence>
            {chrome && mobileMenuOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setMobileMenuOpen(false)}
                  onTouchStart={() => setMobileMenuOpen(false)}
                  role="button"
                  tabIndex={0}
                  aria-label="Close navigation menu"
                  className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] lg:hidden cursor-pointer touch-none"
                />
                <motion.div
                  initial={{ x: -320 }}
                  animate={{ x: 0 }}
                  exit={{ x: -320 }}
                  transition={{ type: "spring", damping: 26, stiffness: 260 }}
                  drag="x"
                  dragConstraints={{ left: -320, right: 0 }}
                  dragElastic={0.05}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -60 || info.velocity.x < -250) {
                      setMobileMenuOpen(false);
                    }
                  }}
                  className="fixed top-0 bottom-0 left-0 z-50 w-76 sm:w-80 max-w-[86vw] h-full shadow-2xl lg:hidden touch-pan-y"
                >
                  <AppSidebar
                    onOpenJoin={() => {
                      setMobileMenuOpen(false);
                      setJoinOpen(true);
                    }}
                    onOpenCreateRoom={() => {
                      setMobileMenuOpen(false);
                      setJoinOpen(true);
                    }}
                    onOpenProfile={() => {
                      setMobileMenuOpen(false);
                      setProfileInitialView("profile");
                      setProfileOpen(true);
                    }}
                    onOpenSettings={() => {
                      setMobileMenuOpen(false);
                      setSettingsOpen(true);
                    }}
                    onOpenNotifications={() => {
                      setMobileMenuOpen(false);
                      setProfileInitialView("notifications");
                      setProfileOpen(true);
                    }}
                    onOpenGameSheet={(slug) => {
                      setMobileMenuOpen(false);
                      handleSelectGame(slug as BhalyamGameSlug);
                    }}
                    onCloseMobile={() => setMobileMenuOpen(false)}
                  />
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Main Scrollable Viewport (ONLY this scrolls!) */}
          <main
            id="app-main-scroll"
            tabIndex={-1}
            className="flex-1 min-w-0 w-full max-w-full h-full overflow-y-auto overflow-x-hidden relative focus:outline-none flex flex-col touch-pan-y overscroll-y-contain"
          >
            {showFallingPetals && <FallingPetals />}
            <div className="relative z-10 flex-1 min-h-0 flex flex-col">
              {chrome && showBreadcrumbs && (
                <div className="flex-shrink-0 z-20 border-b border-[var(--chrome-hairline)] bg-[var(--chrome-panel)]">
                  <Breadcrumbs
                    crumbs={breadcrumbs}
                    customTail={customTail}
                  />
                </div>
              )}
              <div className="w-full min-w-0 flex-1 min-h-0 flex flex-col">
                {children}
              </div>
            </div>
          </main>
        </div>

        {/* Global Modals & Sheets */}
        <JoinRoomModal open={joinOpen} onClose={() => setJoinOpen(false)} />
        <GameRoomSheet game={sheetGame} onClose={() => setSheetGame(null)} />
        <MenuSheet
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onOpenJoin={() => {
            setSettingsOpen(false);
            setJoinOpen(true);
          }}
        />
        <ProfileSheet
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
          notifications={notifications}
          onUpdateNotifications={setNotifications}
          initialView={profileInitialView}
          onOpenJoin={() => {
            setProfileOpen(false);
            setJoinOpen(true);
          }}
        />
        <WalletDrawer
          isOpen={walletOpen}
          onClose={() => setWalletOpen(false)}
        />
      </div>
    </AppLayoutContext.Provider>
  );
}
