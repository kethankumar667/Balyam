import { memo } from "react";
import { useViewport } from "../../lib/useViewport";
import BrickRacerBoardMobile, { type BrickRacerBoardProps } from "./BrickRacerBoardMobile";
import BrickRacerBoardDesktop from "./BrickRacerBoardDesktop";

function BrickRacerBoard(props: BrickRacerBoardProps) {
  const viewport = useViewport();
  if (viewport === "desktop") {
    return <BrickRacerBoardDesktop {...props} />;
  }
  return <BrickRacerBoardMobile {...props} />;
}

export default memo(BrickRacerBoard);
