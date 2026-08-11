import type { TeluguCinemaluBoardContainerProps } from "./TeluguCinemaluBoard";
import { TeluguCinemaluShell } from "./telugucinemalu-shared";

/** Desktop is the same flow as mobile with roomier cards — the quiz is a
 *  single column of content either way, so the two differ only in density. */
export default function TeluguCinemaluBoardDesktop({
  state,
  onMove,
}: TeluguCinemaluBoardContainerProps) {
  return <TeluguCinemaluShell state={state} onMove={onMove} dense={false} />;
}
