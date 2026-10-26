import type { ScorecardLayoutSlots } from "./scorecardDashboardModel";

export default function ChronoScorecardDeckDesktop(slots: ScorecardLayoutSlots) {
  return (
    <div className="grid min-w-0 grid-cols-2 items-start gap-3 xl:grid-cols-12" data-testid="scorecards-desktop">
      <div className="col-span-2 min-w-0 xl:col-span-2 xl:row-span-2">{slots.navigator}</div>
      <div className="col-span-2 min-w-0 xl:col-span-4">{slots.modes}</div>
      <div className="min-w-0 xl:col-span-3">{slots.record}</div>
      <div className="min-w-0 xl:col-span-3">{slots.intelligence}</div>
      <div className="min-w-0 xl:col-span-6">{slots.history}</div>
      <div className="min-w-0 xl:col-span-4">{slots.battles}</div>
    </div>
  );
}
