import { useViewport } from "../../lib/useViewport";
import SpaceImpactBoardMobile, { type SpaceImpactBoardProps } from "./SpaceImpactBoardMobile";
import SpaceImpactBoardDesktop from "./SpaceImpactBoardDesktop";

export default function SpaceImpactBoard(props: SpaceImpactBoardProps) {
  const viewport = useViewport();
  if (viewport === "desktop") {
    return <SpaceImpactBoardDesktop {...props} />;
  }
  return <SpaceImpactBoardMobile {...props} />;
}
