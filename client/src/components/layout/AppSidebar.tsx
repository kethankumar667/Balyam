import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Gamepad2,
  Users,
  MessageCircle,
  Radio,
  Trophy,
  Award,
  ShoppingBag,
  Calendar,
  HelpCircle,
  Settings as SettingsIcon,
} from "lucide-react";
import { useTheme } from "../../lib/useTheme";

interface AppSidebarProps {
  onOpenJoin?: () => void;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
  onCloseMobile?: () => void;
}

interface NavItem {
  label: string;
  icon: any;
  path?: string;
  action?: () => void;
  active: boolean;
  badge?: string;
}

interface NavGroup {
  category: string;
  items: NavItem[];
}

export default function AppSidebar({
  onOpenJoin,
  onOpenProfile,
  onOpenSettings,
  onCloseMobile,
}: AppSidebarProps) {
  const [theme] = useTheme();
  const isDark = theme === "dark";
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const NAV_GROUPS: NavGroup[] = [
    {
      category: "PLAY",
      items: [
        { label: "Home", icon: Home, path: "/", active: pathname === "/" || pathname === "/home" },
        { label: "Games", icon: Gamepad2, path: "/games", active: pathname.startsWith("/games") },
        { label: "Rooms", icon: Users, action: onOpenJoin, active: false },
      ],
    },
    {
      category: "SOCIAL",
      items: [
        { label: "Friends", icon: MessageCircle, action: () => navigate("/games"), active: false },
        { label: "Adda Feed", icon: Radio, badge: "12", action: () => navigate("/games"), active: false },
      ],
    },
    {
      category: "COMPETE",
      items: [
        { label: "Leaderboard", icon: Trophy, action: () => navigate("/games"), active: false },
        { label: "Achievements", icon: Award, action: onOpenProfile, active: false },
      ],
    },
    {
      category: "DISCOVER",
      items: [
        { label: "Store", icon: ShoppingBag, action: () => navigate("/games"), active: false },
        { label: "Events", icon: Calendar, action: () => navigate("/games"), active: false },
      ],
    },
    {
      category: "SUPPORT",
      items: [
        { label: "About Us", icon: HelpCircle, path: "/about", active: pathname === "/about" },
        { label: "Settings", icon: SettingsIcon, path: "/settings", active: pathname === "/settings" },
      ],
    },
  ];

  return (
    <aside
      className={`w-64 h-full overflow-y-auto flex-shrink-0 p-3.5 flex flex-col justify-between border-r transition-colors select-none ${
        isDark
          ? "bg-[#0A0F1D] border-white/10 text-white"
          : "bg-[#FFFDF7] border-[#ECD9BA] text-[#3D2005]"
      }`}
    >
      <div className="space-y-4">
        {/* Navigation Grouped Lists */}
        <nav className="space-y-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.category} className="space-y-1">
              <span className="px-3 text-[10px] font-black uppercase tracking-wider text-[#9C7E63] dark:text-zinc-500 block">
                {group.category}
              </span>
              {group.items.map((item) => {
                const Icon = item.icon;
                const content = (
                  <div
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-bold text-[13px] transition-all cursor-pointer ${
                      item.active
                        ? isDark
                          ? "bg-amber-500/15 text-amber-300 font-extrabold shadow-2xs border border-amber-500/30"
                          : "bg-[#FFF2D6] text-[#B45309] font-extrabold shadow-2xs border border-[#F5DEB3]"
                        : isDark
                        ? "text-zinc-400 hover:text-white hover:bg-white/5"
                        : "text-[#7A5B3E] hover:text-[#3D2005] hover:bg-[#FAF2DF]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4.5 h-4.5 ${item.active ? "text-amber-500" : "opacity-80"}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white leading-none">
                        {item.badge}
                      </span>
                    )}
                  </div>
                );

                if (item.path) {
                  return (
                    <Link
                      key={item.label}
                      to={item.path}
                      onClick={onCloseMobile}
                      className="block"
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      if (item.action) item.action();
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className="w-full text-left"
                  >
                    {content}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Invite Friends & Play Together Pinned Card (Bottom of Sidebar) */}
      <div className="mt-4 pt-2 space-y-3">
        {/* Invite Friends Card */}
        <div
          className={`relative p-3 rounded-2xl border text-center transition-all shadow-xs ${
            isDark
              ? "bg-[#121A2D] border-white/10 text-white"
              : "bg-[#FFFDF4] border-[#E8D8BE] text-[#3D2005]"
          }`}
        >
          {/* Top Tape */}
          <div className="absolute -top-2 left-4 w-10 h-3.5 bg-[#F2E0B2]/85 dark:bg-[#D4B67A]/60 border-y border-[#DFC28B]/80 shadow-2xs rotate-[-6deg]" />

          <h5 className="font-display font-black text-[13.5px] text-[#16223B] dark:text-white leading-tight">
            Invite Friends
          </h5>
          <p className="text-[11px] text-[#7A5E45] dark:text-zinc-400 mt-0.5 mb-2">
            Play together, earn rewards!
          </p>

          {/* 3 Kids Drawing Image */}
          <div className="w-full h-16 rounded-xl overflow-hidden mb-2 bg-[#FAF3E0] dark:bg-[#18233C] border border-[#ECD9BA]/60 flex items-center justify-center">
            <img
              src="/gangoffriends.png"
              alt="Invite Friends"
              className="w-full h-full object-contain p-1"
              onError={(e) => {
                e.currentTarget.src = "/about_carrom_kids.jpg";
              }}
            />
          </div>

          {/* Invite Now Button */}
          <button
            type="button"
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: "BHALYAM 90s Lounge",
                  text: "Come play retro games on BHALYAM!",
                  url: window.location.origin,
                }).catch(() => {});
              } else {
                navigator.clipboard?.writeText(window.location.origin);
                alert("Invite link copied to clipboard!");
              }
            }}
            className="w-full py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-[11.5px] shadow-sm flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer"
          >
            <span>Invite Now</span>
            <span>➔</span>
          </button>
        </div>

        {/* Play Together Slogan */}
        <div className="text-center select-none py-1">
          <p className="font-script text-[14px] font-bold text-[#8C4A0E] dark:text-amber-300 leading-tight">
            Play Together.
          </p>
          <p className="font-script text-[14px] font-bold text-[#8C4A0E] dark:text-amber-300 leading-tight">
            Remember Forever. ♡
          </p>
          {/* Dotted flight loop with plane */}
          <div className="flex justify-center mt-1 opacity-75">
            <svg viewBox="0 0 60 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-14 h-5">
              <path d="M 2 15 Q 20 2 35 12 Q 45 18 55 5" stroke="#C85A17" strokeWidth="1.2" strokeDasharray="2 2" />
              <polygon points="50,2 58,4 53,9" fill="#C85A17" />
            </svg>
          </div>
        </div>
      </div>
    </aside>
  );
}
