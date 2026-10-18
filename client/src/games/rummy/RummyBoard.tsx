import { useEffect, useState } from "react";
import type {
  ChatMessage,
  Player,
  RummyChampion,
  RummyPlayerState,
  RummyRoundRecap,
} from "@shared/types";
import type { WorldId } from "@shared/worlds";
import RummyBoardMobile from "./RummyBoardMobile";
import RummyBoardDesktop from "./RummyBoardDesktop";
import { drawnWorld } from "../../lib/worlds/worldArt";
import { setRummySoundWorld } from "./sound";

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
  /**
   * Called once the final end-of-round/match result card has been
   * dismissed by the player. Room.tsx uses this to replace the board
   * with the GameOverScreen. NOT called for pool-mode between-round
   * dismissals (the game continues) — only for true session endings.
   */
  onScorecardClose?: () => void;
  /** The table's world, chosen by the host. Drawn as the classic table if Rummy has no art for it (see lib/worlds/worldArt). */
  world?: WorldId;
}) {
  // Re-check on resize so opening devtools, rotating an iPad, or dragging the
  // window across monitors flips us to the correct layout.
  const [isDesktop, setIsDesktop] = useState<boolean>(() => isDesktopRummy());
  // The table's world decides what the cues sound like; leaving the table puts the classic voice back.
  const soundWorld = drawnWorld("rummy", props.world);
  useEffect(() => {
    setRummySoundWorld(soundWorld);
    return () => setRummySoundWorld("classic");
  }, [soundWorld]);
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
