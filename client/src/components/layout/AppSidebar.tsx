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

  const NAV_ITEMS = [
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
    { label: "Settings", icon: SettingsIcon, action: onOpenSettings, active: false },
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
        </nav>
      </div>
    </aside>
  );
}
