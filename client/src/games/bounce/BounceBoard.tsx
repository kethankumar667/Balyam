import { useViewport } from "../../lib/useViewport";
import BounceBoardMobile, { type BounceBoardProps } from "./BounceBoardMobile";
import BounceBoardDesktop from "./BounceBoardDesktop";

export default function BounceBoard(props: BounceBoardProps) {
  const viewport = useViewport();
  if (viewport === "desktop") {
    return <BounceBoardDesktop {...props} />;
  }
  return <BounceBoardMobile {...props} />;
}
