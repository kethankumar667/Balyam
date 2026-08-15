import { memo } from "react";
import { useViewport } from "../../lib/useViewport";
import NokiaCricketBoardMobile, { type NokiaCricketBoardProps } from "./NokiaCricketBoardMobile";
import NokiaCricketBoardDesktop from "./NokiaCricketBoardDesktop";

function NokiaCricketBoard(props: NokiaCricketBoardProps) {
  const viewport = useViewport();
  if (viewport === "desktop") {
    return <NokiaCricketBoardDesktop {...props} />;
  }
  return <NokiaCricketBoardMobile {...props} />;
}

export default memo(NokiaCricketBoard);
