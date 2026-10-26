import { useViewport } from "../../lib/useViewport";
import ScorecardDashboard from "./ScorecardDashboard";
import type { ScorecardDeckProps } from "./scorecardDashboardModel";

export default function ChronoScorecardDeck(props: ScorecardDeckProps) {
  const viewport = useViewport();
  return <ScorecardDashboard {...props} layout={viewport} />;
}
