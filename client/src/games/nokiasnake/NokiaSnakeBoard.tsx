import { memo } from "react";
import { useViewport } from "../../lib/useViewport";
import NokiaSnakeBoardMobile, { type NokiaSnakeBoardProps } from "./NokiaSnakeBoardMobile";
import NokiaSnakeBoardDesktop from "./NokiaSnakeBoardDesktop";

function NokiaSnakeBoard(props: NokiaSnakeBoardProps) {
  const viewport = useViewport();
  if (viewport === "desktop") {
    return <NokiaSnakeBoardDesktop {...props} />;
  }
  return <NokiaSnakeBoardMobile {...props} />;
}

export default memo(NokiaSnakeBoard);
