import type { ScorecardLayoutSlots } from "./scorecardDashboardModel";

/**
 * The navigator gets its own column so its long game list never sizes the
 * content rows. Inside the content grid, panels sharing a row stretch to the
 * same height, so Personal best and Record intelligence line up and the next
 * panel starts directly beneath them.
 */
export default function ChronoScorecardDeckDesktop(slots: ScorecardLayoutSlots) {
  return (
    <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[17rem_minmax(0,1fr)] 2xl:grid-cols-[18rem_minmax(0,1fr)]" data-testid="scorecards-desktop">
      <div className="min-w-0">{slots.navigator}</div>
      <div className="grid min-w-0 grid-cols-2 gap-4 2xl:grid-cols-3 [&>*>*]:h-full [&>*]:min-w-0">
        <div className="col-span-2 2xl:col-span-3">{slots.modes}</div>
        <div className="2xl:row-start-2">{slots.record}</div>
        <div className="2xl:row-start-2">{slots.intelligence}</div>
        <div className="col-span-2 2xl:col-span-3 2xl:row-start-3">{slots.history}</div>
        <div className="col-span-2 2xl:col-span-1 2xl:col-start-3 2xl:row-start-2">{slots.battles}</div>
      </div>
    </div>
  );
}
