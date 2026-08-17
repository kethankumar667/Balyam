import React, { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";
import JoinRoomModal from "../bhalyam/JoinRoomModal";
import GameRoomSheet from "../bhalyam/GameRoomSheet";
import {
  ProfileSheet,
  NotificationsSheet,
  MenuSheet,
  type NotificationItem,
  INITIAL_NOTIFICATIONS,
} from "../../pages/BhalyamHome";
import { type BhalyamGameSlug } from "../bhalyam/data";
import { useTheme } from "../../lib/useTheme";

interface AppLayoutContextType {
  openJoin: () => void;
  openGameSheet: (slug: BhalyamGameSlug) => void;
  openSettings: () => void;
  openProfile: () => void;
  openNotifications: () => void;
}

const AppLayoutContext = createContext<AppLayoutContextType>({
  openJoin: () => {},
  openGameSheet: () => {},
  openSettings: () => {},
  openProfile: () => {},
  openNotifications: () => {},
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
}

export default function AppLayout({ children, onSelectGame, chrome = true }: AppLayoutProps) {
  const [theme] = useTheme();
  const isDark = theme === "dark";

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [sheetGame, setSheetGame] = useState<BhalyamGameSlug | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

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
    openProfile: () => setProfileOpen(true),
    openNotifications: () => setNotificationsOpen(true),
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
            onOpenProfile={() => setProfileOpen(true)}
            onOpenNotifications={() => setNotificationsOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
            onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
            onSelectGame={handleSelectGame}
          />
        )}

        {/* Layout Body Container */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Desktop Left Sidebar (Permanently fixed, never scrolls with page) */}
          {chrome && (
            <div className="hidden lg:block h-full flex-shrink-0">
              <AppSidebar
                onOpenJoin={() => setJoinOpen(true)}
                onOpenProfile={() => setProfileOpen(true)}
                onOpenSettings={() => setSettingsOpen(true)}
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
                  className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
                />
                <motion.div
                  initial={{ x: -280 }}
                  animate={{ x: 0 }}
                  exit={{ x: -280 }}
                  transition={{ type: "spring", damping: 25, stiffness: 250 }}
                  className="fixed top-0 bottom-0 left-0 z-50 w-72 max-w-[85vw] h-full shadow-2xl lg:hidden"
                >
                  <AppSidebar
                    onOpenJoin={() => {
                      setMobileMenuOpen(false);
                      setJoinOpen(true);
                    }}
                    onOpenProfile={() => {
                      setMobileMenuOpen(false);
                      setProfileOpen(true);
                    }}
                    onOpenSettings={() => {
                      setMobileMenuOpen(false);
                      setSettingsOpen(true);
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
            className="flex-1 h-full overflow-y-auto overflow-x-hidden relative focus:outline-none"
          >
            {children}
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
        <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />
        <NotificationsSheet
          open={notificationsOpen}
          notifications={notifications}
          onUpdateNotifications={setNotifications}
          onClose={() => setNotificationsOpen(false)}
          onOpenJoin={() => {
            setNotificationsOpen(false);
            setJoinOpen(true);
          }}
        />
      </div>
    </AppLayoutContext.Provider>
  );
}
