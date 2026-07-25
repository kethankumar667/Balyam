/**
 * One consistent stroke-icon family for the UNO stadium chrome — replaces
 * the OS emoji (👑 🔊 🔇 ⚙️ 💬 ⏰ 🎲 ⭐ 🙂) and the bare "←"/"✓" glyphs that
 * previously stood in as icons. Emoji render differently per OS/browser and
 * clash against the tuned dark-maroon/gold palette; these are plain
 * `currentColor` line icons (24x24 viewBox, 2px stroke, rounded caps) so
 * every icon in the rail shares one weight and voice. Actual emoji sent as
 * chat *reactions* (the picker's own content, not UI chrome) are untouched —
 * those are real user-facing payloads, not iconography.
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

export function GearIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.2M12 18.8V21M21 12h-2.2M5.2 12H3M18.1 5.9l-1.55 1.55M7.45 16.55L5.9 18.1M18.1 18.1l-1.55-1.55M7.45 7.45L5.9 5.9" />
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

export function ClockIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5.5l3.5 2" />
    </svg>
  );
}

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

export function StarIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path
        d="M12 3.5l2.47 5.13 5.53.63-4.06 3.87 1.05 5.62L12 15.9l-4.99 2.85 1.05-5.62-4.06-3.87 5.53-.63L12 3.5z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ArrowLeftIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

export function CheckIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} {...base}>
      <path d="M5 12.5l4.5 4.5L19 7" />
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
