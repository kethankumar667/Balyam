import { useMediaQuery } from "../../lib/useMediaQuery";
import { useViewport } from "../../lib/useViewport";
import BrainVitaBoardMobile from "./BrainVitaBoardMobile";
import BrainVitaBoardDesktop from "./BrainVitaBoardDesktop";

export interface BrainVitaBoardProps {
  /** Leave the game (back to the games page). */
  onExit: () => void;
}

/**
 * Picks the layout built for the screen. A screen held upright (any phone, and a tablet in portrait)
 * stacks the sign, stats, board and three pills in one column. A wide screen puts the board beside a
 * panel of stats, pills and the jump log.
 */
export default function BrainVitaBoard(props: BrainVitaBoardProps) {
  const viewport = useViewport();
  const isPortrait = useMediaQuery("(orientation: portrait)");
  return viewport === "mobile" || isPortrait ? <BrainVitaBoardMobile {...props} /> : <BrainVitaBoardDesktop {...props} />;
}
