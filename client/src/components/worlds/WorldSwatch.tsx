import type { CSSProperties } from "react";
import type { WorldId } from "@shared/worlds";

/**
 * A small picture of a world, for the lobby card and the picker: its own ground and one thing that is only found
 * there. It is a hint, not a preview of the game, which is drawn by the game itself once the table is open.
 */

const GROUND: Readonly<Record<WorldId, CSSProperties>> = {
  classic: { background: "linear-gradient(135deg, #f7efdc 0%, #e8dcc0 100%)" },
  neon: { background: "radial-gradient(circle at 30% 25%, #17407a 0%, #060c24 75%)" },
  toy: { background: "linear-gradient(135deg, #ffe08a 0%, #ffb347 100%)" },
  zen: { background: "linear-gradient(135deg, #e7e0cb 0%, #c9bf9f 100%)" },
  reef: { background: "linear-gradient(180deg, #1aa3b8 0%, #064a6e 100%)" },
  palace: { background: "linear-gradient(135deg, #7c1f2d 0%, #34091a 100%)" },
};

/** The mark of each world, drawn in a 40 by 40 box. */
function Mark({ world }: { world: WorldId }) {
  switch (world) {
    case "classic":
      return (
        <g fill="none" stroke="#6b563c" strokeWidth="1.4" opacity="0.7">
          <rect x="8" y="8" width="24" height="24" rx="2" />
          <path d="M8 20 H32 M20 8 V32" />
          <circle cx="20" cy="20" r="4" fill="#e11d48" stroke="none" opacity="1" />
        </g>
      );
    case "neon":
      return (
        <g fill="none" stroke="#22d3ee" strokeWidth="1.4">
          <path d="M4 30 H36 M4 24 H36 M12 18 L6 36 M20 18 V36 M28 18 L34 36" opacity="0.7" />
          <circle cx="20" cy="12" r="5" fill="#a5f3fc" stroke="none" />
        </g>
      );
    case "toy":
      return (
        <g>
          <rect x="8" y="14" width="12" height="12" rx="2" fill="#ef4444" />
          <rect x="21" y="14" width="12" height="12" rx="2" fill="#3b82f6" />
          <rect x="14" y="4" width="12" height="11" rx="2" fill="#22c55e" />
        </g>
      );
    case "zen":
      return (
        <g fill="none" stroke="#7a6f4f" strokeWidth="1.2" opacity="0.8">
          <circle cx="20" cy="20" r="6" fill="#4d565c" stroke="none" opacity="1" />
          <circle cx="20" cy="20" r="11" />
          <circle cx="20" cy="20" r="16" />
        </g>
      );
    case "reef":
      return (
        <g fill="none" stroke="#d1faf4" strokeWidth="1.3">
          <circle cx="12" cy="26" r="4" />
          <circle cx="24" cy="16" r="3" />
          <circle cx="29" cy="30" r="5" />
          <circle cx="16" cy="9" r="2" />
        </g>
      );
    case "palace":
      return (
        <g fill="none" stroke="#e8b84a" strokeWidth="1.4">
          <path d="M20 5 L33 20 L20 35 L7 20 Z" />
          <path d="M20 12 L27 20 L20 28 L13 20 Z" opacity="0.7" />
          <circle cx="20" cy="20" r="2.4" fill="#e8b84a" stroke="none" />
        </g>
      );
  }
}

export function WorldSwatch({ world, className = "h-12 w-12", isDimmed = false }: { world: WorldId; className?: string; isDimmed?: boolean }) {
  return (
    <span aria-hidden className={`relative inline-block flex-shrink-0 overflow-hidden rounded-xl border border-black/10 ${className}`} style={{ ...GROUND[world], opacity: isDimmed ? 0.55 : 1 }}>
      <svg viewBox="0 0 40 40" className="absolute inset-0 h-full w-full">
        <Mark world={world} />
      </svg>
    </span>
  );
}
