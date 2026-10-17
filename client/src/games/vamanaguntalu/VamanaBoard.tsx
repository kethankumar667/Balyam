import { useViewport } from "../../lib/useViewport";
import VamanaBoardMobile from "./VamanaBoardMobile";
import VamanaBoardDesktop from "./VamanaBoardDesktop";
import type { VamanaBoardProps } from "./VamanaBoardProps";

/** Picks the layout built for the screen: a touch-first upright board, or the wide table with a side rail. */
export default function VamanaBoard(props: VamanaBoardProps) {
  const viewport = useViewport();
  return viewport === "desktop" ? <VamanaBoardDesktop {...props} /> : <VamanaBoardMobile {...props} />;
}
