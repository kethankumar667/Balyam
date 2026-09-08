/**
 * One consistent stroke-icon family for the Ludo chrome — replaces the OS
 * emoji (☰ 🔊 🔈 ❔ ⇥ 👑 🤖 ⏏ ⚠️ 🏠 💬 😊 🎙️ ⋯) that previously stood in for
 * icons in the status bar, player cards, roll tray, and bottom nav. Emoji
 * render differently per OS/browser and clash against a tuned chrome
 * palette; these are plain `currentColor` line icons (24x24 viewBox, 2px
 * stroke, rounded caps) so every icon in the chrome shares one weight and
 * voice — the same convention `games/uno/uno-icons.tsx` already
 * established for UNO's own stadium chrome. Kept self-contained to this
 * game folder rather than cross-imported, matching that file's own
 * per-game pattern.
 */

interface IconProps {
  size?: number;
  className?: string;
}

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function MenuIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export function SpeakerIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M4 9v6h3.5L13 19V5L7.5 9H4z" />
      <path d="M17 9.5a4.5 4.5 0 010 5M19.5 7a8 8 0 010 10" />
    </svg>
  );
}

export function SpeakerMutedIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M4 9v6h3.5L13 19V5L7.5 9H4z" />
      <path d="M17 9l5 6M22 9l-5 6" />
    </svg>
  );
}

export function ExpandIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  );
}

export function CompressIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
    </svg>
  );
}

export function HelpIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.6 9.2a2.5 2.5 0 014.8.9c0 1.7-2.4 2-2.4 3.4" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function LeaveDoorIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

export function CrownIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M3 8l4 3 5-6 5 6 4-3-1.5 10h-15L3 8z" />
      <circle cx="3" cy="6" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="4" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="21" cy="6" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function BotIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <rect x="5" y="8" width="14" height="11" rx="3" />
      <path d="M12 8V4M9 4h6" />
      <circle cx="9.5" cy="13.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="13.5" r="1.2" fill="currentColor" stroke="none" />
      <path d="M9 17h6" />
    </svg>
  );
}

/** Seat quit / force-removed indicator — the classic eject glyph. */
export function QuitIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M12 4l7 8H5l7-8z" />
      <path d="M5 18h14" />
    </svg>
  );
}

export function WarningIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M12 4l9.5 16H2.5L12 4z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Tokens-home count, replacing the 🏠 glyph on player cards. */
export function HomeIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M4 11l8-7 8 7" />
      <path d="M6 10v10h12V10" />
    </svg>
  );
}

export function ChatIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M4 5h16v10H9l-4 4v-4H4V5z" />
    </svg>
  );
}

export function SmileyIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
      <path d="M8 14.5c1.1 1.3 2.5 2 4 2s2.9-.7 4-2" />
    </svg>
  );
}

export function MicIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M6 11a6 6 0 0012 0" />
      <path d="M12 17v4M9 21h6" />
    </svg>
  );
}

/** Small flat dice-pip glyph for inline badges (e.g. the active-turn pill) —
 *  distinct from the big real 3D cube in `Dice.tsx`, which is too heavy for
 *  a 10px inline badge. */
export function DiceIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" />
      <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="16" cy="8" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="8" cy="16" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="16" cy="16" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** "More" nav button — an ellipsis, replacing the ⋯ glyph. */
export function MoreIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <circle cx="6" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Capture / impact burst — replaces the 💥 match-feed glyph. */
export function ImpactIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
    </svg>
  );
}

/** Forfeit / blocked — replaces the ⛔ match-feed glyph. */
export function BlockedIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M6.5 6.5l11 11" />
    </svg>
  );
}

/** Turn skipped / passed — replaces the ↪ match-feed glyph. */
export function SkipIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M7 7v4h4" />
      <path d="M7 11a7 7 0 1010-6.5" />
    </svg>
  );
}
