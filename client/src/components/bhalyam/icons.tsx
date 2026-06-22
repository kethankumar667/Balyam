/**
 * Inline SVG icons used across the BHALYAM UI surfaces (Home + GameRoomSheet
 * + BhalyamLogo fallback).
 *
 * Slimmed during the cleanup pass — bottom-nav, achievement-badge, daily-
 * reward, landing, and adda-step icons all went with their UI sections.
 * Add back as needed when the corresponding feature lands.
 *
 * All icons are 24x24 viewBox + currentColor stroke. Game pictograms keep
 * their original 24x24 viewBox too so they tint via Tailwind text-*.
 */

export interface BhalyamIconProps {
  className?: string;
}

function makeIcon(path: React.ReactNode, viewBox = "0 0 24 24") {
  return function Icon({ className }: BhalyamIconProps) {
    return (
      <svg
        viewBox={viewBox}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        {path}
      </svg>
    );
  };
}

/* ────────── Logo-fallback glyph (BhalyamLogo.tsx) ────────── */

export const KiteIcon = makeIcon(
  <>
    <path d="M12 2 4 11l8 11 8-11z" />
    <path d="M12 2v20M4 11l16 0" />
    <path d="M12 22c1.5 1 3 1.5 4 2M12 22c-1.5 1-3 1.5-4 2" />
  </>,
);

/* ────────── Sheet utility icons (GameRoomSheet.tsx) ────────── */

export const SparkIcon = makeIcon(
  <>
    <path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6Z" />
  </>,
);

export const ArrowRightIcon = makeIcon(
  <>
    <path d="M5 12h14" />
    <path d="m13 5 7 7-7 7" />
  </>,
);

/* ────────── Game pictograms (Home tiles + GameRoomSheet header) ────────── */

export const HandCricketGlyph = makeIcon(
  <>
    <path d="M9 22c0-3 1-6 3-6s3 3 3 6" />
    <path d="M10 16V7a2 2 0 0 1 4 0v6" />
    <path d="M14 9V5a2 2 0 0 1 4 0v8" />
    <path d="M18 11a2 2 0 0 1 3 2v3a6 6 0 0 1-6 6" />
    <path d="M10 16H7a2 2 0 0 1-2-2V8a2 2 0 0 1 4 0" />
  </>,
);

export const SnakeLadderGlyph = makeIcon(
  <>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
    <path d="M6 18c2-3 2-6 0-9" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="17" cy="6" r="1.2" fill="currentColor" stroke="none" />
  </>,
);

export const LudoGlyph = makeIcon(
  <>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
    <path d="m12 9 3 3-3 3-3-3z" />
  </>,
);

export const RummyGlyph = makeIcon(
  <>
    <rect x="5" y="3" width="11" height="15" rx="1.5" />
    <rect x="9" y="6" width="11" height="15" rx="1.5" />
    <path d="M12 13l1.5-2 1.5 2-1.5 2z" />
  </>,
);

export const RpsGlyph = makeIcon(
  <>
    <path d="M5 13c0-3 2-5 5-5s5 2 5 5v3a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z" />
    <path d="M14 8h5a1 1 0 0 1 1 1v9a3 3 0 0 1-3 3" />
    <path d="m7 10 2-3M11 8l2-3" />
  </>,
);

export const UnoGlyph = makeIcon(
  <>
    <rect x="4" y="4" width="10" height="15" rx="2" />
    <path d="M11 5h6a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-6" />
    <path d="M8.5 13c1.8 1.8 4.7 1.8 6.5 0" />
    <path d="M8.5 10.5c1.8-1.8 4.7-1.8 6.5 0" />
  </>,
);

export const WordBuildingGlyph = makeIcon(
  <>
    {/* Workbook silhouette + grid + small pencil — reads as "english class". */}
    <rect x="4" y="3.5" width="14" height="17" rx="1.5" />
    <path d="M7 7h8M7 10h8M7 13h8M7 16h5" />
    <path d="m18 18 2 2-2 2-2-2z" transform="translate(-1 -1)" />
  </>,
);
