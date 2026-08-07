import { useViewport } from "../../lib/useViewport";
import RoadRashBoardMobile, { type RoadRashBoardProps } from "./RoadRashBoardMobile";
import RoadRashBoardDesktop from "./RoadRashBoardDesktop";

export default function RoadRashBoard(props: RoadRashBoardProps) {
  const viewport = useViewport();
  if (viewport === "desktop") {
    return <RoadRashBoardDesktop {...props} />;
  }
  return <RoadRashBoardMobile {...props} />;
}
