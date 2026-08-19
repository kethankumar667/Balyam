import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import { useRoomStore } from "../store/roomStore";
import { useAuthStore } from "../store/authStore";
import { useTheme } from "../lib/useTheme";
import { useAudio } from "../hooks/useAudio";
import { useHaptics } from "../hooks/useHaptics";
import { useTranslation } from "../hooks/useTranslation";
import { AUDIO, type AudioThemeId } from "../constants/audio";
import { THEMES } from "../assets/audio/themes/manifests";
import AvatarPicker from "../components/profile/AvatarPicker";
import SelfAvatar from "../components/profile/SelfAvatar";
import MemberLockedGate from "../components/auth/MemberLockedGate";
import { SecondaryButton } from "../design-system/dls";
import { loadAccountDetails } from "../lib/accountGenerator";
import {
  User,
  Volume2,
  Palette,
  Database,
  Pencil,
  Copy,
  ChevronRight,
  ChevronDown,
  LogOut,
  Lock,
  Headphones,
  Globe,
  Download,
  Trash2,
  Check,
  CheckCircle2,
  X,
} from "lucide-react";

type SettingsSection =
  | "profile-account"
  | "sound-haptics"
  | "appearance-language"
  | "your-data";

export default function SettingsPage() {
  const [theme, toggleTheme] = useTheme();
  const isDark = theme === "dark";

  const { playerName, setPlayerName, avatarId, setAvatarId } = useRoomStore();
  const { isMember, ready, email: authEmail, signOut } = useAuthStore();

  const { settings: audioSettings, setMasterVolume, setMusicVolume, setEffectsVolume, toggleMute, setAudioTheme, play } = useAudio();
  const haptics = useHaptics();
  const { locale, setLocale } = useTranslation();

  /**
   * The guard is a flag here, and the early return lives below every hook.
   *
   * It used to `return null` at this point, before roughly twenty `useState`
   * calls further down. `ready` starts false while the session is read back,
   * so the first render registered eight hooks and the second registered
   * twenty-eight — and React throws "rendered more hooks than during the
   * previous render" the moment auth resolves. Hooks cannot sit behind a
   * conditional return; the condition has to wait for them.
   */
  const blocked = !ready || !isMember;

  // Active section
  const [activeSection, setActiveSection] = useState<SettingsSection>("profile-account");

  // Profile State
  const storedAccount = loadAccountDetails();
  const [displayName, setDisplayName] = useState(playerName.trim() || storedAccount?.displayName || "Jetpacker!");
  const [profileId] = useState("BH123456");
  const [accountId] = useState(storedAccount?.accountId || "BHYM-90S-4827-11");
  const [createdOn] = useState(storedAccount?.createdAt || "20 May 2026");
  const [email] = useState(authEmail || storedAccount?.email || "jetpacker90s@gmail.com");
  const [phone] = useState("+91 9XXXXXXXXX");

  // Modals
  const [isEditingName, setIsEditingName] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [eraseModalOpen, setEraseModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  /**
   * Escape closes whichever modal is open, and the page behind stops
   * scrolling while one is.
   *
   * Neither happened before. On a phone that meant the only exit from the
   * avatar picker was a 32px button in a corner, and flicking the grid
   * scrolled the settings page underneath it instead.
   */
  const anyModalOpen = avatarModalOpen || passwordModalOpen || eraseModalOpen || isEditingName;
  useEffect(() => {
    if (!anyModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setAvatarModalOpen(false);
      setPasswordModalOpen(false);
      setEraseModalOpen(false);
      setIsEditingName(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [anyModalOpen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const copyProfileId = () => {
    navigator.clipboard?.writeText(profileId);
    showToast(`✓ Copied Profile ID: ${profileId}`);
  };

  const handleSaveName = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (displayName.trim()) {
      setPlayerName(displayName.trim());
      showToast("✓ Display Name updated!");
    }
    setIsEditingName(false);
  };

  const scrollToSection = (id: SettingsSection) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleDownloadData = () => {
    const data = {
      profile: {
        displayName,
        profileId,
        accountId,
        createdOn,
        email,
        phone,
        avatarId,
      },
      preferences: {
        theme,
        sound: !audioSettings.isMuted,
        masterVolume: audioSettings.masterVolume,
        musicVolume: audioSettings.musicVolume,
        effectsVolume: audioSettings.effectsVolume,
        audioTheme: audioSettings.selectedAudioTheme,
        vibration: haptics.enabled,
        locale,
      },
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bhalyam-data-${profileId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("✓ Data downloaded successfully!");
  };

  const handleEraseAllData = () => {
    try {
      localStorage.clear();
      showToast("All data erased. Reloading...");
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    } catch {
      showToast("Failed to clear local data");
    }
  };

  const NAV_ITEMS: Array<{ id: SettingsSection; label: string; icon: any }> = [
    { id: "profile-account", label: "Profile & Account", icon: User },
    { id: "sound-haptics", label: "Sound & Haptics", icon: Volume2 },
    { id: "appearance-language", label: "Appearance & Language", icon: Palette },
    { id: "your-data", label: "Your Data", icon: Database },
  ];

  if (blocked) return <MemberLockedGate feature="settings" />;

  return (
    <AppLayout sidebar={false}>
      <div
        className={`min-h-full font-sans pb-20 transition-colors duration-200 ${
          isDark ? "bg-[#0A0F1D] text-slate-100" : "bg-[#FAF4E8] text-[#3D2612]"
        }`}
      >
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#16223B] text-amber-300 border border-amber-400/40 px-4 py-2.5 rounded-2xl shadow-xl font-bold text-sm flex items-center gap-2 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        <main className="max-w-[1360px] mx-auto px-3.5 sm:px-6 pt-5 sm:pt-7">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* ══════════════════════════════════════════════════════════
                LEFT SIDEBAR (3 Columns)
                ══════════════════════════════════════════════════════════ */}
            <aside className="lg:col-span-3 space-y-6">
              
              {/* Navigation List */}
              <div className="space-y-1">
                <div className="px-3 pb-2 text-[11px] font-black uppercase tracking-wider text-[#A67C52] dark:text-zinc-500 text-left">
                  SETTINGS
                </div>
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => scrollToSection(item.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-left transition-all duration-200 cursor-pointer ${
                        active
                          ? isDark
                            ? "bg-amber-500/15 border border-amber-500/30 text-amber-300 font-extrabold shadow-2xs"
                            : "bg-[#FFF2D6] border border-[#F2D7A2] text-[#8C4A0E] font-extrabold shadow-2xs"
                          : isDark
                          ? "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
                          : "text-[#6E543D] hover:text-[#3D2612] hover:bg-[#F3E7D3] border border-transparent"
                      }`}
                    >
                      <Icon className={`w-4.5 h-4.5 ${active ? "text-amber-500" : "opacity-75"}`} />
                      <span className="text-[13px]">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Middle Parchment Note with 3 Kids Illustration */}
              <div
                className={`relative rounded-3xl border p-5 shadow-sm text-left transition-colors select-none overflow-hidden ${
                  isDark ? "bg-[#141C2E] border-white/10" : "bg-[#FFFBF0] border-[#E8D8BE]"
                }`}
              >
                {/* Vintage Tape Corners */}
                <div className="absolute -top-2 -left-2 w-10 h-4 bg-[#F2E0B2]/90 dark:bg-[#D4B67A]/50 border border-[#DFC28B] shadow-2xs rotate-[-30deg]" />
                <div className="absolute -top-2 -right-2 w-10 h-4 bg-[#F2E0B2]/90 dark:bg-[#D4B67A]/50 border border-[#DFC28B] shadow-2xs rotate-[30deg]" />

                <div className="space-y-1 pt-1">
                  <p className="text-[12.5px] font-bold text-[#16223B] dark:text-white leading-snug">
                    These settings are saved on{" "}
                    <span className="text-orange-600 dark:text-orange-400 font-extrabold">this device only.</span>
                  </p>
                  <p className="text-[11px] font-medium text-[#7A5E45] dark:text-zinc-400">
                    They won&apos;t sync across devices.
                  </p>
                </div>

                {/* 3 Kids Board Game Illustration */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="w-28 h-20 overflow-hidden">
                    <img
                      src="/gangoffriends.png"
                      alt="Kids playing board game"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  {/* Paper Plane Doodle */}
                  <div className="pr-1 rotate-12">
                    <svg viewBox="0 0 35 30" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-7">
                      <polygon points="0,20 30,0 15,30 12,20" fill="#C85A17" />
                      <polygon points="30,0 12,20 15,30" fill="#E87A38" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Bottom Flight Loop Note */}
              <div className="pt-2 text-left select-none pl-2">
                <svg viewBox="0 0 100 50" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-20 h-10 mb-1">
                  <path
                    d="M 5 40 Q 25 10 55 25 Q 75 35 90 10"
                    stroke="#C85A17"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    strokeLinecap="round"
                  />
                  <g transform="translate(75, 2) rotate(15) scale(0.6)">
                    <polygon points="0,15 25,0 12,25 9,16" fill="#C85A17" />
                    <polygon points="25,0 9,16 12,25" fill="#E87A38" />
                  </g>
                </svg>
                <p className="font-script text-[17px] font-bold text-[#7A4B22] dark:text-amber-300 leading-tight">
                  Play Together.
                </p>
                <p className="font-script text-[17px] font-bold text-[#7A4B22] dark:text-amber-300 leading-tight">
                  Remember Forever. ♡
                </p>
              </div>

            </aside>


            {/* ══════════════════════════════════════════════════════════
                RIGHT CONTENT CONSOLE (9 Columns, 4 Numbered Sections)
                ══════════════════════════════════════════════════════════ */}
            <div className="lg:col-span-9 space-y-5">

              {/* ────────────────────────────────────────────────────────
                  SECTION ❶: PROFILE & ACCOUNT
                  ──────────────────────────────────────────────────────── */}
              <section
                id="profile-account"
                className={`rounded-3xl border p-5 sm:p-6 shadow-[0_4px_20px_rgba(74,44,18,0.04)] text-left transition-colors space-y-4 ${
                  isDark ? "bg-[#101728]/95 border-white/10" : "bg-[#FFFDF8] border-[#ECD9BA]"
                }`}
              >
                {/* Section Heading */}
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#16223B] dark:bg-amber-500 text-white dark:text-slate-950 font-black text-[11px] flex items-center justify-center">
                    1
                  </span>
                  <h2 className="font-bold text-[13.5px] uppercase tracking-wider text-[#16223B] dark:text-white">
                    PROFILE & ACCOUNT
                  </h2>
                </div>

                {/* Top 3 Columns: Profile Info | Account Metadata | Notepad Shield */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  
                  {/* Sub-card 1: Profile (Avatar, Name, ID, Tags) - 4 cols */}
                  <div className="md:col-span-4 flex items-start gap-3">
                    {/* Avatar with Edit Pencil */}
                    <div className="relative flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setAvatarModalOpen(true)}
                        className="w-[72px] h-[72px] rounded-full overflow-hidden border-2 border-emerald-500 bg-[#FAF2DF] dark:bg-amber-900/40 flex items-center justify-center shadow-md cursor-pointer hover:ring-2 hover:ring-amber-400/60 transition group relative"
                        title="Change Avatar"
                      >
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
                      </button>
                      <button
                        type="button"
                        onClick={() => setAvatarModalOpen(true)}
                        title="Change Avatar"
                        className="absolute -bottom-1 -right-1 z-20 w-7 h-7 min-w-[28px] min-h-[28px] rounded-full bg-[#FAF2DF] dark:bg-[#1E293B] border-2 border-[#D4A574] dark:border-amber-400 text-[#8C4A0E] dark:text-amber-300 flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>

                    {/* Inputs & Tags */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div>
                        <span className="block text-[10px] font-bold text-[#7A5E45] dark:text-zinc-400 mb-0.5">
                          Display Name
                        </span>
                        <div className="flex items-center justify-between gap-1.5 px-2.5 py-1 rounded-xl border border-[#ECD9BA] dark:border-white/10 bg-[#FAF4E6] dark:bg-[#141C2E]">
                          <span className="text-[12.5px] font-black text-[#16223B] dark:text-white truncate">
                            {displayName}
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsEditingName(true)}
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold border border-[#ECD9BA] dark:border-white/10 bg-white dark:bg-white/5 hover:border-amber-400 transition cursor-pointer flex-shrink-0"
                          >
                            Edit
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="block text-[10px] font-bold text-[#7A5E45] dark:text-zinc-400 mb-0.5">
                          Profile ID
                        </span>
                        <div className="flex items-center justify-between gap-1.5 px-2.5 py-1 rounded-xl border border-[#ECD9BA] dark:border-white/10 bg-[#FAF4E6] dark:bg-[#141C2E]">
                          <span className="text-[11.5px] font-mono font-bold text-[#6E543D] dark:text-zinc-300">
                            {profileId}
                          </span>
                          <button
                            type="button"
                            onClick={copyProfileId}
                            title="Copy ID"
                            className="p-0.5 hover:text-amber-600 transition cursor-pointer flex-shrink-0"
                          >
                            <Copy className="w-3 h-3 text-zinc-400" />
                          </button>
                        </div>
                      </div>

                      {/* Bio Tags */}
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-[#FAF2DF] dark:bg-white/5 border border-[#ECD9BA] dark:border-white/10 text-[#6E543D] dark:text-zinc-300 whitespace-nowrap">
                          🤠 90s kid
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-[#FAF2DF] dark:bg-white/5 border border-[#ECD9BA] dark:border-white/10 text-[#6E543D] dark:text-zinc-300 whitespace-nowrap">
                          🃏 Rummy Lover
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Sub-card 2: Account Details (5 cols) */}
                  <div className="md:col-span-5 space-y-2 border-l md:border-[#ECD9BA]/60 md:dark:border-white/10 md:pl-5">
                    <div className="grid grid-cols-12 items-center text-xs py-0.5">
                      <span className="col-span-4 font-bold text-[#7A5E45] dark:text-zinc-400 text-[10.5px]">Account ID</span>
                      <span className="col-span-8 font-mono font-bold text-[#16223B] dark:text-white text-[11px] text-right sm:text-left">{accountId}</span>
                    </div>

                    <div className="grid grid-cols-12 items-center text-xs py-0.5">
                      <span className="col-span-4 font-bold text-[#7A5E45] dark:text-zinc-400 text-[10.5px]">Created On</span>
                      <span className="col-span-8 font-medium text-[#16223B] dark:text-white text-[11px] text-right sm:text-left">{createdOn}</span>
                    </div>

                    <div className="grid grid-cols-12 items-center text-xs py-0.5">
                      <span className="col-span-4 font-bold text-[#7A5E45] dark:text-zinc-400 text-[10.5px]">Email Address</span>
                      <div className="col-span-8 flex items-center justify-end sm:justify-start gap-1 min-w-0">
                        <span className="font-mono text-[#6E543D] dark:text-zinc-300 text-[10.5px] truncate">{email}</span>
                        <span className="px-1.5 py-0.5 rounded-full text-[8.5px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 flex-shrink-0">
                          Verified
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-12 items-center text-xs py-0.5">
                      <span className="col-span-4 font-bold text-[#7A5E45] dark:text-zinc-400 text-[10.5px]">Mobile Number</span>
                      <div className="col-span-8 flex items-center justify-end sm:justify-start gap-1 min-w-0">
                        <span className="font-mono text-[#6E543D] dark:text-zinc-300 text-[10.5px]">{phone}</span>
                        <span className="px-1.5 py-0.5 rounded-full text-[8.5px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 flex-shrink-0">
                          Verified
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Sub-card 3: Spiral Notepad with Pencil & Shield (3 cols) */}
                  <div className="md:col-span-3">
                    <div className="relative bg-[#FFFDF8] dark:bg-[#141C2E] border border-[#ECD9BA] dark:border-white/10 rounded-2xl p-3.5 shadow-xs text-center">
                      {/* Top Spiral Wire Rings */}
                      <div className="absolute -top-1.5 inset-x-4 flex justify-between px-1">
                        {[1, 2, 3, 4, 5, 6].map((k) => (
                          <div key={k} className="w-1.5 h-3 bg-zinc-400 rounded-full border border-zinc-600" />
                        ))}
                      </div>

                      {/* Angled Pencil on Top Right */}
                      <div className="absolute -top-3 right-1 w-11 h-2.5 bg-amber-500 rounded-xs border border-amber-700 shadow-2xs rotate-[35deg] flex items-center justify-between px-0.5">
                        <div className="w-1.5 h-full bg-[#FAF2DF]" />
                        <div className="w-1 h-full bg-[#E57373] rounded-xs" />
                      </div>

                      {/* Golden Shield Icon */}
                      <div className="w-7 h-7 mx-auto rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-xs mt-1 mb-1">
                        <span className="text-xs">🛡️</span>
                      </div>

                      <h4 className="font-bold text-[11.5px] text-[#16223B] dark:text-white leading-tight">
                        Your account, your memories.
                      </h4>
                      <p className="text-[9.5px] text-[#7A5E45] dark:text-zinc-400 mt-0.5 leading-snug">
                        Keep your account details up to date and secure.
                      </p>
                    </div>
                  </div>

                </div>

                {/* Bottom Action Row */}
                <div className="pt-2.5 border-t border-[#ECD9BA]/60 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setPasswordModalOpen(true)}
                    className="flex items-center gap-2.5 text-left hover:text-amber-600 transition cursor-pointer"
                  >
                    <Lock className="w-4 h-4 text-[#8C4A0E] dark:text-amber-400" />
                    <div>
                      <div className="text-[12px] font-bold text-[#16223B] dark:text-white">Change Password</div>
                      <div className="text-[10.5px] text-[#7A5E45] dark:text-zinc-400">Update your password regularly</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400 ml-1" />
                  </button>

                  <SecondaryButton
                    size="sm"
                    onClick={() => {
                      signOut();
                      showToast("Signed out successfully.");
                    }}
                    leftIcon={<LogOut className="w-3.5 h-3.5" />}
                  >
                    Sign Out
                  </SecondaryButton>
                </div>
              </section>


              {/* ────────────────────────────────────────────────────────
                  SECTION ❷: SOUND & HAPTICS
                  ──────────────────────────────────────────────────────── */}
              <section
                id="sound-haptics"
                className={`rounded-3xl border p-5 sm:p-6 shadow-[0_4px_20px_rgba(74,44,18,0.04)] text-left transition-colors space-y-4 ${
                  isDark ? "bg-[#101728]/95 border-white/10" : "bg-[#FFFDF8] border-[#ECD9BA]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#16223B] dark:bg-amber-500 text-white dark:text-slate-950 font-black text-[11px] flex items-center justify-center">
                    2
                  </span>
                  <h2 className="font-bold text-[13.5px] uppercase tracking-wider text-[#16223B] dark:text-white">
                    SOUND & HAPTICS
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Column: Volume Controls (6 cols) */}
                  <div className="md:col-span-6 space-y-3.5">
                    {/* Sound Switch */}
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-[12.5px] font-bold text-[#16223B] dark:text-white">Sound</div>
                        <div className="text-[10.5px] text-[#7A5E45] dark:text-zinc-400">Turn all game sounds on or off</div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={!audioSettings.isMuted}
                        onClick={() => {
                          toggleMute();
                          play(AUDIO.UI_TOGGLE);
                        }}
                        className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                          !audioSettings.isMuted ? "bg-orange-600" : "bg-zinc-300 dark:bg-zinc-700"
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-full bg-white shadow-md block absolute top-0.5 transition-transform ${!audioSettings.isMuted ? "left-5.5" : "left-0.5"}`} />
                      </button>
                    </div>

                    {/* Master Volume Slider */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-[#16223B] dark:text-white text-[11.5px]">Master Volume</span>
                          <p className="text-[10px] text-[#7A5E45] dark:text-zinc-400">Overall device volume</p>
                        </div>
                        <span className="font-bold text-xs text-[#16223B] dark:text-white">
                          {Math.round(audioSettings.masterVolume * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round(audioSettings.masterVolume * 100)}
                        disabled={audioSettings.isMuted}
                        onChange={(e) => setMasterVolume(Number(e.target.value) / 100)}
                        className="w-full h-1.5 bg-[#ECD9BA] dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-orange-600"
                      />
                    </div>

                    {/* Music Volume Slider */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-[#16223B] dark:text-white text-[11.5px]">Music Volume</span>
                          <p className="text-[10px] text-[#7A5E45] dark:text-zinc-400">Background music in rooms</p>
                        </div>
                        <span className="font-bold text-xs text-[#16223B] dark:text-white">
                          {Math.round(audioSettings.musicVolume * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round(audioSettings.musicVolume * 100)}
                        disabled={audioSettings.isMuted}
                        onChange={(e) => setMusicVolume(Number(e.target.value) / 100)}
                        className="w-full h-1.5 bg-[#ECD9BA] dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-orange-600"
                      />
                    </div>

                    {/* Effects Volume Slider */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-[#16223B] dark:text-white text-[11.5px]">Effects Volume</span>
                          <p className="text-[10px] text-[#7A5E45] dark:text-zinc-400">Game effects &amp; interactions</p>
                        </div>
                        <span className="font-bold text-xs text-[#16223B] dark:text-white">
                          {Math.round(audioSettings.effectsVolume * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round(audioSettings.effectsVolume * 100)}
                        disabled={audioSettings.isMuted}
                        onChange={(e) => setEffectsVolume(Number(e.target.value) / 100)}
                        className="w-full h-1.5 bg-[#ECD9BA] dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-orange-600"
                      />
                    </div>
                  </div>

                  {/* Right Column: Audio Theme, Vibration, Quote Banner (6 cols) */}
                  <div className="md:col-span-6 space-y-3.5">
                    {/* Audio Theme Dropdown */}
                    <div className="space-y-1">
                      <div className="text-[12.5px] font-bold text-[#16223B] dark:text-white">Audio Theme</div>
                      <div className="text-[10.5px] text-[#7A5E45] dark:text-zinc-400">Choose your favourite sound pack</div>
                      <div className="relative mt-1">
                        <select
                          value={audioSettings.selectedAudioTheme}
                          onChange={(e) => {
                            setAudioTheme(e.target.value as AudioThemeId);
                            play(AUDIO.UI_CLICK);
                            showToast(`Theme: ${THEMES.find(th => th.id === e.target.value)?.name}`);
                          }}
                          className="w-full px-3.5 py-2 rounded-xl border border-[#ECD9BA] dark:border-white/10 bg-[#FAF4E6] dark:bg-[#141C2E] text-xs font-bold text-[#16223B] dark:text-white appearance-none cursor-pointer focus:outline-none"
                        >
                          {THEMES.map((themeItem) => (
                            <option key={themeItem.id} value={themeItem.id}>
                              🪗 {themeItem.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-2.5 pointer-events-none" />
                      </div>
                    </div>

                    {/* Vibration Switch */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div>
                        <div className="text-[12.5px] font-bold text-[#16223B] dark:text-white">Vibration</div>
                        <div className="text-[10.5px] text-[#7A5E45] dark:text-zinc-400">Vibrate on actions &amp; game events</div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={haptics.enabled}
                        disabled={!haptics.supported}
                        onClick={() => {
                          haptics.toggle();
                          if (!haptics.enabled) haptics.subtle();
                        }}
                        className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                          haptics.enabled ? "bg-orange-600" : "bg-zinc-300 dark:bg-zinc-700"
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-full bg-white shadow-md block absolute top-0.5 transition-transform ${haptics.enabled ? "left-5.5" : "left-0.5"}`} />
                      </button>
                    </div>

                    {/* Audio Quote Banner with Headphones & Airplane */}
                    <div className="p-3.5 rounded-2xl border border-[#ECD9BA] dark:border-white/10 bg-[#FFFDF8] dark:bg-[#141C2E] flex items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <Headphones className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-[12px] font-bold text-[#16223B] dark:text-white">
                            Sound makes every win sweeter!
                          </div>
                          <div className="text-[10px] text-[#7A5E45] dark:text-zinc-400">
                            Use volumes to set the perfect mood for your games.
                          </div>
                        </div>
                      </div>
                      <div className="rotate-12 flex-shrink-0">
                        <svg viewBox="0 0 35 30" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-5">
                          <polygon points="0,20 30,0 15,30 12,20" fill="#C85A17" />
                          <polygon points="30,0 12,20 15,30" fill="#E87A38" />
                        </svg>
                      </div>
                    </div>
                  </div>

                </div>
              </section>


              {/* ────────────────────────────────────────────────────────
                  SECTION ❸: APPEARANCE & LANGUAGE
                  ──────────────────────────────────────────────────────── */}
              <section
                id="appearance-language"
                className={`rounded-3xl border p-5 sm:p-6 shadow-[0_4px_20px_rgba(74,44,18,0.04)] text-left transition-colors space-y-4 ${
                  isDark ? "bg-[#101728]/95 border-white/10" : "bg-[#FFFDF8] border-[#ECD9BA]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#16223B] dark:bg-amber-500 text-white dark:text-slate-950 font-black text-[11px] flex items-center justify-center">
                    3
                  </span>
                  <h2 className="font-bold text-[13.5px] uppercase tracking-wider text-[#16223B] dark:text-white">
                    APPEARANCE & LANGUAGE
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Column: Theme Picker (6 cols) */}
                  <div className="md:col-span-6 space-y-1.5">
                    <div className="text-[12.5px] font-bold text-[#16223B] dark:text-white">Theme</div>
                    <div className="text-[10.5px] text-[#7A5E45] dark:text-zinc-400">Choose your preferred look</div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      {/* Light Mode Card */}
                      <button
                        type="button"
                        onClick={() => {
                          if (isDark) toggleTheme();
                          showToast("☀️ Switched to Light Mode");
                        }}
                        className={`relative p-3 rounded-2xl border-2 text-left transition-all cursor-pointer overflow-hidden ${
                          !isDark
                            ? "border-orange-500 bg-[#FFF7E8] shadow-md scale-[1.02]"
                            : "border-zinc-700 bg-white/5 hover:border-zinc-500"
                        }`}
                      >
                        {!isDark && (
                          <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-black shadow-xs">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-base">☀️</span>
                          <span className="font-bold text-xs text-[#16223B] dark:text-white">Light Mode</span>
                        </div>
                        <div className="h-10 rounded-xl bg-gradient-to-t from-[#F5DEB3] to-[#FFF9E6] border border-[#ECD9BA] flex items-end justify-center pb-1">
                          <div className="w-8 h-4 rounded-t-full bg-amber-400/80" />
                        </div>
                      </button>

                      {/* Dark Mode Card */}
                      <button
                        type="button"
                        onClick={() => {
                          if (!isDark) toggleTheme();
                          showToast("🌙 Switched to Dark Mode");
                        }}
                        className={`relative p-3 rounded-2xl border-2 text-left transition-all cursor-pointer overflow-hidden ${
                          isDark
                            ? "border-amber-400 bg-[#141D30] shadow-md scale-[1.02]"
                            : "border-[#ECD9BA] bg-[#FAF4E6] hover:border-amber-400/50"
                        }`}
                      >
                        {isDark && (
                          <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[10px] font-black shadow-xs">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-base">🌙</span>
                          <span className="font-bold text-xs text-[#16223B] dark:text-white">Dark Mode</span>
                        </div>
                        <div className="h-10 rounded-xl bg-gradient-to-t from-[#0A0F1D] to-[#1E293B] border border-white/10 flex items-center justify-center">
                          <div className="w-4 h-4 rounded-full border-2 border-amber-300 border-t-transparent -rotate-45" />
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Language Selector & Community Banner (6 cols) */}
                  <div className="md:col-span-6 space-y-3.5">
                    <div className="space-y-1">
                      <div className="text-[12.5px] font-bold text-[#16223B] dark:text-white">Language</div>
                      <div className="text-[10.5px] text-[#7A5E45] dark:text-zinc-400">Change the language of the app</div>
                      <div className="relative mt-1">
                        <select
                          value={locale}
                          onChange={(e) => {
                            setLocale(e.target.value as any);
                            showToast(`Language set to ${e.target.value}`);
                          }}
                          className="w-full px-3.5 py-2 rounded-xl border border-[#ECD9BA] dark:border-white/10 bg-[#FAF4E6] dark:bg-[#141C2E] text-xs font-bold text-[#16223B] dark:text-white appearance-none cursor-pointer focus:outline-none"
                        >
                          <option value="en">🇮🇳 English (India)</option>
                          <option value="te">🇮🇳 తెలుగు (Telugu)</option>
                          <option value="hi">🇮🇳 हिन्दी (Hindi)</option>
                          <option value="ta">🇮🇳 தமிழ் (Tamil)</option>
                          <option value="kn">🇮🇳 ಕನ್ನಡ (Kannada)</option>
                          <option value="mr">🇮🇳 मराठी (Marathi)</option>
                          <option value="bn">🇮🇳 বাংলা (Bengali)</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-2.5 pointer-events-none" />
                      </div>
                    </div>

                    {/* Community Banner */}
                    <div className="p-3.5 rounded-2xl border border-[#ECD9BA] dark:border-white/10 bg-[#FFFDF8] dark:bg-[#141C2E] flex items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <Globe className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-[12px] font-bold text-[#16223B] dark:text-white">
                            More languages coming soon!
                          </div>
                          <div className="text-[10px] text-[#7A5E45] dark:text-zinc-400">
                            Bhalyam will grow with our community.
                          </div>
                        </div>
                      </div>
                      <div className="rotate-12 flex-shrink-0">
                        <svg viewBox="0 0 35 30" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-5">
                          <polygon points="0,20 30,0 15,30 12,20" fill="#C85A17" />
                          <polygon points="30,0 12,20 15,30" fill="#E87A38" />
                        </svg>
                      </div>
                    </div>
                  </div>

                </div>
              </section>


              {/* ────────────────────────────────────────────────────────
                  SECTION ❹: YOUR DATA
                  ──────────────────────────────────────────────────────── */}
              <section
                id="your-data"
                className={`rounded-3xl border p-5 sm:p-6 shadow-[0_4px_20px_rgba(74,44,18,0.04)] text-left transition-colors space-y-4 ${
                  isDark ? "bg-[#101728]/95 border-white/10" : "bg-[#FFFDF8] border-[#ECD9BA]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#16223B] dark:bg-amber-500 text-white dark:text-slate-950 font-black text-[11px] flex items-center justify-center">
                    4
                  </span>
                  <h2 className="font-bold text-[13.5px] uppercase tracking-wider text-[#16223B] dark:text-white">
                    YOUR DATA
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  
                  {/* Left Column: Data Actions (6 cols) */}
                  <div className="md:col-span-6 space-y-2.5">
                    {/* Download My Data */}
                    <button
                      type="button"
                      onClick={handleDownloadData}
                      className="w-full p-3 rounded-2xl border border-[#ECD9BA]/60 dark:border-white/10 bg-[#FAF4E6] dark:bg-[#141C2E] flex items-center justify-between gap-2 hover:border-amber-400 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Download className="w-4 h-4 text-[#8C4A0E] dark:text-amber-400" />
                        <div className="text-left">
                          <div className="text-[12px] font-bold text-[#16223B] dark:text-white">Download My Data</div>
                          <div className="text-[10px] text-[#7A5E45] dark:text-zinc-400">Get a copy of your data and activity</div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    </button>

                    {/* Erase Everything */}
                    <button
                      type="button"
                      onClick={() => setEraseModalOpen(true)}
                      className="w-full p-3 rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-[#FFF9F9] dark:bg-[#1A1118] flex items-center justify-between gap-2 hover:border-rose-400 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Trash2 className="w-4 h-4 text-rose-600" />
                        <div className="text-left">
                          <div className="text-[12px] font-bold text-rose-600 dark:text-rose-400">Erase Everything</div>
                          <div className="text-[10px] text-[#7A5E45] dark:text-zinc-400">Delete all data from this device</div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    </button>
                  </div>

                  {/* Right Column: Data Policy Note (6 cols) */}
                  <div className="md:col-span-6">
                    <div className="p-3.5 rounded-2xl border border-[#ECD9BA] dark:border-white/10 bg-[#FAF4E6] dark:bg-[#141C2E] flex items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Database className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <div className="text-[12.5px] font-bold text-[#16223B] dark:text-white">
                            Your data, your choice.
                          </div>
                          <div className="text-[10.5px] text-[#7A5E45] dark:text-zinc-400 leading-snug mt-0.5">
                            You can download or delete your data anytime. We keep it simple and transparent.
                          </div>
                        </div>
                      </div>
                      <div className="rotate-12 flex-shrink-0">
                        <svg viewBox="0 0 35 30" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-5">
                          <polygon points="0,20 30,0 15,30 12,20" fill="#C85A17" />
                          <polygon points="30,0 12,20 15,30" fill="#E87A38" />
                        </svg>
                      </div>
                    </div>
                  </div>

                </div>
              </section>

            </div>

          </div>
        </main>

        {/* ── Avatar Picker Modal ──────────────────────────────
            Backdrop click and Escape both close it. Neither used to: the
            only way out was the one small button in the corner, which on a
            phone is the hardest target on the screen. `role="dialog"` and
            `aria-modal` are what make a screen reader treat this as a layer
            over the page rather than more page. */}
        {avatarModalOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setAvatarModalOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="avatar-modal-title"
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-md rounded-3xl border p-5 sm:p-6 shadow-2xl space-y-4 text-left ${
                isDark ? "bg-[#131926] border-[#2A3346]" : "bg-[#FFFDF8] border-[#E4D4B4]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3
                    id="avatar-modal-title"
                    className="font-bold text-[17px] text-[#2A221B] dark:text-[#F1F5F9]"
                  >
                    Choose your avatar
                  </h3>
                  <p className="text-[12.5px] text-[#6B5340] dark:text-[#9FB0C6] mt-0.5">
                    Saved as soon as you pick one.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAvatarModalOpen(false)}
                  aria-label="Close"
                  className="flex-shrink-0 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full border flex items-center justify-center cursor-pointer
                             border-[#A17C4E] text-[#6B5340] hover:bg-[#F2E4CB] hover:text-[#2A221B]
                             dark:border-[#66799A] dark:text-[#9FB0C6] dark:hover:bg-[#27324A] dark:hover:text-[#F1F5F9]
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C2410C] dark:focus-visible:ring-[#FBBF24]
                             transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <AvatarPicker
                value={avatarId}
                onChange={(id) => {
                  setAvatarId(id);
                  setAvatarModalOpen(false);
                  showToast(id ? "Avatar updated" : "Avatar removed");
                }}
              />
            </div>
          </div>
        )}

        {/* ── Edit Display Name Modal ───────────────────────── */}
        {isEditingName && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div
              className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl space-y-4 text-left ${
                isDark ? "bg-[#101728] border-white/15" : "bg-[#FFFDF8] border-[#ECD9BA]"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[16px] text-[#16223B] dark:text-white">Edit Display Name</h3>
                <button
                  type="button"
                  onClick={() => setIsEditingName(false)}
                  className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-sm font-black cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveName} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#7A5E45] dark:text-zinc-400 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-sm font-bold border border-amber-500 bg-white dark:bg-[#141D30] text-[#16223B] dark:text-white focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md transition cursor-pointer"
                >
                  Save Name
                </button>
              </form>
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

        {/* ── Erase Everything Confirmation Modal ───────────── */}
        {eraseModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div
              className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl space-y-4 text-left ${
                isDark ? "bg-[#101728] border-rose-500/30" : "bg-[#FFFDF8] border-rose-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[16px] text-rose-600">Erase All Data</h3>
                <button
                  type="button"
                  onClick={() => setEraseModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-sm font-black cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-[#7A5E45] dark:text-zinc-400">
                Are you sure you want to erase all your local data from this device? This will clear your saved settings, local rooms, and login preferences.
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEraseModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-[#ECD9BA] text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEraseAllData}
                  className="flex-1 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-md cursor-pointer hover:bg-rose-700 transition"
                >
                  Erase Data
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
