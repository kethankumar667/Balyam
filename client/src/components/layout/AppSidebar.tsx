import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Gamepad2,
  Users,
  Award,
  HelpCircle,
  Settings as SettingsIcon,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";

/**
 * The side nav.
 *
 * ── Five items were removed, not restyled ─────────────────────────────
 * Friends, Adda Feed, Leaderboard, Store and Events all called
 * `navigate("/games")`: five of eleven labels led somewhere unrelated to
 * what they said, and Adda Feed carried a hardcoded "12" for a feed that
 * does not exist. Five broken promises in a first session is a trust
 * problem, not a polish problem. They come back when the features do —
 * which is the rule BhalyamHome.tsx already states for the home page.
 *
 * The remaining list is short enough to scan without grouping, which is
 * why the `NavGroup` type that used to sit here is gone too: it was
 * declared for eleven items, never used, and six do not need it.
 *
 * ── The active item is not signalled by fill ──────────────────────────
 * It used to be: a #FFF2D6 pill on #FFFDF7 cream, 1.09:1, with the only
 * real cue a 1.23:1 shift in label colour. Invisible to low vision, to
 * most colour-vision deficiencies, and to every screen reader — while
 * "where am I" is the whole job of a persistent rail.
 *
 * Cream on cream cannot reach 3:1; that is the material, not a bug. So
 * state is carried by a saturated 4px rail bar (4.67:1 light, 11.2:1
 * dark) plus `aria-current`, and the fill stays as reinforcement rather
 * than as the signal.
 */

interface AppSidebarProps {
  onOpenJoin?: () => void;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
  onCloseMobile?: () => void;
}

interface NavItem {
  label: string;
  icon: typeof Home;
  path?: string;
  action?: () => void;
  active: boolean;
}

export default function AppSidebar({
  onOpenJoin,
  onOpenProfile,
  onCloseMobile,
}: AppSidebarProps) {
  const { pathname } = useLocation();
  const { isMember } = useAuthStore();

  const NAV_ITEMS: NavItem[] = [
    { label: "Home", icon: Home, path: "/", active: pathname === "/" || pathname === "/home" },
    { label: "Games", icon: Gamepad2, path: "/games", active: pathname.startsWith("/games") },
    { label: "Rooms", icon: Users, action: onOpenJoin, active: false },
    { label: "Achievements", icon: Award, action: onOpenProfile, active: false },
    { label: "Help Center", icon: HelpCircle, path: "/about", active: pathname === "/about" },
    ...(isMember
      ? [
          {
            label: "Settings",
            icon: SettingsIcon,
            path: "/settings",
            active: pathname === "/settings",
          },
        ]
      : []),
  ];

  return (
    <aside
      aria-label="Main"
      className="w-64 h-full overflow-y-auto flex-shrink-0 p-3.5 flex flex-col justify-between
                 border-r border-[var(--chrome-hairline)] bg-[var(--chrome-panel)]
                 text-[var(--chrome-ink)] transition-colors select-none"
    >
      <div className="space-y-4">
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const content = (
              <div
                className={`relative w-full flex items-center gap-3 pl-4 pr-3.5 min-h-[44px] rounded-2xl
                            font-bold text-[13.5px] transition-all cursor-pointer ${
                              item.active
                                ? "bg-[var(--chrome-active-bg)] text-[var(--chrome-active-ink)] font-extrabold"
                                : "text-[var(--chrome-ink-soft)] hover:text-[var(--chrome-ink)] hover:bg-[var(--chrome-control)]"
                            }`}
              >
                {/* The state signal. A shape, at 3:1+, that survives greyscale
                    and does not depend on the fill being distinguishable. */}
                {item.active && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-[var(--chrome-accent)]"
                  />
                )}
                <Icon
                  className={`w-5 h-5 flex-shrink-0 ${
                    item.active ? "text-[var(--chrome-accent)]" : ""
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
            );

            if (item.path) {
              return (
                <Link
                  key={item.label}
                  to={item.path}
                  onClick={onCloseMobile}
                  aria-current={item.active ? "page" : undefined}
                  className="block rounded-2xl"
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
                className="w-full text-left block rounded-2xl"
              >
                {content}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Pinned kraft note. */}
      <div className="mt-4 pt-2">
        <div className="relative p-3.5 rounded-2xl border border-[var(--chrome-border)] bg-[var(--chrome-control)] text-center transition-all shadow-sm select-none">
          {/* Washi tape. Was #F2E0B2/90 at 1.25:1 against the note — a
              decoration only visible in one theme. Now drawn from the same
              border token that carries the note's own edge. */}
          <div className="absolute -top-2 left-2 w-9 h-3.5 bg-[var(--chrome-active-bg)] border-y border-[var(--chrome-border)] shadow-sm rotate-[-8deg]" />
          <div className="absolute -top-2 right-2 w-9 h-3.5 bg-[var(--chrome-active-bg)] border-y border-[var(--chrome-border)] shadow-sm rotate-[8deg]" />

          <p className="font-script text-[17px] font-bold text-[var(--chrome-accent)] leading-tight">
            Play Together.
          </p>
          <p className="font-script text-[17px] font-bold text-[var(--chrome-accent)] leading-tight">
            Remember
          </p>
          <p className="font-script text-[17px] font-bold text-[var(--chrome-accent)] leading-tight">
            Forever.
          </p>
          <p className="font-script text-[15px] font-bold text-[var(--chrome-accent)]" aria-hidden>
            ♡
          </p>

          {/* Dotted flight loop. `currentColor` rather than the hardcoded
              #C85A17 it used to carry — that value had no theme branch at
              all and survived on luck, one darkening away from vanishing. */}
          <div className="flex justify-center mt-1 text-[var(--chrome-accent)]">
            <svg
              viewBox="0 0 70 25"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-16 h-6"
              aria-hidden
            >
              <path
                d="M 2 18 Q 25 2 45 15 Q 55 22 65 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <g transform="translate(54, 2) rotate(15) scale(0.65)">
                <polygon points="0,15 25,0 12,25 9,16" fill="currentColor" />
                <polygon points="25,0 9,16 12,25" fill="currentColor" opacity="0.7" />
              </g>
            </svg>
          </div>
        </div>
      </div>
    </aside>
  );
}
