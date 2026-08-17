import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import { useRoomStore } from "../store/roomStore";
import { useAuthStore } from "../store/authStore";
import { useTheme } from "../lib/useTheme";
import { GlobalSettings } from "../components/GlobalSettings";
import LanguageSettings from "../components/LanguageSettings/LanguageSettings";
import YourDataPanel from "../components/privacy/YourDataPanel";
import AvatarPicker from "../components/profile/AvatarPicker";
import SelfAvatar from "../components/profile/SelfAvatar";
import {
  User,
  Shield,
  Lock,
  Bell,
  Gamepad2,
  Palette,
  Volume2,
  Globe,
  Database,
  HelpCircle,
  Copy,
  ChevronRight,
  Radio,
  Users,
  CheckCircle2,
  Camera,
  Check,
  Key,
  Smartphone,
  Laptop,
  AlertTriangle,
  LogOut,
  History,
  MoreVertical,
  Headphones,
  Mail,
  Calendar,
  Hash,
  Paperclip,
  Trash2,
  PowerOff,
} from "lucide-react";

type SettingsTab =
  | "profile"
  | "account"
  | "privacy"
  | "notifications"
  | "gameplay"
  | "appearance"
  | "audio"
  | "language"
  | "storage"
  | "help";

export default function SettingsPage() {
  const [theme] = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  const { playerName, setPlayerName, avatarId, setAvatarId } = useRoomStore();
  const { email: authEmail, signOut } = useAuthStore();

  // Active Tab
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");

  // Profile Form state
  const [displayName, setDisplayName] = useState(playerName.trim() || "Jetpacker!");
  const [username, setUsername] = useState("jetpacker90s");
  const [bioTag1, setBioTag1] = useState("90s kid");
  const [bioTag2, setBioTag2] = useState("Rummy Lover");
  const [bioTag3, setBioTag3] = useState("Always in Adda!");
  const [email, setEmail] = useState(authEmail || "jetpacker90s@gmail.com");
  const [phone, setPhone] = useState("+91 9XXXXXXXXX");
  const [accountId] = useState("BHYM-90S-4827-11");
  const [profileId] = useState("BH123456");
  const [accountCreated] = useState("20 May 2026");

  // Modals & interactive edit states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [usernameModalOpen, setUsernameModalOpen] = useState(false);
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Notification Toggles
  const [notifyGameInvites, setNotifyGameInvites] = useState(true);
  const [notifyFriendRequests, setNotifyFriendRequests] = useState(true);
  const [notifyEventsUpdates, setNotifyEventsUpdates] = useState(false);
  const [notifyPromoRewards, setNotifyPromoRewards] = useState(true);

  // Gameplay Settings
  const [defaultGameMode, setDefaultGameMode] = useState("Classic");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const copyAccountId = () => {
    navigator.clipboard?.writeText(accountId);
    showToast(`✓ Copied Account ID: ${accountId}`);
  };

  const copyProfileId = () => {
    navigator.clipboard?.writeText(profileId);
    showToast(`✓ Copied ID: ${profileId}`);
  };

  const handleSaveProfile = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (displayName.trim()) {
      setPlayerName(displayName.trim());
    }
    setIsEditingProfile(false);
    showToast("✓ Profile changes saved!");
  };

  const NAV_TABS: Array<{ id: SettingsTab; label: string; icon: any }> = [
    { id: "profile", label: "Profile", icon: User },
    { id: "account", label: "Account", icon: Shield },
    { id: "privacy", label: "Privacy & Security", icon: Lock },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "gameplay", label: "Gameplay", icon: Gamepad2 },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "audio", label: "Audio & Video", icon: Volume2 },
    { id: "language", label: "Language", icon: Globe },
    { id: "storage", label: "Data & Storage", icon: Database },
    { id: "help", label: "Help & Support", icon: HelpCircle },
  ];

  const ACTIVITIES = [
    { name: "Babji", action: "In Room: Rummy", time: "2m ago", online: true, avatar: "file_0000000084c48208b1f893419d784cf2_1.jpg" },
    { name: "Anand", action: "In Room: UNO", time: "12m ago", online: true, avatar: "file_0000000094008208a20f77270605d0d5_2.jpg" },
    { name: "Chinna", action: "In Room: Ludo", time: "25m ago", online: true, avatar: "file_0000000084c48208b1f893419d784cf2_3.jpg" },
    { name: "Eswari", action: "Online", time: "1h ago", online: true, avatar: "file_0000000094008208a20f77270605d0d5_4.jpg" },
    { name: "Damodar", action: "In Room: Hand Cricket", time: "2h ago", online: true, avatar: "file_0000000084c48208b1f893419d784cf2_5.jpg" },
  ];

  return (
    <AppLayout>
      <div
        className={`min-h-full font-sans pb-16 transition-colors duration-200 ${
          isDark ? "bg-[#0A0F1D] text-slate-100" : "bg-[#F7EFE1] text-[#3D2612]"
        }`}
      >
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#16223B] text-amber-300 border border-amber-400/40 px-4 py-2.5 rounded-2xl shadow-xl font-bold text-sm flex items-center gap-2 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        <main className="max-w-[1280px] mx-auto px-3.5 sm:px-6 pt-5 sm:pt-7 space-y-6">

          {/* ══════════════════════════════════════════════════════════
              HEADER BANNER: ACCOUNT VIEW OR PROFILE VIEW
              ══════════════════════════════════════════════════════════ */}
          {activeTab === "account" ? (
            /* ACCOUNT PAGE HEADER & SAFETY BANNER */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-center">
              {/* Left Header with Student Identity Notebook & Doodles */}
              <div className="lg:col-span-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="text-left">
                  <h1 className="font-display text-[32px] sm:text-[38px] font-black leading-tight text-[#16223B] dark:text-white">
                    Account
                  </h1>
                  <p className="text-[13px] sm:text-[14px] font-medium text-[#7A5E45] dark:text-zinc-400 mt-1 max-w-md">
                    Manage your account information and keep your access details up to date.
                  </p>
                </div>

                {/* Nostalgia Sketch Doodles & Student Identity Notebook */}
                <div className="hidden sm:flex items-center gap-3 select-none flex-shrink-0">
                  {/* Kids Doodle SVG */}
                  <svg viewBox="0 0 50 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-14 opacity-75">
                    <circle cx="16" cy="14" r="7" stroke="#A07246" strokeWidth="1.5" fill="#FAF2DF" />
                    <path d="M 10 22 L 7 42 M 22 22 L 25 42 M 16 21 L 16 38" stroke="#A07246" strokeWidth="1.5" />
                    <circle cx="36" cy="16" r="7" stroke="#A07246" strokeWidth="1.5" fill="#FAF2DF" />
                    <path d="M 30 24 L 28 42 M 42 24 L 44 42 M 36 23 L 36 38" stroke="#A07246" strokeWidth="1.5" />
                  </svg>

                  {/* Angled Pencil */}
                  <div className="w-14 h-3 bg-amber-500 rounded-xs border border-amber-700 shadow-2xs rotate-[-35deg] flex items-center justify-between px-1">
                    <div className="w-2 h-full bg-[#FAF2DF]" />
                    <div className="w-2 h-full bg-[#E57373] rounded-xs" />
                  </div>

                  {/* Student Identity Spiral Card */}
                  <div className="relative bg-[#FFFDF8] border border-[#ECD9BA] rounded-2xl p-2.5 shadow-sm rotate-2 flex flex-col items-center">
                    {/* Spiral Ring Binder */}
                    <div className="absolute -top-2 inset-x-2 flex justify-between px-1">
                      {[1, 2, 3, 4, 5].map((k) => (
                        <div key={k} className="w-1.5 h-3 bg-zinc-400 rounded-full border border-zinc-600 shadow-2xs" />
                      ))}
                    </div>

                    <span className="text-[9px] font-black uppercase tracking-wider text-[#8C4A0E] mt-1 mb-1">
                      STUDENT IDENTITY
                    </span>

                    <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-[#D4A574] bg-amber-100 flex items-center justify-center shadow-xs">
                      <img
                        src="/Avatars/file_0000000084c48208b1f893419d784cf2_1.jpg"
                        alt="Student"
                        className="w-full h-full object-cover scale-110"
                        onError={(e) => {
                          e.currentTarget.src = "/Founder.png";
                        }}
                      />
                      {/* Certified Red Stamp */}
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border border-rose-500/80 bg-rose-500/10 flex items-center justify-center rotate-[-15deg]">
                        <span className="text-[6px] font-black text-rose-600">★</span>
                      </div>
                    </div>
                  </div>

                  {/* Paper Plane Flying */}
                  <div className="rotate-12">
                    <svg viewBox="0 0 35 30" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-7">
                      <polygon points="0,20 30,0 15,30 12,20" fill="#C85A17" />
                      <polygon points="30,0 12,20 15,30" fill="#E87A38" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Right: Keep your account safe Hero Card */}
              <div className="lg:col-span-4">
                <div
                  className={`rounded-3xl border p-4.5 shadow-[0_4px_20px_rgba(74,44,18,0.04)] flex items-center gap-3.5 text-left transition-colors ${
                    isDark ? "bg-[#101728]/95 border-amber-500/30" : "bg-[#FFFDF8] border-[#ECD9BA]"
                  }`}
                >
                  {/* Golden-Green Heart Shield */}
                  <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-amber-300 border border-emerald-400/50 flex items-center justify-center flex-shrink-0 shadow-md">
                    <Shield className="w-7 h-7 text-amber-300 fill-amber-300/20" />
                  </div>
                  <div>
                    <h3 className="font-black text-[14px] text-[#16223B] dark:text-white leading-tight">
                      Keep your account safe
                    </h3>
                    <p className="text-[11.5px] font-medium text-[#7A5E45] dark:text-zinc-400 mt-1 leading-snug">
                      Bhalyam is your space to play, connect and relive memories. Let&apos;s keep it safe together.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* PROFILE PAGE HEADER */
            <section
              className={`relative rounded-3xl sm:rounded-[32px] border p-5 sm:p-7 shadow-[0_4px_20px_rgba(74,44,18,0.04)] overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors ${
                isDark ? "bg-[#101728]/95 border-white/10" : "bg-[#FFFDF8] border-[#ECD9BA]"
              }`}
            >
              <div className="flex items-center gap-3.5 text-left">
                <div
                  className={`w-12 h-12 rounded-2xl border flex items-center justify-center shadow-xs flex-shrink-0 ${
                    isDark
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                      : "bg-[#FFF2D6] text-[#B45309] border-[#F5DEB3]"
                  }`}
                >
                  <div className="text-xl">⚙️</div>
                </div>
                <div>
                  <h1 className="font-display text-[26px] sm:text-[32px] font-black leading-tight text-[#16223B] dark:text-white">
                    Settings
                  </h1>
                  <p className="text-[12.5px] sm:text-[13.5px] font-medium text-[#7A5E45] dark:text-zinc-400">
                    Customize your Bhalyam experience
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 select-none">
                <div className="text-right">
                  <p className="font-script text-[17px] sm:text-[19px] font-bold text-[#8C4A0E] dark:text-amber-300 leading-tight">
                    Same games.
                  </p>
                  <p className="font-script text-[17px] sm:text-[19px] font-bold text-[#8C4A0E] dark:text-amber-300 leading-tight">
                    New memories. ♡
                  </p>
                </div>

                <svg viewBox="0 0 70 45" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-16 h-11">
                  <path
                    d="M 5 35 Q 25 5 45 22 Q 55 30 65 10"
                    stroke="#C85A17"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    strokeLinecap="round"
                  />
                  <g transform="translate(52, 2) rotate(15) scale(0.65)">
                    <polygon points="0,15 25,0 12,25 9,16" fill="#C85A17" />
                    <polygon points="25,0 9,16 12,25" fill="#E87A38" />
                  </g>
                </svg>
              </div>
            </section>
          )}


          {/* ══════════════════════════════════════════════════════════
              THREE-COLUMN SETTINGS CONSOLE
              ══════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
            
            {/* ────────────────────────────────────────────────────────
                COLUMN 1: SETTINGS TAB NAVIGATION (3 Cols)
                ──────────────────────────────────────────────────────── */}
            <aside className="lg:col-span-3 space-y-1">
              {NAV_TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-left transition-all duration-200 cursor-pointer ${
                      active
                        ? isDark
                          ? "bg-amber-500/15 border border-amber-500/30 text-amber-300 font-extrabold shadow-2xs"
                          : "bg-[#FFF4DC] border border-[#F2D7A2] text-[#8C4A0E] font-extrabold shadow-2xs"
                        : isDark
                        ? "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
                        : "text-[#6E543D] hover:text-[#3D2612] hover:bg-[#FAF2DF] border border-transparent"
                    }`}
                  >
                    <Icon className={`w-4.5 h-4.5 ${active ? "text-amber-500" : "opacity-75"}`} />
                    <span className="text-[13px]">{tab.label}</span>
                  </button>
                );
              })}
            </aside>


            {/* ────────────────────────────────────────────────────────
                COLUMN 2: MAIN CENTER COLUMN (6 Cols)
                ──────────────────────────────────────────────────────── */}
            <div className="lg:col-span-6 space-y-5">

              {/* ── TAB: ACCOUNT (ACTIVE BY USER REQUEST) ───────────── */}
              {activeTab === "account" && (
                <>
                  {/* CARD 1: ACCOUNT INFORMATION */}
                  <div
                    className={`rounded-3xl border p-5 sm:p-6 shadow-[0_4px_20px_rgba(74,44,18,0.04)] text-left transition-colors ${
                      isDark ? "bg-[#101728]/95 border-white/10" : "bg-[#FFFDF8] border-[#ECD9BA]"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <User className="w-4.5 h-4.5 text-amber-600" />
                      <h3 className="font-bold text-[15px] text-[#16223B] dark:text-white leading-tight">
                        Account Information
                      </h3>
                    </div>

                    <div className="space-y-0.5">
                      {/* 1. Email Address */}
                      <div className="flex items-center justify-between gap-2 py-2.5 border-b border-[#ECD9BA]/40 dark:border-white/5">
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Mail className="w-4 h-4 text-[#8C4A0E] dark:text-amber-400" />
                          <span className="text-[11.5px] font-bold text-[#16223B] dark:text-white whitespace-nowrap">Email Address</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
                          <span className="text-[11px] font-mono text-[#6E543D] dark:text-zinc-300">{email}</span>
                          <span className="px-1.5 py-0.5 rounded-full text-[8.5px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Verified
                          </span>
                          <button
                            type="button"
                            onClick={() => setEmailModalOpen(true)}
                            className="ml-1 px-2 py-0.8 rounded-xl text-[10px] font-bold border border-[#ECD9BA] dark:border-white/10 bg-[#FAF4E6] dark:bg-[#141C2E] hover:border-amber-400 transition cursor-pointer whitespace-nowrap"
                          >
                            Change Email
                          </button>
                        </div>
                      </div>

                      {/* 2. Mobile Number */}
                      <div className="flex items-center justify-between gap-2 py-2.5 border-b border-[#ECD9BA]/40 dark:border-white/5">
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Smartphone className="w-4 h-4 text-[#8C4A0E] dark:text-amber-400" />
                          <span className="text-[11.5px] font-bold text-[#16223B] dark:text-white whitespace-nowrap">Mobile Number</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
                          <span className="text-[11px] font-mono text-[#6E543D] dark:text-zinc-300">{phone}</span>
                          <span className="px-1.5 py-0.5 rounded-full text-[8.5px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Verified
                          </span>
                          <button
                            type="button"
                            onClick={() => setPhoneModalOpen(true)}
                            className="ml-1 px-2 py-0.8 rounded-xl text-[10px] font-bold border border-[#ECD9BA] dark:border-white/10 bg-[#FAF4E6] dark:bg-[#141C2E] hover:border-amber-400 transition cursor-pointer whitespace-nowrap"
                          >
                            Change Phone
                          </button>
                        </div>
                      </div>

                      {/* 3. Username */}
                      <div className="flex items-center justify-between gap-2 py-2.5 border-b border-[#ECD9BA]/40 dark:border-white/5">
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <User className="w-4 h-4 text-[#8C4A0E] dark:text-amber-400" />
                          <span className="text-[11.5px] font-bold text-[#16223B] dark:text-white whitespace-nowrap">Username</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                          <span className="text-[11px] font-mono text-[#6E543D] dark:text-zinc-300">{username}</span>
                          <button
                            type="button"
                            onClick={() => setUsernameModalOpen(true)}
                            className="ml-1 px-2 py-0.8 rounded-xl text-[10px] font-bold border border-[#ECD9BA] dark:border-white/10 bg-[#FAF4E6] dark:bg-[#141C2E] hover:border-amber-400 transition cursor-pointer whitespace-nowrap"
                          >
                            Edit Username
                          </button>
                        </div>
                      </div>

                      {/* 4. Account ID */}
                      <div className="flex items-center justify-between gap-2 py-2.5 border-b border-[#ECD9BA]/40 dark:border-white/5">
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Hash className="w-4 h-4 text-[#8C4A0E] dark:text-amber-400" />
                          <span className="text-[11.5px] font-bold text-[#16223B] dark:text-white whitespace-nowrap">Account ID</span>
                        </div>
                        <div className="flex items-center gap-1.5 ml-auto">
                          <span className="text-[11px] font-mono text-[#6E543D] dark:text-zinc-300">{accountId}</span>
                          <button
                            type="button"
                            onClick={copyAccountId}
                            title="Copy Account ID"
                            className="p-1 hover:text-amber-600 transition cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* 5. Account Created */}
                      <div className="flex items-center justify-between gap-2 py-2.5">
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Calendar className="w-4 h-4 text-[#8C4A0E] dark:text-amber-400" />
                          <span className="text-[11.5px] font-bold text-[#16223B] dark:text-white whitespace-nowrap">Account Created</span>
                        </div>
                        <span className="text-[11px] font-medium text-[#6E543D] dark:text-zinc-300 ml-auto">
                          {accountCreated}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* CARD 2: SECURITY & ACCESS */}
                  <div
                    className={`rounded-3xl border p-5 sm:p-6 shadow-[0_4px_20px_rgba(74,44,18,0.04)] text-left transition-colors ${
                      isDark ? "bg-[#101728]/95 border-white/10" : "bg-[#FFFDF8] border-[#ECD9BA]"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <Lock className="w-4.5 h-4.5 text-amber-600" />
                      <h3 className="font-bold text-[15px] text-[#16223B] dark:text-white leading-tight">
                        Security &amp; Access
                      </h3>
                    </div>

                    <div className="space-y-2">
                      {/* Change Password */}
                      <button
                        type="button"
                        onClick={() => setPasswordModalOpen(true)}
                        className="w-full p-3 rounded-2xl border border-[#ECD9BA]/60 dark:border-white/10 bg-[#FAF4E6] dark:bg-[#141C2E] flex items-center justify-between gap-2 hover:border-amber-400 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <Key className="w-4 h-4 text-[#8C4A0E] dark:text-amber-400" />
                          <div className="text-left">
                            <div className="text-[13px] font-bold text-[#16223B] dark:text-white">Change Password</div>
                            <div className="text-[11px] text-[#7A5E45] dark:text-zinc-400">Update your password regularly</div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-400" />
                      </button>

                      {/* Active Sessions */}
                      <button
                        type="button"
                        onClick={() => showToast("3 devices currently connected")}
                        className="w-full p-3 rounded-2xl border border-[#ECD9BA]/60 dark:border-white/10 bg-[#FAF4E6] dark:bg-[#141C2E] flex items-center justify-between gap-2 hover:border-amber-400 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <Laptop className="w-4 h-4 text-[#8C4A0E] dark:text-amber-400" />
                          <div className="text-left">
                            <div className="text-[13px] font-bold text-[#16223B] dark:text-white">Active Sessions</div>
                            <div className="text-[11px] text-[#7A5E45] dark:text-zinc-400">Manage your logged-in devices</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[11.5px] font-bold text-amber-700 dark:text-amber-400">3 Active</span>
                          <ChevronRight className="w-4 h-4 text-zinc-400" />
                        </div>
                      </button>

                      {/* Login History */}
                      <button
                        type="button"
                        onClick={() => showToast("Showing recent IP & location logins")}
                        className="w-full p-3 rounded-2xl border border-[#ECD9BA]/60 dark:border-white/10 bg-[#FAF4E6] dark:bg-[#141C2E] flex items-center justify-between gap-2 hover:border-amber-400 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <History className="w-4 h-4 text-[#8C4A0E] dark:text-amber-400" />
                          <div className="text-left">
                            <div className="text-[13px] font-bold text-[#16223B] dark:text-white">Login History</div>
                            <div className="text-[11px] text-[#7A5E45] dark:text-zinc-400">See your recent login activity</div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-400" />
                      </button>

                      {/* Sign out of all devices */}
                      <button
                        type="button"
                        onClick={() => {
                          signOut();
                          showToast("Signed out of all other sessions");
                        }}
                        className="w-full p-3 rounded-2xl border border-[#ECD9BA]/60 dark:border-white/10 bg-[#FAF4E6] dark:bg-[#141C2E] flex items-center justify-between gap-2 hover:border-rose-400 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <LogOut className="w-4 h-4 text-rose-600" />
                          <div className="text-left">
                            <div className="text-[13px] font-bold text-[#16223B] dark:text-white">Sign out of all devices</div>
                            <div className="text-[11px] text-[#7A5E45] dark:text-zinc-400">This will sign you out from all active sessions</div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-400" />
                      </button>
                    </div>
                  </div>

                  {/* CARD 3: DANGER ZONE */}
                  <div
                    className={`rounded-3xl border border-rose-200 dark:border-rose-950/60 p-5 sm:p-6 shadow-[0_4px_20px_rgba(74,44,18,0.04)] text-left transition-colors ${
                      isDark ? "bg-[#18111A]/95" : "bg-[#FFF9F9]"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="w-4.5 h-4.5 text-rose-600" />
                      <h3 className="font-bold text-[15px] text-rose-700 dark:text-rose-400 leading-tight">
                        Danger Zone
                      </h3>
                    </div>

                    <div className="space-y-3">
                      {/* Deactivate */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl border border-rose-200/80 dark:border-rose-900/40 bg-white/60 dark:bg-white/5">
                        <div className="flex items-center gap-2.5">
                          <PowerOff className="w-4 h-4 text-rose-500" />
                          <div>
                            <div className="text-[13px] font-bold text-[#16223B] dark:text-white">Deactivate Account</div>
                            <div className="text-[11px] text-[#7A5E45] dark:text-zinc-400">Temporarily disable your account</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDeactivateModalOpen(true)}
                          className="px-3.5 py-1.5 rounded-xl border border-rose-300 text-rose-600 text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        >
                          Deactivate
                        </button>
                      </div>

                      {/* Delete */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl border border-rose-200/80 dark:border-rose-900/40 bg-white/60 dark:bg-white/5">
                        <div className="flex items-center gap-2.5">
                          <Trash2 className="w-4 h-4 text-rose-600" />
                          <div>
                            <div className="text-[13px] font-bold text-[#16223B] dark:text-white">Delete Account</div>
                            <div className="text-[11px] text-[#7A5E45] dark:text-zinc-400">Permanently delete your account and all data</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDeleteModalOpen(true)}
                          className="px-3.5 py-1.5 rounded-xl border border-rose-500 text-rose-700 dark:text-rose-300 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-950/60 transition cursor-pointer"
                        >
                          Delete Permanently
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ── TAB: PROFILE (FROM PREVIOUS MOCKUP) ────────────── */}
              {activeTab === "profile" && (
                <>
                  {/* CARD 1: PROFILE SETTINGS */}
                  <div
                    className={`rounded-3xl border p-5 sm:p-6 shadow-[0_4px_20px_rgba(74,44,18,0.04)] text-left transition-colors ${
                      isDark ? "bg-[#101728]/95 border-white/10" : "bg-[#FFFDF8] border-[#ECD9BA]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-base">⚙️</span>
                        <div>
                          <h3 className="font-bold text-[15px] text-[#16223B] dark:text-white leading-tight">
                            Profile Settings
                          </h3>
                          <p className="text-[11.5px] text-[#7A5E45] dark:text-zinc-400">
                            Update your personal information and avatar
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(!isEditingProfile)}
                        className={`px-3.5 py-1 rounded-xl text-[12px] font-bold border transition-all cursor-pointer ${
                          isEditingProfile
                            ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                            : isDark
                            ? "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
                            : "bg-[#FAF2DF] border-[#ECD9BA] text-[#5C3B1E] hover:bg-[#F2E4CB]"
                        }`}
                      >
                        {isEditingProfile ? "Done" : "Edit"}
                      </button>
                    </div>

                    <div className="flex items-center gap-4 pt-1">
                      <div className="relative group flex-shrink-0">
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-emerald-500 bg-[#FAF2DF] dark:bg-amber-900/40 flex items-center justify-center shadow-md">
                          <SelfAvatar
                            className="w-full h-full"
                            fallback={
                              <img
                                src="/Avatars/file_0000000084c48208b1f893419d784cf2_1.jpg"
                                alt="Jetpacker Avatar"
                                className="w-full h-full object-cover scale-[1.25] origin-center"
                                onError={(e) => {
                                  e.currentTarget.src = "/Founder.png";
                                }}
                              />
                            }
                          />
                        </div>
                        <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-[#101728]" />
                        
                        <button
                          type="button"
                          onClick={() => setAvatarModalOpen(true)}
                          title="Change Avatar"
                          className="absolute inset-0 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <Camera className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-[18px] text-[#16223B] dark:text-white truncate">
                            {displayName}
                          </h4>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-[#FAF0D9] text-[#B45309] dark:bg-amber-500/20 dark:text-amber-300 border border-[#ECD9BA] dark:border-amber-400/40 flex-shrink-0">
                            Lv 12
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 mt-0.5 text-[11.5px] font-mono text-[#7A5E45] dark:text-zinc-400">
                          <span>ID: {profileId}</span>
                          <button
                            type="button"
                            onClick={copyProfileId}
                            title="Copy ID"
                            className="p-1 hover:text-amber-600 transition cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-[#FAF2DF] dark:bg-white/5 border border-[#ECD9BA] dark:border-white/10 text-[#6E543D] dark:text-zinc-300">
                            {bioTag1}
                          </span>
                          <span className="text-[#ECD9BA] dark:text-zinc-700">|</span>
                          <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-[#FAF2DF] dark:bg-white/5 border border-[#ECD9BA] dark:border-white/10 text-[#6E543D] dark:text-zinc-300">
                            {bioTag2}
                          </span>
                          <span className="text-[#ECD9BA] dark:text-zinc-700">|</span>
                          <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-[#FAF2DF] dark:bg-white/5 border border-[#ECD9BA] dark:border-white/10 text-[#6E543D] dark:text-zinc-300">
                            {bioTag3}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isEditingProfile && (
                      <form onSubmit={handleSaveProfile} className="mt-4 pt-4 border-t border-[#ECD9BA]/60 dark:border-white/10 space-y-3">
                        <div>
                          <label className="block text-[11px] font-bold text-[#7A5E45] dark:text-zinc-400 mb-1">
                            Display Name
                          </label>
                          <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-xl text-sm font-bold border border-amber-500 bg-white dark:bg-[#141D30] text-[#16223B] dark:text-white focus:outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={bioTag1}
                            onChange={(e) => setBioTag1(e.target.value)}
                            placeholder="Tag 1"
                            className="px-2.5 py-1 rounded-xl text-xs border border-[#ECD9BA] bg-white dark:bg-[#141D30]"
                          />
                          <input
                            type="text"
                            value={bioTag2}
                            onChange={(e) => setBioTag2(e.target.value)}
                            placeholder="Tag 2"
                            className="px-2.5 py-1 rounded-xl text-xs border border-[#ECD9BA] bg-white dark:bg-[#141D30]"
                          />
                          <input
                            type="text"
                            value={bioTag3}
                            onChange={(e) => setBioTag3(e.target.value)}
                            placeholder="Tag 3"
                            className="px-2.5 py-1 rounded-xl text-xs border border-[#ECD9BA] bg-white dark:bg-[#141D30]"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md transition cursor-pointer"
                        >
                          Save Profile
                        </button>
                      </form>
                    )}
                  </div>

                  {/* CARD 2: NOTIFICATION SETTINGS */}
                  <div
                    className={`rounded-3xl border p-5 sm:p-6 shadow-[0_4px_20px_rgba(74,44,18,0.04)] text-left transition-colors ${
                      isDark ? "bg-[#101728]/95 border-white/10" : "bg-[#FFFDF8] border-[#ECD9BA]"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-base">🔔</span>
                      <div>
                        <h3 className="font-bold text-[15px] text-[#16223B] dark:text-white leading-tight">
                          Notification Settings
                        </h3>
                        <p className="text-[11.5px] text-[#7A5E45] dark:text-zinc-400">
                          Choose what you want to be notified about
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <span className="text-sm mt-0.5">🎮</span>
                          <div>
                            <div className="text-[13px] font-bold text-[#16223B] dark:text-white">Game Invites</div>
                            <div className="text-[11.5px] text-[#7A5E45] dark:text-zinc-400">When friends invite you to a game</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={notifyGameInvites}
                          onClick={() => setNotifyGameInvites(!notifyGameInvites)}
                          className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                            notifyGameInvites ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-full bg-white shadow-md block absolute top-0.5 transition-transform ${notifyGameInvites ? "left-5.5" : "left-0.5"}`} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <span className="text-sm mt-0.5">👥</span>
                          <div>
                            <div className="text-[13px] font-bold text-[#16223B] dark:text-white">Friend Requests</div>
                            <div className="text-[11.5px] text-[#7A5E45] dark:text-zinc-400">When someone sends you a friend request</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={notifyFriendRequests}
                          onClick={() => setNotifyFriendRequests(!notifyFriendRequests)}
                          className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                            notifyFriendRequests ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-full bg-white shadow-md block absolute top-0.5 transition-transform ${notifyFriendRequests ? "left-5.5" : "left-0.5"}`} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <span className="text-sm mt-0.5">📅</span>
                          <div>
                            <div className="text-[13px] font-bold text-[#16223B] dark:text-white">Events &amp; Updates</div>
                            <div className="text-[11.5px] text-[#7A5E45] dark:text-zinc-400">New games, events and platform updates</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={notifyEventsUpdates}
                          onClick={() => setNotifyEventsUpdates(!notifyEventsUpdates)}
                          className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                            notifyEventsUpdates ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-full bg-white shadow-md block absolute top-0.5 transition-transform ${notifyEventsUpdates ? "left-5.5" : "left-0.5"}`} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <span className="text-sm mt-0.5">🎁</span>
                          <div>
                            <div className="text-[13px] font-bold text-[#16223B] dark:text-white">Promotions &amp; Rewards</div>
                            <div className="text-[11.5px] text-[#7A5E45] dark:text-zinc-400">Special offers, rewards and bonuses</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={notifyPromoRewards}
                          onClick={() => setNotifyPromoRewards(!notifyPromoRewards)}
                          className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                            notifyPromoRewards ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-full bg-white shadow-md block absolute top-0.5 transition-transform ${notifyPromoRewards ? "left-5.5" : "left-0.5"}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* CARD 3: GAMEPLAY SETTINGS */}
                  <div
                    className={`rounded-3xl border p-5 sm:p-6 shadow-[0_4px_20px_rgba(74,44,18,0.04)] text-left transition-colors ${
                      isDark ? "bg-[#101728]/95 border-white/10" : "bg-[#FFFDF8] border-[#ECD9BA]"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-base">🎨</span>
                      <div>
                        <h3 className="font-bold text-[15px] text-[#16223B] dark:text-white leading-tight">
                          Gameplay Settings
                        </h3>
                        <p className="text-[11.5px] text-[#7A5E45] dark:text-zinc-400">
                          Adjust your game experience
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="w-full p-3 rounded-2xl border border-[#ECD9BA]/60 dark:border-white/10 bg-[#FAF4E6] dark:bg-[#141C2E] flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm">🛡️</span>
                          <span className="text-[13px] font-bold text-[#16223B] dark:text-white">Default Game Mode</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={defaultGameMode}
                            onChange={(e) => {
                              setDefaultGameMode(e.target.value);
                              showToast(`Mode: ${e.target.value}`);
                            }}
                            className="bg-transparent text-[12.5px] font-bold text-[#6E543D] dark:text-zinc-300 focus:outline-none cursor-pointer"
                          >
                            <option value="Classic">Classic</option>
                            <option value="Retro 90s">Retro 90s</option>
                            <option value="Fast Match">Fast Match</option>
                          </select>
                          <ChevronRight className="w-4 h-4 text-zinc-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ── OTHER TABS ── */}
              {activeTab === "privacy" && (
                <div className={`rounded-3xl border p-6 text-left ${isDark ? "bg-[#101728]" : "bg-[#FFFDF8] border-[#ECD9BA]"}`}>
                  <YourDataPanel />
                </div>
              )}

              {activeTab === "notifications" && (
                <div className={`rounded-3xl border p-6 text-left space-y-4 ${isDark ? "bg-[#101728]" : "bg-[#FFFDF8] border-[#ECD9BA]"}`}>
                  <h3 className="font-bold text-[16px]">Notification Preferences</h3>
                  <p className="text-xs text-[#7A5E45] dark:text-zinc-400">Control browser and in-app sound notifications.</p>
                </div>
              )}

              {activeTab === "gameplay" && (
                <div className={`rounded-3xl border p-6 text-left space-y-4 ${isDark ? "bg-[#101728]" : "bg-[#FFFDF8] border-[#ECD9BA]"}`}>
                  <h3 className="font-bold text-[16px]">Game Table Configurations</h3>
                  <p className="text-xs text-[#7A5E45] dark:text-zinc-400">Timer speed, auto-roll dice, and vibration alerts.</p>
                </div>
              )}

              {activeTab === "appearance" && (
                <div className={`rounded-3xl border p-6 text-left space-y-4 ${isDark ? "bg-[#101728]" : "bg-[#FFFDF8] border-[#ECD9BA]"}`}>
                  <h3 className="font-bold text-[16px]">Theme &amp; Visual Style</h3>
                  <p className="text-xs text-[#7A5E45] dark:text-zinc-400">Choose between Nostalgic Paper Notebook and Dark Arcade mode.</p>
                </div>
              )}

              {activeTab === "audio" && (
                <div className={`rounded-3xl border p-6 text-left ${isDark ? "bg-[#101728]" : "bg-[#FFFDF8] border-[#ECD9BA]"}`}>
                  <GlobalSettings bare includeLanguage={false} />
                </div>
              )}

              {activeTab === "language" && (
                <div className={`rounded-3xl border p-6 text-left ${isDark ? "bg-[#101728]" : "bg-[#FFFDF8] border-[#ECD9BA]"}`}>
                  <LanguageSettings embedded />
                </div>
              )}

              {activeTab === "storage" && (
                <div className={`rounded-3xl border p-6 text-left space-y-4 ${isDark ? "bg-[#101728]" : "bg-[#FFFDF8] border-[#ECD9BA]"}`}>
                  <h3 className="font-bold text-[16px]">Local Storage &amp; Cache</h3>
                  <p className="text-xs text-[#7A5E45] dark:text-zinc-400">Manage audio cache and offline board states.</p>
                </div>
              )}

              {activeTab === "help" && (
                <div className={`rounded-3xl border p-6 text-left space-y-3 ${isDark ? "bg-[#101728]" : "bg-[#FFFDF8] border-[#ECD9BA]"}`}>
                  <h3 className="font-bold text-[16px]">Help &amp; Support</h3>
                  <Link to="/about" className="block text-sm font-bold text-amber-600 hover:underline">
                    📖 Read About BHALYAM Story &amp; Founder ➔
                  </Link>
                </div>
              )}

            </div>


            {/* ────────────────────────────────────────────────────────
                COLUMN 3: RIGHT SIDEBAR PANELS (3 Cols)
                ──────────────────────────────────────────────────────── */}
            <div className="lg:col-span-3 space-y-5">
              
              {activeTab === "account" ? (
                /* ── ACCOUNT TAB RIGHT PANELS ── */
                <>
                  {/* CARD 1: ⚡ QUICK LINKS (WITH PAPERCLIP) */}
                  <div
                    className={`relative rounded-3xl border p-5 shadow-[0_4px_20px_rgba(74,44,18,0.04)] text-left transition-colors ${
                      isDark ? "bg-[#101728]/95 border-white/10" : "bg-[#FFFDF8] border-[#ECD9BA]"
                    }`}
                  >
                    {/* Golden Paperclip SVG at top right */}
                    <div className="absolute -top-3 right-6 rotate-12 select-none">
                      <Paperclip className="w-6 h-6 text-[#A67C52] drop-shadow-xs" />
                    </div>

                    <div className="flex items-center gap-1.5 mb-3.5">
                      <span className="text-amber-500 text-sm">⚡</span>
                      <h4 className="font-bold text-[13.5px] text-[#16223B] dark:text-white">
                        Quick Links
                      </h4>
                    </div>

                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab("privacy")}
                        className="w-full p-3 rounded-2xl border border-[#ECD9BA]/60 dark:border-white/10 bg-[#FAF4E6] dark:bg-[#141C2E] flex items-center justify-between gap-2 hover:border-amber-400 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <Lock className="w-4 h-4 text-[#8C4A0E] dark:text-amber-400" />
                          <div className="text-left">
                            <div className="text-[12.5px] font-bold text-[#16223B] dark:text-white">Privacy &amp; Security</div>
                            <div className="text-[10.5px] text-[#7A5E45] dark:text-zinc-400">Control your privacy and data</div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-400" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setPasswordModalOpen(true)}
                        className="w-full p-3 rounded-2xl border border-[#ECD9BA]/60 dark:border-white/10 bg-[#FAF4E6] dark:bg-[#141C2E] flex items-center justify-between gap-2 hover:border-amber-400 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <Key className="w-4 h-4 text-[#8C4A0E] dark:text-amber-400" />
                          <div className="text-left">
                            <div className="text-[12.5px] font-bold text-[#16223B] dark:text-white">Change Password</div>
                            <div className="text-[10.5px] text-[#7A5E45] dark:text-zinc-400">Keep your account secure</div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-400" />
                      </button>

                      <button
                        type="button"
                        onClick={() => showToast("Login alerts are active for new IP/browsers")}
                        className="w-full p-3 rounded-2xl border border-[#ECD9BA]/60 dark:border-white/10 bg-[#FAF4E6] dark:bg-[#141C2E] flex items-center justify-between gap-2 hover:border-amber-400 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <Bell className="w-4 h-4 text-[#8C4A0E] dark:text-amber-400" />
                          <div className="text-left">
                            <div className="text-[12.5px] font-bold text-[#16223B] dark:text-white">Login Alerts</div>
                            <div className="text-[10.5px] text-[#7A5E45] dark:text-zinc-400">Get notified of suspicious logins</div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-400" />
                      </button>
                    </div>
                  </div>

                  {/* CARD 2: 💻 ACTIVE SESSIONS (3) */}
                  <div
                    className={`rounded-3xl border p-5 shadow-[0_4px_20px_rgba(74,44,18,0.04)] text-left transition-colors ${
                      isDark ? "bg-[#101728]/95 border-white/10" : "bg-[#FFFDF8] border-[#ECD9BA]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3.5">
                      <div className="flex items-center gap-1.5">
                        <Laptop className="w-4 h-4 text-amber-600" />
                        <h4 className="font-bold text-[13.5px] text-[#16223B] dark:text-white">
                          Active Sessions (3)
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => showToast("Displaying all 3 sessions")}
                        className="text-[11.5px] font-extrabold text-amber-700 dark:text-amber-400 hover:underline"
                      >
                        View All
                      </button>
                    </div>

                    <div className="space-y-3">
                      {/* Session 1: Windows Chrome */}
                      <div className="p-3 rounded-2xl border border-emerald-300/80 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <Laptop className="w-5 h-5 text-emerald-600 mt-0.5" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[12.5px] font-bold text-[#16223B] dark:text-white">Windows • Chrome</span>
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Current Device
                              </span>
                            </div>
                            <p className="text-[11px] text-[#7A5E45] dark:text-zinc-400 mt-0.5">
                              Hyderabad, India • Just now
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Session 2: Android App */}
                      <div className="p-3 rounded-2xl border border-[#ECD9BA]/60 dark:border-white/10 bg-[#FAF4E6] dark:bg-[#141C2E] flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <Smartphone className="w-5 h-5 text-[#8C4A0E] dark:text-amber-400 mt-0.5" />
                          <div>
                            <div className="text-[12.5px] font-bold text-[#16223B] dark:text-white">Android • App</div>
                            <p className="text-[11px] text-[#7A5E45] dark:text-zinc-400 mt-0.5">
                              Hyderabad, India • 2 hours ago
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => showToast("Device options")}
                          className="p-1 hover:text-amber-600 transition cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4 text-zinc-400" />
                        </button>
                      </div>

                      {/* Session 3: iPhone Safari */}
                      <div className="p-3 rounded-2xl border border-[#ECD9BA]/60 dark:border-white/10 bg-[#FAF4E6] dark:bg-[#141C2E] flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <Smartphone className="w-5 h-5 text-[#8C4A0E] dark:text-amber-400 mt-0.5" />
                          <div>
                            <div className="text-[12.5px] font-bold text-[#16223B] dark:text-white">iPhone • Safari</div>
                            <p className="text-[11px] text-[#7A5E45] dark:text-zinc-400 mt-0.5">
                              Bengaluru, India • 1 day ago
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => showToast("Device options")}
                          className="p-1 hover:text-amber-600 transition cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4 text-zinc-400" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* CARD 3: NEED HELP? WITH 3 KIDS PEEKING */}
                  <div
                    className={`relative rounded-3xl border p-5 shadow-sm text-left transition-colors overflow-hidden ${
                      isDark ? "bg-[#141C2E] border-white/10" : "bg-[#FFFBF0] border-[#E8D8BE]"
                    }`}
                  >
                    <div className="pr-18">
                      <h4 className="font-bold text-[14px] text-[#16223B] dark:text-white mb-1">
                        Need help?
                      </h4>
                      <p className="text-[11.5px] text-[#7A5E45] dark:text-zinc-400 mb-3 leading-snug">
                        If you notice anything unusual with your account, let us know right away.
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate("/about")}
                        className="px-3.5 py-1.5 rounded-xl border border-[#D4A574] bg-[#FAF2DF] dark:bg-white/5 text-[#5C3B1E] dark:text-zinc-200 text-xs font-bold flex items-center gap-1.5 hover:bg-[#F2E4CB] transition cursor-pointer"
                      >
                        <Headphones className="w-3.5 h-3.5 text-amber-600" />
                        <span>Contact Support</span>
                      </button>
                    </div>

                    {/* 3 Smiling Kids peeking on bottom right */}
                    <div className="absolute -bottom-1 -right-2 w-28 h-20 select-none pointer-events-none">
                      <img
                        src="/gangoffriends.png"
                        alt="Support Team"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                </>
              ) : (
                /* ── PROFILE TAB RIGHT PANELS ── */
                <>
                  {/* CARD 1: ⚡ QUICK ACTIONS (2x2 GRID) */}
                  <div
                    className={`rounded-3xl border p-5 shadow-[0_4px_20px_rgba(74,44,18,0.04)] text-left transition-colors ${
                      isDark ? "bg-[#101728]/95 border-white/10" : "bg-[#FFFDF8] border-[#ECD9BA]"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-3.5">
                      <span className="text-amber-500 text-sm">⚡</span>
                      <h4 className="font-bold text-[13.5px] text-[#16223B] dark:text-white">
                        Quick Actions
                      </h4>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <Link
                        to="/games"
                        className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center transition-all hover:scale-102 hover:shadow-xs cursor-pointer ${
                          isDark ? "bg-[#141D30] border-white/10 text-white" : "bg-[#FAF4E6] border-[#ECD9BA]/80 text-[#3D2612]"
                        }`}
                      >
                        <Users className="w-5 h-5 text-indigo-500 mb-1.5" />
                        <span className="text-[11.5px] font-extrabold">Create Room</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => showToast("Enter 6-letter room code from header")}
                        className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center transition-all hover:scale-102 hover:shadow-xs cursor-pointer ${
                          isDark ? "bg-[#141D30] border-white/10 text-white" : "bg-[#FAF4E6] border-[#ECD9BA]/80 text-[#3D2612]"
                        }`}
                      >
                        <span className="text-lg text-emerald-500 mb-1 leading-none">🔗</span>
                        <span className="text-[11.5px] font-extrabold">Join Room</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => showToast("Add friends via Room or Adda Feed")}
                        className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center transition-all hover:scale-102 hover:shadow-xs cursor-pointer ${
                          isDark ? "bg-[#141D30] border-white/10 text-white" : "bg-[#FAF4E6] border-[#ECD9BA]/80 text-[#3D2612]"
                        }`}
                      >
                        <span className="text-lg text-orange-500 mb-1 leading-none">👥+</span>
                        <span className="text-[11.5px] font-extrabold">Add Friends</span>
                      </button>

                      <Link
                        to="/games"
                        className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center transition-all hover:scale-102 hover:shadow-xs cursor-pointer ${
                          isDark ? "bg-[#141D30] border-white/10 text-white" : "bg-[#FAF4E6] border-[#ECD9BA]/80 text-[#3D2612]"
                        }`}
                      >
                        <Radio className="w-5 h-5 text-rose-500 mb-1.5" />
                        <span className="text-[11.5px] font-extrabold">Adda Feed</span>
                      </Link>
                    </div>
                  </div>

                  {/* CARD 2: 🕒 YOUR ACTIVITY */}
                  <div
                    className={`rounded-3xl border p-5 shadow-[0_4px_20px_rgba(74,44,18,0.04)] text-left transition-colors ${
                      isDark ? "bg-[#101728]/95 border-white/10" : "bg-[#FFFDF8] border-[#ECD9BA]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-amber-600 text-sm">🕒</span>
                        <h4 className="font-bold text-[13.5px] text-[#16223B] dark:text-white">
                          Your Activity
                        </h4>
                      </div>
                      <Link
                        to="/games"
                        className="text-[11.5px] font-extrabold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-0.5"
                      >
                        <span>View All</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                    <div className="space-y-2.5">
                      {ACTIVITIES.map((act, i) => (
                        <div key={i} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-[#ECD9BA] flex-shrink-0 bg-amber-100">
                              <img
                                src={`/Avatars/${act.avatar}`}
                                alt={act.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = "/Founder.png";
                                }}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[12.5px] font-bold text-[#16223B] dark:text-white truncate">
                                  {act.name}
                                </span>
                                {act.online && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />}
                              </div>
                              <p className="text-[11px] text-[#7A5E45] dark:text-zinc-400 truncate">
                                {act.action}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10.5px] font-medium text-[#A08266] dark:text-zinc-500 flex-shrink-0">
                            {act.time}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CARD 3: NOSTALGIA SKETCH NOTE */}
                  <div
                    className={`relative rounded-3xl border p-5 shadow-sm text-left transition-colors select-none ${
                      isDark ? "bg-[#141C2E] border-white/10" : "bg-[#FFFBF0] border-[#E8D8BE]"
                    }`}
                  >
                    <div className="absolute -top-2 left-4 w-12 h-4 bg-[#F2E0B2]/90 dark:bg-[#D4B67A]/60 border-y border-[#DFC28B]/80 shadow-2xs rotate-[-6deg]" />
                    <div className="absolute -bottom-2 right-4 w-12 h-4 bg-[#F2E0B2]/90 dark:bg-[#D4B67A]/60 border-y border-[#DFC28B]/80 shadow-2xs rotate-[-6deg]" />

                    <div className="flex items-center justify-between gap-2 pt-1 pb-1">
                      <div className="space-y-0.5">
                        <p className="font-script text-[17px] font-extrabold text-[#7A4B22] dark:text-amber-300 leading-tight">Good</p>
                        <p className="font-script text-[17px] font-extrabold text-[#7A4B22] dark:text-amber-300 leading-tight">Games</p>
                        <p className="font-script text-[17px] font-extrabold text-[#7A4B22] dark:text-amber-300 leading-tight">Better</p>
                        <p className="font-script text-[17px] font-extrabold text-[#7A4B22] dark:text-amber-300 leading-tight">Friends</p>
                        <p className="font-script text-[17px] font-extrabold text-[#7A4B22] dark:text-amber-300 leading-tight">Timeless</p>
                        <p className="font-script text-[17px] font-extrabold text-[#7A4B22] dark:text-amber-300 leading-tight">Memories</p>
                        <p className="font-script text-[15px] font-extrabold text-[#7A4B22] dark:text-amber-300">♡</p>
                      </div>

                      <div className="flex flex-col items-center justify-center pr-2">
                        <svg viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-28 h-28">
                          <path
                            d="M 35 30 C 35 18 65 18 65 30 L 72 70 C 72 78 28 78 28 70 Z"
                            stroke="#8A6542"
                            strokeWidth="1.8"
                            strokeDasharray="2 0.5"
                            fill="#FFFDF8"
                          />
                          <rect x="36" y="42" width="28" height="24" rx="4" stroke="#8A6542" strokeWidth="1.4" fill="#FAF2DF" />
                          <path d="M 42 22 Q 50 14 58 22" stroke="#8A6542" strokeWidth="1.8" fill="none" />

                          <g transform="translate(48, 55) rotate(-10)">
                            <rect x="0" y="0" width="38" height="46" rx="4" stroke="#8A6542" strokeWidth="1.8" fill="#FFFDF8" />
                            <rect x="6" y="5" width="26" height="18" rx="2" stroke="#8A6542" strokeWidth="1.3" fill="#FAF2DF" />
                            <circle cx="12" cy="33" r="4.5" stroke="#8A6542" strokeWidth="1.3" fill="#E8D8BE" />
                            <circle cx="28" cy="30" r="2.5" fill="#8A6542" />
                            <circle cx="24" cy="36" r="2.5" fill="#8A6542" />
                          </g>

                          <g transform="translate(14, 62)">
                            <circle cx="10" cy="10" r="9" stroke="#8A6542" strokeWidth="1.6" fill="#FAF2DF" />
                            <path d="M 4 5 Q 10 10 4 15" stroke="#8A6542" strokeWidth="1.3" fill="none" />
                            <path d="M 16 5 Q 10 10 16 15" stroke="#8A6542" strokeWidth="1.3" fill="none" />
                          </g>
                        </svg>
                      </div>
                    </div>
                  </div>
                </>
              )}

            </div>

          </div>

        </main>

        {/* ── Avatar Picker Modal ────────────────────────────── */}
        {avatarModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div
              className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl space-y-4 text-left ${
                isDark ? "bg-[#101728] border-white/15" : "bg-[#FFFDF8] border-[#ECD9BA]"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[16px] text-[#16223B] dark:text-white">Choose Your Avatar</h3>
                <button
                  type="button"
                  onClick={() => setAvatarModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-sm font-black cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <AvatarPicker
                value={avatarId}
                onChange={(id) => {
                  setAvatarId(id);
                  setAvatarModalOpen(false);
                  showToast("✓ Avatar updated!");
                }}
              />
            </div>
          </div>
        )}

        {/* ── Change Password Modal ─────────────────────────── */}
        {passwordModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div
              className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl space-y-4 text-left ${
                isDark ? "bg-[#101728] border-white/15" : "bg-[#FFFDF8] border-[#ECD9BA]"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[16px] text-[#16223B] dark:text-white">Change Password</h3>
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-sm font-black cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#7A5E45] dark:text-zinc-400 mb-1">Current Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2 rounded-xl text-sm border bg-[#FAF4E6] dark:bg-[#141C2E] border-[#ECD9BA] dark:border-white/15"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#7A5E45] dark:text-zinc-400 mb-1">New Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2 rounded-xl text-sm border bg-[#FAF4E6] dark:bg-[#141C2E] border-[#ECD9BA] dark:border-white/15"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPasswordModalOpen(false);
                    showToast("✓ Password updated successfully!");
                  }}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md transition cursor-pointer"
                >
                  Update Password
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Change Email Modal ────────────────────────────── */}
        {emailModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div
              className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl space-y-4 text-left ${
                isDark ? "bg-[#101728] border-white/15" : "bg-[#FFFDF8] border-[#ECD9BA]"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[16px] text-[#16223B] dark:text-white">Update Email Address</h3>
                <button
                  type="button"
                  onClick={() => setEmailModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-sm font-black cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#7A5E45] dark:text-zinc-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-sm border bg-[#FAF4E6] dark:bg-[#141C2E] border-[#ECD9BA] dark:border-white/15"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEmailModalOpen(false);
                    showToast("✓ Verification link sent to new email!");
                  }}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md transition cursor-pointer"
                >
                  Save &amp; Verify Email
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Change Phone Modal ────────────────────────────── */}
        {phoneModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div
              className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl space-y-4 text-left ${
                isDark ? "bg-[#101728] border-white/15" : "bg-[#FFFDF8] border-[#ECD9BA]"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[16px] text-[#16223B] dark:text-white">Update Mobile Number</h3>
                <button
                  type="button"
                  onClick={() => setPhoneModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-sm font-black cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#7A5E45] dark:text-zinc-400 mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-sm border bg-[#FAF4E6] dark:bg-[#141C2E] border-[#ECD9BA] dark:border-white/15"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPhoneModalOpen(false);
                    showToast("✓ OTP sent to mobile number!");
                  }}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md transition cursor-pointer"
                >
                  Send OTP Verification
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Edit Username Modal ───────────────────────────── */}
        {usernameModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div
              className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl space-y-4 text-left ${
                isDark ? "bg-[#101728] border-white/15" : "bg-[#FFFDF8] border-[#ECD9BA]"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[16px] text-[#16223B] dark:text-white">Edit Username</h3>
                <button
                  type="button"
                  onClick={() => setUsernameModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-sm font-black cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#7A5E45] dark:text-zinc-400 mb-1">Unique Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-sm border bg-[#FAF4E6] dark:bg-[#141C2E] border-[#ECD9BA] dark:border-white/15 font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUsernameModalOpen(false);
                    showToast(`✓ Username updated to @${username}`);
                  }}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md transition cursor-pointer"
                >
                  Save Username
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Deactivate Modal ──────────────────────────────── */}
        {deactivateModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div
              className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl space-y-4 text-left ${
                isDark ? "bg-[#101728] border-rose-500/30" : "bg-[#FFFDF8] border-rose-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[16px] text-rose-600">Deactivate Account</h3>
                <button
                  type="button"
                  onClick={() => setDeactivateModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-sm font-black cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-[#7A5E45] dark:text-zinc-400">
                Are you sure you want to temporarily deactivate your account? Your profile and statistics will be hidden until you log back in.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDeactivateModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-[#ECD9BA] text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeactivateModalOpen(false);
                    showToast("Account deactivated.");
                  }}
                  className="flex-1 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-md"
                >
                  Confirm Deactivation
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Delete Modal ──────────────────────────────────── */}
        {deleteModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div
              className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl space-y-4 text-left ${
                isDark ? "bg-[#101728] border-rose-500/30" : "bg-[#FFFDF8] border-rose-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[16px] text-rose-600">Delete Account Permanently</h3>
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-sm font-black cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-[#7A5E45] dark:text-zinc-400">
                This action is irreversible. All your game progress, friend connections, achievements, and room history will be permanently erased.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-[#ECD9BA] text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteModalOpen(false);
                    signOut();
                    showToast("Account permanently deleted.");
                  }}
                  className="flex-1 py-2 rounded-xl bg-rose-700 text-white text-xs font-bold shadow-md"
                >
                  Permanently Delete
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
