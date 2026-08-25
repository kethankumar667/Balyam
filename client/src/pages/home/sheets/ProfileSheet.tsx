import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  BellRing,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  Check,
  Mail,
  Trophy,
  Users as UsersLucideIcon,
  Sparkles,
  Pencil,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { findAvatar } from "../../../lib/avatars";
import SeatAvatar from "../../../components/profile/SeatAvatar";
import { useRoomStore } from "../../../store/roomStore";
import { useAuthStore } from "../../../store/authStore";
import { useTheme } from "../../../lib/useTheme";
import { bhalyamSpring } from "../../../lib/motion";
import { type BhalyamGameSlug } from "../../../components/bhalyam/data";
import { SheetShell } from "./SheetShell";
import { GuestProfileModal } from "./GuestProfileModal";

export interface NotificationItem {
  id: string;
  type: "invite" | "reward" | "gang" | "trophy";
  title: string;
  desc: string;
  time: string;
  unread: boolean;
  gameSlug?: BhalyamGameSlug;
  roomCode?: string;
}

/**
 * Sample notifications, one of each `NotificationItem["type"]`, seeded at
 * explicit request for design/dev reference while the profile-sheet
 * notifications view is being built out — there is still no backend that
 * produces real ones. This reverses an earlier deliberate decision to ship
 * this list empty (a fabricated invite/reward/friend-score used to render
 * here for every player, "real news" that was never real); that concern
 * still applies the moment this ships to actual users, so swap this back to
 * an empty array — or a real feed — before release. `ProfileSheet`'s
 * notifications view already renders an honest empty state
 * ("You're all caught up!") for that case.
 */
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "sample-invite-1",
    type: "invite",
    title: "Priya invited you to a Rummy table",
    desc: "Room ANNA42 · 3 of 4 seats filled",
    time: "2m ago",
    unread: true,
    gameSlug: "rummy",
    roomCode: "ANNA42",
  },
  {
    id: "sample-reward-1",
    type: "reward",
    title: "Daily streak bonus unlocked",
    desc: "3-day streak — claim your bonus XP",
    time: "1h ago",
    unread: true,
  },
  {
    id: "sample-gang-1",
    type: "gang",
    title: "Arjun joined your gang",
    desc: "Your friend circle now has 5 members",
    time: "5h ago",
    unread: false,
  },
  {
    id: "sample-trophy-1",
    type: "trophy",
    title: "New personal best in Hand Cricket",
    desc: "You scored 86 runs against the bot",
    time: "Yesterday",
    unread: false,
    gameSlug: "handcricket",
  },
];

/**
 * Profile sheet — the one right-side panel for everything about "you":
 * the profile card itself, and (migrated in from the old standalone
 * bell-triggered sheet) notifications. `view` toggles between the two
 * bodies inside the same SheetShell so it reads as one panel with a
 * drill-in, not two different dialogs. `initialView` lets a caller (the
 * header bell) open straight into the notifications pane while the
 * profile avatar chip opens to the profile card as before.
 */
export function ProfileSheet({
  open,
  onClose,
  notifications,
  onUpdateNotifications,
  onOpenJoin,
  initialView = "profile",
}: {
  open: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onUpdateNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  onOpenJoin: () => void;
  initialView?: "profile" | "notifications";
}) {
  const { playerName, avatarId } = useRoomStore();
  const avatar = findAvatar(avatarId);
  const named = playerName.trim().length > 0;
  const signedIn = useAuthStore((s) => s.isMember);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin);
  const [theme] = useTheme();
  const isDark = theme === "dark";

  const [showEditModal, setShowEditModal] = useState(false);
  const [view, setView] = useState<"profile" | "notifications">(initialView);

  // Land on whichever view opened the sheet, every time it opens — the
  // bell wants straight to notifications, the avatar chip wants the
  // profile card. Both are the same panel now, just a different page of it.
  useEffect(() => {
    if (open) setView(initialView);
  }, [open, initialView]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  // Defense in depth: the bell icon that sets initialView="notifications"
  // lives in the sidebar/header nav, which doesn't itself know whether the
  // viewer is signed in. A guest landing here (view === "notifications")
  // falls through to the profile card below instead of the notifications
  // feed — same guard as the drill-in row's visibility just above.
  if (view === "notifications" && signedIn) {
    return (
      <SheetShell
        open={open}
        onClose={onClose}
        ariaLabel="Notifications"
        titleLeft={
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setView("profile")}
              aria-label="Back to profile"
              title="Back to profile"
              className="w-8 h-8 -ml-1.5 rounded-full inline-flex items-center justify-center cursor-pointer
                         text-[var(--auth-ink)] hover:bg-black/5 dark:hover:bg-white/10 transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <Bell className="w-5 h-5 text-amber-500" />
            <span className="bhalyam-display text-[20px] text-[var(--auth-ink)] tracking-tight">
              Notifications
            </span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-red-500 text-white shadow-xs">
                {unreadCount} New
              </span>
            )}
          </div>
        }
      >
        <NotificationsPanelBody
          notifications={notifications}
          onUpdateNotifications={onUpdateNotifications}
          onClose={onClose}
          onOpenJoin={onOpenJoin}
          isDark={isDark}
        />
      </SheetShell>
    );
  }

  return (
    <>
      <SheetShell
        open={open}
        onClose={onClose}
        ariaLabel="Your profile"
        titleLeft={
          <>
            <UserIcon className="w-5 h-5 text-[var(--auth-ink)]" />
            <span className="bhalyam-display text-[20px] text-[var(--auth-ink)] tracking-tight">
              Profile
            </span>
          </>
        }
      >
        {/* Single unified interactive profile card */}
        <button
          type="button"
          onClick={() => setShowEditModal(true)}
          className="w-full group relative rounded-2xl p-5 border-2 border-[#E0AE3B] bg-gradient-to-br from-[#FFF7E2] to-[#FBE7BD]
                     shadow-[0_4px_14px_-6px_rgba(228,177,40,0.55)] text-center cursor-pointer hover:border-[#D49E24]
                     hover:shadow-[0_8px_20px_-6px_rgba(228,177,40,0.7)] active:scale-[0.99] transition-all duration-200"
        >
          {/* Avatar with edit pencil badge */}
          <div className="relative mx-auto w-20 h-20 mb-3">
            <div
              className="w-20 h-20 rounded-full overflow-hidden
                         ring-4 ring-[#FBE7BD] border-2 border-[#D49E24]
                         shadow-[0_6px_20px_rgba(212,158,36,0.45),inset_0_2px_4px_rgba(0,0,0,0.15)]
                         flex items-center justify-center text-bhalyam-wood-dark bg-[#FFF8E7]
                         group-hover:scale-105 transition-transform duration-150"
            >
              <SeatAvatar
                avatar={avatarId ?? undefined}
                name={playerName.trim() || (signedIn ? "Member" : "Guest")}
                className="w-full h-full"
                textClassName="text-2xl font-black"
              />
            </div>
            <span
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full inline-flex items-center
                         justify-center bg-[#FFFDF8] text-[#5C3717]
                         ring-2 ring-[#FFF7E2] border-2 border-[#D49E24]
                         shadow-[0_3px_8px_rgba(92,55,23,0.35)]
                         group-hover:bg-[#FFF4DE] group-hover:scale-105 transition-all duration-150"
            >
              <Pencil className="w-4 h-4 text-[#5C3717]" />
            </span>
          </div>

          {/* Name Display */}
          <div className="flex items-center justify-center gap-1.5">
            <span className="bhalyam-display text-[var(--auth-ink)] text-[22px] leading-tight break-words group-hover:text-[#8C531B] transition-colors">
              {named ? playerName : "Add your name"}
            </span>
          </div>

          <p className="mt-1 text-[13px] font-semibold text-[var(--auth-accent)]">
            {signedIn ? "Signed in" : "Playing as a guest"}
          </p>

          <p className="bhalyam-script text-[var(--auth-accent)] text-[17px] leading-[1.15] mt-2.5">
            Tap to customize your name &amp; avatar
          </p>
        </button>

        {/* Edit Profile Modal (matches JoinRoomModal design) */}
        <GuestProfileModal
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
        />

        {/* Notifications — migrated in from the old standalone bell sheet.
            Lives as a drill-in row here instead of its own dialog; the
            badge is the same "number/dot" unread signal the header bell
            used to carry alone. Member-only: a guest has no invites, no
            gang, no XP streaks — the mock feed's unread badge showing over
            "Add your name" advertised activity a guest account cannot have. */}
        {signedIn && (
          <motion.button
            type="button"
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
            transition={bhalyamSpring}
            onClick={() => setView("notifications")}
            className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-left cursor-pointer
                       bg-white border border-[#E8D8BE] hover:bg-[#FFF8EE]
                       focus:outline-none focus:ring-2 focus:ring-bhalyam-gold-dark/60"
          >
            <span className="relative w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-[#FFF8EE] text-[#2A221B] border border-[#E8D8BE]">
              {unreadCount > 0 ? (
                <motion.span
                  initial={{ rotate: 0 }}
                  animate={{ rotate: [0, -12, 10, -6, 0] }}
                  transition={{ duration: 0.6, ease: "easeInOut", delay: 0.15 }}
                >
                  <BellRing className="w-5 h-5 text-amber-500" />
                </motion.span>
              ) : (
                <Bell className="w-5 h-5 text-[#7B5024]" />
              )}
              <AnimatePresence>
                {unreadCount > 0 && (
                  <motion.span
                    key="profile-notif-badge"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={bhalyamSpring}
                    className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center shadow-xs ring-2 ring-white"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-extrabold text-[15px] leading-tight text-[#2A221B]">
                Notifications
              </span>
              <span className="block text-[11px] mt-0.5 font-semibold text-[#7B5024]">
                {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
              </span>
            </span>
            <ChevronRight className="w-4 h-4 text-[#7B5024] flex-shrink-0" />
          </motion.button>
        )}

      {signedIn ? (
        <div className="space-y-3">
          <div className="rounded-2xl p-4 border border-[#E8D8BE] bg-white space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-[0.22em] font-extrabold text-[#7B5024]">
                Your Membership
              </div>
              {isSuperAdmin ? (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-400 text-amber-900 text-[11px] font-black inline-flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Super Admin
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-[11px] font-black">
                  Active Member
                </span>
              )}
            </div>
            <Link
              to="/profile"
              onClick={onClose}
              className="w-full h-11 rounded-full bg-[#FCF8EF] border border-[#EEDCC2] text-[#7B5024]
                         font-extrabold text-sm inline-flex items-center justify-center gap-2
                         hover:bg-[#F8EEDB] active:scale-[0.99]
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70
                         transition-[background-color,transform] duration-200"
            >
              <UserIcon className="w-4 h-4" />
              Account &amp; settings
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                onClick={onClose}
                className="w-full h-11 rounded-full bg-zinc-900 border border-zinc-800 text-amber-400
                           font-extrabold text-sm inline-flex items-center justify-center gap-2
                           hover:bg-zinc-800 active:scale-[0.99]
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70
                           transition-[background-color,transform] duration-200"
              >
                <ShieldCheck className="w-4 h-4" />
                Admin Console
              </Link>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              useAuthStore.getState().signOut();
            }}
            className="w-full h-11 rounded-full bg-red-50 hover:bg-red-100 border border-red-200 text-red-700
                       font-extrabold text-sm inline-flex items-center justify-center gap-2
                       active:scale-[0.99] transition cursor-pointer shadow-xs"
          >
            <LogOut className="w-4 h-4 text-red-600" />
            <span>Sign out / Log out</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <Link
            to="/signup?from=profile"
            onClick={onClose}
            className="w-full h-12 rounded-full bhalyam-gold-leaf bhalyam-cta-shine
                       border border-bhalyam-gold-dark text-bhalyam-wood-dark
                       font-extrabold text-[14px] inline-flex items-center justify-center gap-2
                       hover:brightness-[1.04] shadow-[0_8px_18px_-6px_rgba(228,177,40,0.6)]
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70
                       transition-[filter,box-shadow] duration-200"
          >
            <UserIcon className="w-4 h-4" />
            Create a free account
          </Link>
          <Link
            to="/login"
            onClick={onClose}
            className="w-full h-12 rounded-full bg-[#FCF8EF] border border-[#EEDCC2] text-[#7B5024]
                       font-extrabold text-[14px] inline-flex items-center justify-center gap-2
                       hover:bg-[#F8EEDB] active:scale-[0.99]
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-bhalyam-gold-dark/70
                       transition-[background-color,transform] duration-200"
          >
            Sign in
          </Link>
          <p className="text-center text-xs leading-relaxed text-[var(--auth-ink-soft)]">
            Guests play every game against bots and join any room they&apos;re invited to.
            An account is for opening your own.
          </p>
        </div>
      )}
    </SheetShell>
    </>
  );
}

/**
 * Notifications body — the filter tabs + list that used to be the whole
 * `NotificationsSheet` dialog. Now rendered inline inside `ProfileSheet`'s
 * "notifications" view, so it owns no SheetShell/title of its own; the
 * parent sheet supplies chrome, back button, and the unread-count title
 * badge.
 */
function NotificationsPanelBody({
  notifications,
  onUpdateNotifications,
  onClose,
  onOpenJoin,
  isDark,
}: {
  notifications: NotificationItem[];
  onUpdateNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  onClose: () => void;
  onOpenJoin: () => void;
  isDark: boolean;
}) {
  const [filterTab, setFilterTab] = useState<"all" | "invites" | "rewards">("all");
  const navigate = useNavigate();

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllRead = () => {
    onUpdateNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const filteredNotifs = notifications.filter((n) => {
    if (filterTab === "invites") return n.type === "invite" || n.type === "gang";
    if (filterTab === "rewards") return n.type === "reward" || n.type === "trophy";
    return true;
  });

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {(["all", "invites", "rewards"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilterTab(tab)}
              className={`relative px-3 py-1 rounded-full text-xs font-bold capitalize transition-colors cursor-pointer ${
                filterTab === tab
                  ? "text-black font-black"
                  : isDark
                  ? "text-zinc-400 hover:text-white"
                  : "text-[#6E5A4B] hover:text-[#2A221B]"
              }`}
            >
              {filterTab === tab && (
                <motion.span
                  layoutId="notif-filter-pill"
                  transition={bhalyamSpring}
                  className="absolute inset-0 rounded-full bg-amber-500 shadow-xs -z-10"
                />
              )}
              {tab}
            </button>
          ))}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="text-xs font-bold text-amber-500 hover:underline cursor-pointer inline-flex items-center gap-1"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      <div className="space-y-2.5 my-2">
        {filteredNotifs.length === 0 ? (
          <div className="py-12 text-center">
            <Sparkles className="w-9 h-9 text-amber-400 mx-auto mb-2" />
            <p className={`text-[13px] font-bold ${isDark ? "text-zinc-300" : "text-[#5C3B1E]"}`}>
              You're all caught up!
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">No notifications in this filter.</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
          {filteredNotifs.map((item, index) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: index * 0.04, ...bhalyamSpring } }}
              exit={{ opacity: 0, x: -24, scale: 0.96, transition: { duration: 0.18 } }}
              onClick={() => {
                if (item.unread) {
                  onUpdateNotifications((prev) =>
                    prev.map((n) => (n.id === item.id ? { ...n, unread: false } : n))
                  );
                }
              }}
              className={`p-3.5 rounded-2xl border cursor-pointer ${
                isDark
                  ? item.unread
                    ? "bg-[#141E34] border-amber-400/40 shadow-xs"
                    : "bg-[#0E1526] border-white/10"
                  : item.unread
                  ? "bg-[#FFF9EE] border-[#E8D1A7] shadow-xs"
                  : "bg-white/80 border-[#ECD9BA]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    item.type === "invite"
                      ? "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                      : item.type === "reward"
                      ? "bg-purple-500/15 text-purple-500 border border-purple-500/30"
                      : item.type === "gang"
                      ? "bg-blue-500/15 text-blue-500 border border-blue-500/30"
                      : "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                  }`}>
                    {item.type === "invite" ? (
                      <Mail className="w-4.5 h-4.5" />
                    ) : item.type === "reward" ? (
                      <Sparkles className="w-4.5 h-4.5" />
                    ) : item.type === "gang" ? (
                      <UsersLucideIcon className="w-4.5 h-4.5" />
                    ) : (
                      <Trophy className="w-4.5 h-4.5" />
                    )}
                  </div>
                  <div>
                    <h4 className={`text-[13px] font-bold leading-tight ${isDark ? "text-white" : "text-[#2A221B]"}`}>
                      {item.title}
                    </h4>
                    <p className={`text-xs mt-0.5 leading-snug ${isDark ? "text-zinc-300" : "text-[#6E5A4B]"}`}>
                      {item.desc}
                    </p>
                    <span className="text-[10px] text-zinc-500 mt-1 block font-semibold">
                      {item.time}
                    </span>
                  </div>
                </div>
                {item.unread && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0 mt-1" />
                )}
              </div>

              {item.type === "invite" && (
                <div className="mt-3 pt-2.5 border-t border-white/10 dark:border-white/10 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (item.roomCode) {
                        navigate(`/room/${item.roomCode}`);
                      } else {
                        onOpenJoin();
                      }
                    }}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-[12px] shadow-xs active:scale-95 transition cursor-pointer text-center"
                  >
                    Join Room
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateNotifications((prev) => prev.filter((n) => n.id !== item.id));
                    }}
                    className={`py-1.5 px-3 rounded-xl text-[12px] font-bold transition cursor-pointer ${
                      isDark ? "bg-white/10 text-zinc-300 hover:text-white" : "bg-black/5 text-[#5C3B1E] hover:bg-black/10"
                    }`}
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </motion.div>
          ))}
          </AnimatePresence>
        )}
      </div>
    </>
  );
}
