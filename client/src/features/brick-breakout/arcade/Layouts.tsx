import type { ReactNode } from "react";

interface ArenaProps { board: ReactNode; stats: ReactNode; powers: ReactNode; controls: ReactNode; guide: ReactNode }
export function BreakoutBoardMobile({ board, stats, powers, controls, guide }: ArenaProps) {
  return <main data-layout="mobile" className="mx-auto flex w-full max-w-lg flex-col gap-2 px-3 pb-[max(12px,env(safe-area-inset-bottom))]">
    <div className="grid h-[calc(100svh-190px)] min-h-[320px] grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-2">
      {stats}{powers}
      <div className="flex min-h-0 min-w-0 items-center justify-center">{board}</div>
      {controls}
    </div>
    <details className="rounded-2xl border border-white/15 bg-slate-900 p-3 text-sm text-slate-300">
      <summary className="min-h-11 cursor-pointer py-3 font-semibold text-slate-100">Controls & field guide</summary>{guide}
    </details>
  </main>;
}
export function BreakoutBoardDesktop({ board, stats, powers, controls, guide }: ArenaProps) {
  return <main data-layout="desktop" className="mx-auto grid w-full max-w-6xl grid-cols-[160px_minmax(280px,420px)] items-start justify-center gap-5 px-5 pb-8 lg:grid-cols-[minmax(160px,1fr)_minmax(280px,420px)_minmax(170px,1fr)]">
    <aside className="flex min-w-0 flex-col gap-4">{stats}{powers}</aside>
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex h-[min(76svh,660px)] min-h-[360px] justify-center">{board}</div>{controls}
    </div>
    <aside className="col-span-2 rounded-3xl border border-white/15 bg-slate-900/80 p-5 text-sm text-slate-300 lg:col-span-1">
      <h2 className="mb-4 font-display text-lg text-cyan-100">Pilot's field guide</h2>{guide}
    </aside>
  </main>;
}
