/**
 * Icons for the auth screens.
 *
 * Drawn, not borrowed from the emoji keyboard: same 24x24 viewBox, same
 * `currentColor` stroke and 1.8 weight as `components/bhalyam/icons.tsx`, so
 * they tint and scale with the rest of the system.
 *
 * The Google mark is the exception and has to be. It is a trademark with a
 * fixed four-colour form; redrawing it in the house stroke would both look
 * wrong and misrepresent it, so it ships as filled paths at its own
 * proportions and is never recoloured.
 */

export interface AuthIconProps {
  className?: string;
}

function strokeIcon(path: React.ReactNode) {
  return function Icon({ className }: AuthIconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
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

/** Chest keyhole — the auth crest. Echoes the BHALYAM treasure-chest world. */
export const KeyholeIcon = strokeIcon(
  <>
    <rect x="3" y="8" width="18" height="12" rx="2.5" />
    <path d="M3 12h18" />
    <path d="M8 8V6.5A4 4 0 0 1 16 6.5V8" />
    <circle cx="12" cy="14.5" r="1.6" />
    <path d="M12 16.1V17.6" />
  </>,
);

export const MailIcon = strokeIcon(
  <>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="m3.5 7.5 7.3 5.1a2 2 0 0 0 2.4 0l7.3-5.1" />
  </>,
);

export const LockIcon = strokeIcon(
  <>
    <rect x="4.5" y="10" width="15" height="10" rx="2.5" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </>,
);

export const UserIcon = strokeIcon(
  <>
    <circle cx="12" cy="8.5" r="3.5" />
    <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
  </>,
);

export const EyeIcon = strokeIcon(
  <>
    <path d="M2.5 12s3.6-6 9.5-6 9.5 6 9.5 6-3.6 6-9.5 6-9.5-6-9.5-6Z" />
    <circle cx="12" cy="12" r="2.6" />
  </>,
);

export const EyeOffIcon = strokeIcon(
  <>
    <path d="M4 4.5 20 20.5" />
    <path d="M9.9 6.4A8.6 8.6 0 0 1 12 6c5.9 0 9.5 6 9.5 6a15.6 15.6 0 0 1-3.3 3.9" />
    <path d="M6.5 8.1A15.5 15.5 0 0 0 2.5 12s3.6 6 9.5 6a8.9 8.9 0 0 0 3.2-.6" />
    <path d="M10.2 10.4a2.6 2.6 0 0 0 3.5 3.6" />
  </>,
);

export const ArrowLeftIcon = strokeIcon(
  <>
    <path d="M19 12H5" />
    <path d="m11 6-6 6 6 6" />
  </>,
);

export const CheckCircleIcon = strokeIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.2 12.4 2.6 2.6 5-5.4" />
  </>,
);

export const AlertIcon = strokeIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.2" />
    <path d="M12 16.3v.2" />
  </>,
);

/** Play piece — marks the guest route, which needs no account at all. */
export const DiceIcon = strokeIcon(
  <>
    <rect x="4" y="4" width="16" height="16" rx="3.5" />
    <circle cx="9" cy="9" r="1.15" fill="currentColor" stroke="none" />
    <circle cx="15" cy="15" r="1.15" fill="currentColor" stroke="none" />
    <circle cx="15" cy="9" r="1.15" fill="currentColor" stroke="none" />
    <circle cx="9" cy="15" r="1.15" fill="currentColor" stroke="none" />
  </>,
);

/** Indeterminate spinner. Animated via CSS so reduced-motion can stop it. */
export function SpinnerIcon({ className }: AuthIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.4" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Google's mark, in its own colours at its own proportions.
 * Do not restyle: a recoloured or restroked Google logo is a misuse.
 */
export function GoogleMark({ className }: AuthIconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17Z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7A21.99 21.99 0 0 0 24 46Z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18A13.2 13.2 0 0 1 11 24c0-1.45.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7Z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07Z"
      />
    </svg>
  );
}

/** Edit affordance. Drawn to the same 1.8 stroke as the rest of the set. */
export const PencilIcon = strokeIcon(
  <>
    <path d="M4 20h4.2l9.3-9.3a2.1 2.1 0 0 0 0-3l-1.2-1.2a2.1 2.1 0 0 0-3 0L4 15.8V20Z" />
    <path d="M14.5 6.5 17.5 9.5" />
  </>,
);

/** Preferences. Same 1.8 stroke as the rest of the set. */
export const SlidersIcon = strokeIcon(
  <>
    <path d="M4 7h10M18 7h2" />
    <path d="M4 12h4M12 12h8" />
    <path d="M4 17h12M20 17h0" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="12" r="2" />
    <circle cx="18" cy="17" r="2" />
  </>,
);
