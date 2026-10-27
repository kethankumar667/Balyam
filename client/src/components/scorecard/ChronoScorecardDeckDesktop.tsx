import type { ScorecardLayoutSlots } from "./scorecardDashboardModel";

export default function ChronoScorecardDeckDesktop(slots: ScorecardLayoutSlots) {
  return (
    <div className="grid min-w-0 grid-cols-2 items-start gap-4 xl:grid-cols-[17rem_minmax(0,1fr)_minmax(0,1fr)] 2xl:grid-cols-[18rem_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]" data-testid="scorecards-desktop">
      <div className="col-span-2 min-w-0 xl:col-span-1 xl:row-span-3 2xl:row-span-2">{slots.navigator}</div>
      <div className="col-span-2 min-w-0 xl:col-span-1">{slots.modes}</div>
      <div className="min-w-0">{slots.record}</div>
      <div className="min-w-0 xl:col-start-2 2xl:col-start-4">{slots.intelligence}</div>
      <div className="min-w-0 xl:col-span-2 xl:col-start-2">{slots.history}</div>
      <div className="min-w-0 xl:col-span-2 xl:col-start-2 2xl:col-span-1 2xl:col-start-4">{slots.battles}</div>
    </div>
  );
}
