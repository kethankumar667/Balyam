import React, { useState, createContext, useContext, ReactNode } from "react";
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
}

export default function AppLayout({ children, onSelectGame }: AppLayoutProps) {
  const [theme] = useTheme();
  const isDark = theme === "dark";

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [sheetGame, setSheetGame] = useState<BhalyamGameSlug | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

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
        className={`h-screen w-screen overflow-hidden flex flex-col select-none transition-colors ${
          isDark
            ? "bg-[#070B14] text-white selection:bg-amber-500/30 selection:text-amber-200"
            : "bg-[#FAF3E0] text-[#3D2005] selection:bg-amber-300 selection:text-amber-900"
        }`}
      >
        {/* Fixed Top Header */}
        <AppHeader
          onOpenJoin={() => setJoinOpen(true)}
          onOpenProfile={() => setProfileOpen(true)}
          onOpenNotifications={() => setNotificationsOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
          onSelectGame={handleSelectGame}
        />

        {/* Layout Body Container */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Desktop Left Sidebar (Permanently fixed, never scrolls with page) */}
          <div className="hidden lg:block h-full flex-shrink-0">
            <AppSidebar
              onOpenJoin={() => setJoinOpen(true)}
              onOpenProfile={() => setProfileOpen(true)}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          </div>

          {/* Mobile Drawer Sidebar */}
          <AnimatePresence>
            {mobileMenuOpen && (
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
                  className="fixed top-0 bottom-0 left-0 z-50 w-72 h-full shadow-2xl lg:hidden"
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
