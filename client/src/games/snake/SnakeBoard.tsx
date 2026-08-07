import { useViewport } from "../../lib/useViewport";
import SnakeBoardMobile, { type SnakeBoardProps } from "./SnakeBoardMobile";
import SnakeBoardDesktop from "./SnakeBoardDesktop";

export default function SnakeBoard(props: SnakeBoardProps) {
  const viewport = useViewport();
  if (viewport === "desktop") {
    return <SnakeBoardDesktop {...props} />;
  }
  return <SnakeBoardMobile {...props} />;
}
