import React, { useState, useEffect, createContext, useContext, ReactNode, lazy, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";
import Breadcrumbs from "../navigation/Breadcrumbs";
import { type BreadcrumbItem } from "../navigation/breadcrumbsConfig";
import { useMandaliInbox } from "../../hooks/useMandaliInbox";
import { type BhalyamGameSlug } from "../bhalyam/data";
import { useTheme } from "../../lib/useTheme";
import { useAuthStore } from "../../store/authStore";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { useMediaQuery } from "../../lib/useMediaQuery";

const FallingPetals = lazy(() => import("../../animations/app/FallingPetals"));
const JoinRoomModal = lazy(() => import("../bhalyam/JoinRoomModal"));
const GameRoomSheet = lazy(() => import("../bhalyam/GameRoomSheet"));
const MenuSheet = lazy(() => import("../../pages/home/sheets/MenuSheet").then((m) => ({ default: m.MenuSheet })));
const ProfileSheet = lazy(() => import("../../pages/home/sheets/ProfileSheet").then((m) => ({ default: m.ProfileSheet })));
const WalletDrawer = lazy(() => import("../economy/WalletDrawer").then((m) => ({ default: m.WalletDrawer })));
const DailyStreakModal = lazy(() => import("../streak/DailyStreakModal").then((m) => ({ default: m.DailyStreakModal })));
const MemberOnboarding = lazy(() => import("../onboarding/MemberOnboarding"));
const SignInInvitation = lazy(() => import("../auth/SignInInvitation"));

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
  const { pathname, search, state: navState } = useLocation();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const [theme] = useTheme();
  const isDark = theme === "dark";
  // Two dialogs, one audience each. Mounting only the one that can be shown also keeps the other's
  // code (the first-run profile questions carry a calendar library) from being downloaded at all.
  const isMember = useAuthStore((s) => s.isMember);
  const memberId = useAuthStore((s) => s.userId);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const desktop = useMediaQuery("(min-width: 1024px)");
  const reducedMotion = useReducedMotion();
  const menuOpen = chrome && mobileMenuOpen && !desktop;
  const { containerRef: navigationRef } = useFocusTrap({
    open: menuOpen,
    onClose: () => setMobileMenuOpen(false),
  });
  const [joinOpen, setJoinOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [sheetGame, setSheetGame] = useState<BhalyamGameSlug | null>(null);
  // Set when the create sheet was opened from a Mandali's "Start a game": the room is posted there.
  const [sheetShareTo, setSheetShareTo] = useState<string | null>(null);

  // Arriving with `state.newRoom` (a finished table's "Create a new room") opens the create-room
  // sheet for that game, once, and clears the state so a refresh or Back does not reopen it.
  useEffect(() => {
    const handOff = navState as { newRoom?: string; shareToMandali?: string } | null;
    const slug = handOff?.newRoom;
    if (typeof slug !== "string" || slug === "") return;
    setSheetGame(slug as BhalyamGameSlug);
    setSheetShareTo(typeof handOff?.shareToMandali === "string" && handOff.shareToMandali !== "" ? handOff.shareToMandali : null);
    navigate(`${pathname}${search}`, { replace: true, state: null });
  }, [navState, navigate, pathname, search]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileInitialView, setProfileInitialView] = useState<"profile" | "notifications">("profile");
  // Real Mandali notifications, live — see useMandaliInbox. Guests get none.
  const { items: notifications, update: setNotifications } = useMandaliInbox();

  // Automatically close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname, search]);

  useEffect(() => {
    if (desktop) setMobileMenuOpen(false);
  }, [desktop]);

  // Lock body scroll when mobile menu is open to prevent touch events from being swallowed
  useEffect(() => {
    if (menuOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [menuOpen]);

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
            mobileMenuOpen={menuOpen}
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
            {menuOpen && (
              <>
                <motion.button
                  type="button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setMobileMenuOpen(false)}
                  tabIndex={-1}
                  aria-label="Close navigation menu"
                  className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] lg:hidden cursor-pointer touch-none"
                />
                <motion.div
                  ref={navigationRef}
                  id="mobile-navigation"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Main navigation"
                  initial={reducedMotion ? false : { x: -320 }}
                  animate={{ x: 0 }}
                  exit={reducedMotion ? { opacity: 0 } : { x: -320 }}
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
            {mounted && showFallingPetals && (
              <Suspense fallback={null}>
                <FallingPetals />
              </Suspense>
            )}
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

        {/* Browser-only overlays are not part of the static page. */}
        {mounted && (
          <Suspense fallback={null}>
            <JoinRoomModal open={joinOpen} onClose={() => setJoinOpen(false)} />
            <GameRoomSheet
              game={sheetGame}
              shareToMandaliId={sheetShareTo}
              onClose={() => {
                setSheetGame(null);
                setSheetShareTo(null);
              }}
            />
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
            <DailyStreakModal />
            {/* Not over a live board: `chrome` is off exactly when a match is on screen. */}
            {/* Privacy choice, then the profile questions, then the welcome: see MemberOnboarding. */}
            {chrome && isMember && <MemberOnboarding key={memberId ?? "member"} />}
            {chrome && !isMember && <SignInInvitation />}
          </Suspense>
        )}
      </div>
    </AppLayoutContext.Provider>
  );
}
