import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DoorOpen,
  Clock,
  Heart,
  HelpCircle,
  Moon,
  Sun,
  Sliders,
  Info,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import BhalyamLogo from "../../../components/bhalyam/BhalyamLogo";
import { useTheme } from "../../../lib/useTheme";
import GlobalSettings from "../../../components/GlobalSettings";
import { useAuthStore, useIdentityPresentation } from "../../../store/authStore";
import { SheetShell, SheetAction } from "./SheetShell";

/**
 * Menu sheet — navigation only. Join Room, How to Play, theme toggle,
 * About, Sign out.
 */
export function MenuSheet({
  open,
  onClose,
  onOpenJoin,
}: {
  open: boolean;
  onClose: () => void;
  onOpenJoin: () => void;
}) {
  const navigate = useNavigate();
  const [theme, toggleTheme] = useTheme();
  const [showSettings, setShowSettings] = useState(false);
  const identity = useIdentityPresentation();
  // "Has some kind of signed-in identity, so Sign out is the right action" —
  // true for a verified member AND for local fallback (a local-flag "member"
  // with no verified backend session), false only for a genuine guest.
  // `isMember` alone used to gate this; narrowing it to "verified member
  // only" (for capability/wallet purposes) silently sent a local-fallback
  // session to "Sign in" here, with no way to find "Sign out" at all.
  const signedIn = identity.mode !== "guest";
  const email = useAuthStore((s) => s.email);
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <SheetShell
      open={open}
      onClose={onClose}
      ariaLabel="BHALYAM menu"
      titleLeft={
        <>
          <BhalyamLogo size={32} decorative />
          <span className="bhalyam-display text-[20px] text-[#2A221B] tracking-tight">
            Menu
          </span>
        </>
      }
    >
      {/*
        A "132 players online right now / Most are on Hand Cricket and
        Snakes & Ladders" presence card used to sit here — a static literal
        with a pulsing green dot, same fabricated-telemetry pattern as the
        removed LiveLoungePulse section (TRUST-REMEDIATION-REPORT.md row 12).
        `/health` exposes a real `socketCount`, but it is an ops uptime
        endpoint, not a product API, and using it here would be the exact
        inconsistency this pass exists to remove: treating one "players
        online" claim as fabrication and its twin as fine because it happens
        to resolve to a real-looking number. Removed rather than wired, for
        the same reason its sibling was.
      */}

      <nav className="flex flex-col gap-2" aria-label="Menu actions">
        <SheetAction
          label="Join a room"
          hint="Have a 6-letter code? Tap here."
          onClick={onOpenJoin}
          icon={<DoorOpen className="w-5 h-5" />}
          primary
        />
        <SheetAction
          label="Recently played"
          hint="Jump back into your recent games"
          onClick={() => {
            onClose();
            navigate("/recently-played");
          }}
          icon={<Clock className="w-5 h-5 text-amber-500" />}
        />
        <SheetAction
          label="Favorite games"
          hint="Quick access to your starred titles"
          onClick={() => {
            onClose();
            navigate("/favorites");
          }}
          icon={<Heart className="w-5 h-5 text-rose-500 fill-rose-500/20" />}
        />
        <SheetAction
          label="How to play"
          hint="Quick rules for every game"
          onClick={onClose}
          icon={<HelpCircle className="w-5 h-5" />}
        />
        <SheetAction
          label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          hint={theme === "light" ? "Easier on the eyes at night" : "Bright like a verandah"}
          onClick={toggleTheme}
          icon={theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        />
        <SheetAction
          label={showSettings ? "Hide settings" : "Sound & vibration"}
          hint="Mute / theme / vibration toggle"
          onClick={() => setShowSettings((v) => !v)}
          icon={<Sliders className="w-5 h-5" />}
        />
        {showSettings && <GlobalSettings />}
        <SheetAction
          label="About BHALYAM"
          hint="Crafted for 90s Telugu kids"
          onClick={onClose}
          icon={<Info className="w-5 h-5" />}
        />

        {signedIn ? (
          <SheetAction
            label="Sign out / Log out"
            hint={email ? `Signed in as ${email}` : "Log out from this device"}
            onClick={() => {
              signOut();
              onClose();
            }}
            icon={<LogOut className="w-5 h-5 text-red-500" />}
          />
        ) : (
          <SheetAction
            label="Sign in"
            hint="Access your host privileges"
            onClick={() => {
              onClose();
              navigate("/login");
            }}
            icon={<UserIcon className="w-5 h-5 text-amber-600" />}
          />
        )}
      </nav>
    </SheetShell>
  );
}
