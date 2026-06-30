import { useEffect, useState } from "react";
import type {
  ChatMessage,
  Player,
  RummyChampion,
  RummyPlayerState,
  RummyRoundRecap,
} from "@shared/types";
import RummyBoardMobile from "./RummyBoardMobile";
import RummyBoardDesktop from "./RummyBoardDesktop";

/**
 * Rummy table entry point.
 *
 * Routes between the mobile and the desktop layouts based on a single
 * deliberate gate. The gate is intentionally narrow — phones in landscape
 * report widths well above 1024 px (iPhone 14 Pro Max landscape = 932 px,
 * iPad mini landscape = 1133 px) and we MUST NOT show those players the
 * desktop UI. The combined conditions:
 *
 *   - viewport ≥ 1280 px wide AND ≥ 720 px tall (rules out phone landscape)
 *   - primary input is hover-capable + fine pointer (mouse / trackpad)
 *
 * If any of those fail we fall back to the mobile board, which works at
 * every width up to ~1080 px+.
 *
 * Do NOT widen this gate. If a future tablet variant is built, route to it
 * from another conditional or a NEW entry point — never relax these three.
 */
function isDesktopRummy(): boolean {
  if (typeof window === "undefined") return false;
  if (window.innerWidth < 1280 || window.innerHeight < 720) return false;
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export default function RummyBoard(props: {
  state: RummyPlayerState;
  players: Player[];
  selfId: string | null;
  messages?: ChatMessage[];
  roomCode?: string;
  onLeave?: () => void;
  history: RummyRoundRecap[];
  champion: RummyChampion | null;
}) {
  // Re-check on resize so opening devtools, rotating an iPad, or dragging the
  // window across monitors flips us to the correct layout.
  const [isDesktop, setIsDesktop] = useState<boolean>(() => isDesktopRummy());
  useEffect(() => {
    const onResize = () => setIsDesktop(isDesktopRummy());
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  return isDesktop ? <RummyBoardDesktop {...props} /> : <RummyBoardMobile {...props} />;
}
