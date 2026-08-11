import type { TeluguCinemaluBoardContainerProps } from "./TeluguCinemaluBoard";
import { TeluguCinemaluShell } from "./telugucinemalu-shared";

export default function TeluguCinemaluBoardMobile({
  state,
  onMove,
}: TeluguCinemaluBoardContainerProps) {
  return <TeluguCinemaluShell state={state} onMove={onMove} dense />;
}
