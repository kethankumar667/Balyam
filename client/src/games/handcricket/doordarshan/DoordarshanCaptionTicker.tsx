import type { HcCelebrationData } from "../useHcCelebrationEvents";
import { messageFor } from "./DoordarshanCelebration";
import { useTypewriter } from "./useTypewriter";
import { DD } from "./doordarshan-kit";

const IDLE_CAPTION = "— DD Sports commentary —";

/**
 * A persistent lower-third caption bar that types its text on
 * character-by-character, like an old character generator. Takes the same
 * `active` celebration event the big replay overlay renders (lifted to
 * HcDoordarshanShell and passed to both) so the two surfaces always agree on
 * what just happened instead of each independently re-rolling a random
 * flavour line.
 */
export function DoordarshanCaptionTicker({ active }: { active: HcCelebrationData | null }) {
  const message = active ? messageFor(active) : IDLE_CAPTION;
  const typed = useTypewriter(message, active ? 18 : 36);

  return (
    // A normal (non-absolute) flex child, not an overlay: it used to sit
    // `position: absolute; bottom: 0`, which visually overlapped whatever
    // was at the bottom of the VIEWPORT at any scroll position — the
    // team-select grid's last row, the squad picker's bench cards, the
    // live-innings hand-pick buttons — since overlay positioning doesn't
    // know where a scrollable sibling's content actually ends. As a real
    // flex-col sibling below the content area, flexbox shrinks that area's
    // `flex-1` to leave genuine room, so nothing is ever covered.
    //
    // No `aria-live` here: this text reveals character-by-character every
    // 18-36ms, and a live region watching THAT would queue/announce a
    // stream of truncated partial strings instead of one clean sentence.
    // `DoordarshanCelebrationOverlay` already carries its own
    // `aria-live="polite" role="status"` announcing the same event's full
    // message once, which is what a screen-reader user actually wants here.
    <div className="shrink-0 flex justify-center px-3 pb-2 pt-1">
      <div
        aria-hidden
        className="font-typewriter max-w-full truncate rounded-sm px-3 py-1.5 text-[12px] sm:text-[13px]"
        style={{
          background: "rgba(10,7,5,0.72)",
          border: `1px solid ${DD.line}`,
          color: active ? DD.amber : DD.inkLo,
          boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
        }}
      >
        {typed}
        <span style={{ opacity: 0.7 }}>▌</span>
      </div>
    </div>
  );
}
