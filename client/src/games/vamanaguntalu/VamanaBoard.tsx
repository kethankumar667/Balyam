import { useMediaQuery } from "../../lib/useMediaQuery";
import { useViewport } from "../../lib/useViewport";
import VamanaBoardMobile from "./VamanaBoardMobile";
import VamanaBoardDesktop from "./VamanaBoardDesktop";
import type { VamanaBoardProps } from "./VamanaBoardProps";

/**
 * Picks the layout built for the screen. The board is longer than it is wide, so a screen held
 * upright (any phone, and a tablet in portrait) stands it on its end in the upright layout, tuned
 * larger at tablet width. A wide screen lays it flat in the table layout with its side rails.
 */
export default function VamanaBoard(props: VamanaBoardProps) {
  const viewport = useViewport();
  const isPortrait = useMediaQuery("(orientation: portrait)");
  return viewport === "mobile" || isPortrait ? <VamanaBoardMobile {...props} /> : <VamanaBoardDesktop {...props} />;
}
