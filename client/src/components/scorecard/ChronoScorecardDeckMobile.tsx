import type { ScorecardLayoutSlots } from "./scorecardDashboardModel";

export default function ChronoScorecardDeckMobile(slots: ScorecardLayoutSlots) {
  return (
    <div className="flex min-w-0 flex-col gap-3" data-testid="scorecards-mobile">
      {slots.navigator}
      {slots.modes}
      {slots.record}
      {slots.intelligence}
      {slots.history}
      {slots.battles}
    </div>
  );
}
