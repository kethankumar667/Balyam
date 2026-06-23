import type { RpsChoice } from "@shared/types";

/**
 * Pure SVG icon set + the per-choice accent colour shared by BOTH the mobile
 * and desktop RPS shells. Kept as the leaf module of the game folder: it has
 * no dependency on the shared components or the logic hook, so importing
 * `choiceAccent` here (used by `ChoiceIcon` for fills/strokes and by the hand
 * slots / choice cards in `rps-shared`) never creates an import cycle.
 */

type IconProps = { className?: string };

/** Accent hue for a given throw — slate rock, sky paper, amber scissors. */
export function choiceAccent(choice: RpsChoice): string {
  if (choice === "rock") return "#94a3b8";
  if (choice === "paper") return "#38bdf8";
  return "#f59e0b";
}

export function ChoiceIcon({
  choice,
  className = "h-12 w-12",
}: {
  choice: RpsChoice;
  className?: string;
}) {
  const accent = choiceAccent(choice);
  if (choice === "rock") {
    return (
      <svg viewBox="0 0 80 80" className={className} aria-hidden="true">
        <path d="M18 43c0-17 11-29 27-29 12 0 22 8 22 22 0 18-12 31-29 31-12 0-20-9-20-24Z" fill="#e2e8f0" stroke="#334155" strokeWidth="5" />
        <path d="M27 36c2-9 8-14 17-14M33 55c11 2 20-4 24-15" fill="none" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
        <circle cx="51" cy="31" r="4" fill={accent} />
      </svg>
    );
  }
  if (choice === "paper") {
    return (
      <svg viewBox="0 0 80 80" className={className} aria-hidden="true">
        <path d="M23 12h28l13 13v43H23V12Z" fill="#f8fafc" stroke="#0ea5e9" strokeWidth="5" strokeLinejoin="round" />
        <path d="M50 13v14h14M32 39h22M32 50h18M32 28h11" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 80 80" className={className} aria-hidden="true">
      <circle cx="27" cy="55" r="11" fill="#f8fafc" stroke="#92400e" strokeWidth="5" />
      <circle cx="53" cy="55" r="11" fill="#f8fafc" stroke="#92400e" strokeWidth="5" />
      <path d="M34 48 59 15M46 48 21 15" fill="none" stroke={accent} strokeWidth="7" strokeLinecap="round" />
      <path d="M40 39 31 27M40 39l9-12" fill="none" stroke="#fff7ed" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function FistIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M9 4c0-.6.4-1 1-1h4c.6 0 1 .4 1 1v3h2c.6 0 1 .4 1 1v3h1c.6 0 1 .4 1 1v5c0 2.8-2.2 5-5 5h-4c-2.8 0-5-2.2-5-5v-7c0-.6.4-1 1-1h2V4Z" />
    </svg>
  );
}
export function FlameIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2s4 4 4 9a4 4 0 0 1-8 0c0-2 1-3 1-3s-3 1-4 5a7 7 0 0 0 14 0c0-7-7-11-7-11Z" />
    </svg>
  );
}
export function TargetIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}
export function CheckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}
export function XIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className={className} aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
export function EqualIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className={className} aria-hidden>
      <path d="M5 9h14M5 15h14" />
    </svg>
  );
}
export function LockIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M6 10V8a6 6 0 1 1 12 0v2h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h1Zm2 0h8V8a4 4 0 1 0-8 0v2Z" />
    </svg>
  );
}
export function QuestionIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4" />
      <circle cx="12" cy="17" r="0.5" fill="currentColor" />
    </svg>
  );
}
export function DashIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className={className} aria-hidden>
      <path d="M6 12h12" />
    </svg>
  );
}
export function TrophyIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M5 4h14v3a4 4 0 0 1-4 4h-.3a4 4 0 0 1-5.4 0H9a4 4 0 0 1-4-4V4Zm-2 1h2v2a6 6 0 0 0 1 3.3A3 3 0 0 1 3 8V5Zm18 0h-2v2a6 6 0 0 1-1 3.3A3 3 0 0 0 21 8V5ZM10 13h4l-.5 4H17v2H7v-2h3.5L10 13Z" />
    </svg>
  );
}
export function HandshakeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="m11 17 2 2a1 1 0 1 0 3-3" />
      <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3L15 8.5l-2 2-1.5-1.5a2 2 0 0 0-2.8 0L6 12l-2-2 4-4h2l3 3" />
    </svg>
  );
}
export function RefreshIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M20 11A8 8 0 0 0 6.6 5.6L4 8" />
      <path d="M4 4v4h4" />
      <path d="M4 13a8 8 0 0 0 13.4 5.4L20 16" />
      <path d="M20 20v-4h-4" />
    </svg>
  );
}
