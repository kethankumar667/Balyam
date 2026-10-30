import type { ComponentType } from "react";
import { Link, useLocation } from "react-router-dom";
import { DoorOpen, Gamepad2, Home, User, Users } from "lucide-react";

/**
 * The phone's primary navigation: five thumb-reach slots along the bottom edge.
 *
 * Below `lg` the side rail is gone and the hamburger drawer is two taps away, so the places a player
 * actually bounces between live here instead. The centre slot is the product's own verb — walking into
 * a friend's room with a code — raised and gold, the way a game puts its "Play" button.
 *
 * Not drawn over a live board: `AppLayout` only mounts it while the global chrome is on.
 */

export type TabId = "home" | "games" | "mandali" | "you";

interface TabLink {
  id: TabId;
  label: string;
  to: string;
  icon: ComponentType<{ className?: string; strokeWidth?: string | number }>;
}

const LEFT_TABS: readonly TabLink[] = [
  { id: "home", label: "Home", to: "/", icon: Home },
  { id: "games", label: "Games", to: "/games", icon: Gamepad2 },
];

const RIGHT_TABS: readonly TabLink[] = [
  { id: "mandali", label: "Mandali", to: "/mandali", icon: Users },
  { id: "you", label: "You", to: "/profile", icon: User },
];

/** Which tab a path belongs to, so a sub-page keeps its parent lit. */
export function activeTabId(pathname: string): TabId | null {
  if (pathname === "/" || pathname === "/home") return "home";
  if (/^\/(games|favorites|recently-played)(\/|$)/.test(pathname)) return "games";
  if (/^\/(mandali|social)(\/|$)/.test(pathname)) return "mandali";
  if (/^\/(profile|myrecords|referrals)(\/|$)/.test(pathname)) return "you";
  return null;
}

function Tab({ tab, active }: { tab: TabLink; active: boolean }) {
  const Icon = tab.icon;
  return (
    <li className="relative">
      <Link
        to={tab.to}
        aria-current={active ? "page" : undefined}
        className={`relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] leading-none transition-colors short-land:min-h-[44px] short-land:flex-row short-land:gap-2 ${
          active ? "font-extrabold text-[var(--chrome-accent)]" : "font-bold text-[var(--chrome-ink-soft)]"
        }`}
      >
        {active && (
          <span aria-hidden="true" className="absolute top-0 h-[3px] w-9 rounded-b-full bg-[var(--chrome-accent)]" />
        )}
        <Icon className="h-6 w-6" strokeWidth={active ? 2.6 : 2} />
        <span>{tab.label}</span>
      </Link>
    </li>
  );
}

export default function MobileTabBar({ onOpenJoin }: { onOpenJoin: () => void }) {
  const { pathname } = useLocation();
  const active = activeTabId(pathname);

  return (
    <nav
      aria-label="Primary"
      // Hidden while a text field is focused: with the keyboard up the bar would sit on top of it.
      className="relative z-30 flex-shrink-0 border-t border-[var(--chrome-hairline)] bg-[var(--chrome-panel)] pb-safe lg:hidden [body:has(input:focus,textarea:focus)_&]:hidden"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-5 items-end px-1">
        {LEFT_TABS.map((tab) => (
          <Tab key={tab.id} tab={tab} active={active === tab.id} />
        ))}

        <li className="flex justify-center">
          <button
            type="button"
            onClick={onOpenJoin}
            aria-label="Join a room with a code"
            className="-mt-5 flex min-h-[56px] flex-col items-center justify-end gap-1 pb-1 text-[11px] font-extrabold leading-none text-[var(--chrome-ink)] short-land:mt-0 short-land:min-h-[44px] short-land:flex-row short-land:items-center short-land:gap-2 short-land:pb-0"
          >
            <span
              aria-hidden="true"
              className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-b from-[#F6D36B] to-[#E4B128] text-[#4A2C16] shadow-[0_8px_20px_rgba(228,177,40,0.45),inset_0_1px_0_rgba(255,255,255,0.6)] ring-4 ring-[var(--chrome-panel)] short-land:h-9 short-land:w-9 short-land:ring-0"
            >
              <DoorOpen className="h-7 w-7 short-land:h-5 short-land:w-5" strokeWidth={2.4} />
            </span>
            <span>Join</span>
          </button>
        </li>

        {RIGHT_TABS.map((tab) => (
          <Tab key={tab.id} tab={tab} active={active === tab.id} />
        ))}
      </ul>
    </nav>
  );
}
