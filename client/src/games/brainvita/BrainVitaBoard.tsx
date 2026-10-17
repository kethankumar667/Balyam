import { useViewport } from "../../lib/useViewport";
import BrainVitaBoardMobile from "./BrainVitaBoardMobile";
import BrainVitaBoardDesktop from "./BrainVitaBoardDesktop";

export interface BrainVitaBoardProps {
  /** Leave the game (back to the games page). */
  onExit: () => void;
}

/** Picks the layout built for the screen: a touch-first board with a thumb bar, or the wide table with a side panel. */
export default function BrainVitaBoard(props: BrainVitaBoardProps) {
  const viewport = useViewport();
  return viewport === "desktop" ? <BrainVitaBoardDesktop {...props} /> : <BrainVitaBoardMobile {...props} />;
}
