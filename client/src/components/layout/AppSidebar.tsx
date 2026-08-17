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

  const NAV_ITEMS: NavItem[] = [
    { label: "Home", icon: Home, path: "/", active: pathname === "/" || pathname === "/home" },
    { label: "Games", icon: Gamepad2, path: "/games", active: pathname.startsWith("/games") },
    { label: "Rooms", icon: Users, action: onOpenJoin, active: false },
    { label: "Friends", icon: MessageCircle, action: () => navigate("/games"), active: false },
    { label: "Adda Feed", icon: Radio, badge: "12", action: () => navigate("/games"), active: false },
    { label: "Leaderboard", icon: Trophy, action: () => navigate("/games"), active: false },
    { label: "Achievements", icon: Award, action: onOpenProfile, active: false },
    { label: "Store", icon: ShoppingBag, action: () => navigate("/games"), active: false },
    { label: "Events", icon: Calendar, action: () => navigate("/games"), active: false },
    { label: "Help Center", icon: HelpCircle, path: "/about", active: pathname === "/about" },
    { label: "Settings", icon: SettingsIcon, path: "/settings", active: pathname === "/settings" },
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
        {/* Navigation List */}
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const content = (
              <div
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-bold text-[13.5px] transition-all cursor-pointer ${
                  item.active
                    ? isDark
                      ? "bg-amber-500/15 text-amber-300 font-extrabold shadow-2xs border border-amber-500/30"
                      : "bg-[#FFF2D6] text-[#B45309] font-extrabold shadow-2xs border border-[#F5DEB3]"
                    : isDark
                    ? "text-zinc-400 hover:text-white hover:bg-white/5"
                    : "text-[#7A5B3E] hover:text-[#3D2005] hover:bg-[#FAF2DF]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${item.active ? "text-amber-500" : "opacity-80"}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-black bg-rose-500 text-white leading-none">
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
                  item.action?.();
                  onCloseMobile?.();
                }}
                className="w-full text-left block"
              >
                {content}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Play Together Pinned Kraft Note (Bottom of Sidebar) */}
      <div className="mt-4 pt-2">
        <div
          className={`relative p-3.5 rounded-2xl border text-center transition-all shadow-xs select-none ${
            isDark
              ? "bg-[#121A2D] border-white/10 text-white"
              : "bg-[#FFFDF4] border-[#E8D8BE] text-[#3D2005]"
          }`}
        >
          {/* Dual corner Washi Tape */}
          <div className="absolute -top-2 left-2 w-9 h-3.5 bg-[#F2E0B2]/90 dark:bg-[#D4B67A]/60 border-y border-[#DFC28B]/80 shadow-2xs rotate-[-8deg]" />
          <div className="absolute -top-2 right-2 w-9 h-3.5 bg-[#F2E0B2]/90 dark:bg-[#D4B67A]/60 border-y border-[#DFC28B]/80 shadow-2xs rotate-[8deg]" />

          <p className="font-script text-[17px] font-bold text-[#8C4A0E] dark:text-amber-300 leading-tight">
            Play Together.
          </p>
          <p className="font-script text-[17px] font-bold text-[#8C4A0E] dark:text-amber-300 leading-tight">
            Remember
          </p>
          <p className="font-script text-[17px] font-bold text-[#8C4A0E] dark:text-amber-300 leading-tight">
            Forever.
          </p>
          <p className="font-script text-[15px] font-bold text-[#8C4A0E] dark:text-amber-300">
            ♡
          </p>

          {/* Dotted flight loop with plane */}
          <div className="flex justify-center mt-1">
            <svg viewBox="0 0 70 25" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-16 h-6">
              <path d="M 2 18 Q 25 2 45 15 Q 55 22 65 5" stroke="#C85A17" strokeWidth="1.5" strokeDasharray="3 3" />
              <g transform="translate(54, 2) rotate(15) scale(0.65)">
                <polygon points="0,15 25,0 12,25 9,16" fill="#C85A17" />
                <polygon points="25,0 9,16 12,25" fill="#E87A38" />
              </g>
            </svg>
          </div>
        </div>
      </div>
    </aside>
  );
}
