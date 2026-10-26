import type { ReactNode, RefObject } from "react";

interface LayoutProps {
  board: ReactNode;
  hold: ReactNode;
  next: ReactNode;
  stats: ReactNode;
  controls: ReactNode;
  boardRef: RefObject<HTMLDivElement>;
}

export function MobileArena({ board, hold, next, stats, controls, boardRef, landscape = false }: LayoutProps & { landscape?: boolean }) {
  return <main data-layout={landscape ? "mobile-landscape" : "mobile"}
    className={`mx-auto grid w-full min-w-0 gap-2 px-3 pb-[max(12px,env(safe-area-inset-bottom))] ${
      landscape
        ? "h-[calc(100svh-100px)] max-w-4xl min-h-[220px] grid-cols-[minmax(0,1fr)_minmax(260px,1.5fr)] grid-rows-[auto_auto_minmax(0,1fr)]"
        : "h-[calc(100svh-90px)] max-w-md min-h-[360px] grid-rows-[auto_auto_minmax(0,1fr)_auto]"
    }`}>
    <div className={landscape ? "col-start-2 row-start-1 min-w-0" : "min-w-0"}>{stats}</div>
    <div className={`flex min-w-0 items-center justify-between gap-2 ${landscape ? "col-start-2 row-start-2" : ""}`}>{hold}{next}</div>
    <div ref={boardRef} className={`flex min-h-0 min-w-0 touch-none items-center justify-center ${landscape ? "col-start-1 row-start-1 row-span-3" : ""}`}>{board}</div>
    <div className={`min-w-0 ${landscape ? "col-start-2 row-start-3 self-end" : ""}`}>{controls}</div>
  </main>;
}

export function DesktopArena({ board, hold, next, stats, controls, boardRef }: LayoutProps) {
  return <main data-layout="desktop" className="mx-auto grid w-full max-w-5xl grid-cols-[minmax(130px,1fr)_minmax(230px,340px)_minmax(130px,1fr)] items-start gap-5 px-5 pb-8 lg:gap-10">
    <aside className="flex flex-col gap-5 pt-3">
      {hold}{stats}
      <div className="rounded-3xl border border-rim bg-surface-1 p-5 text-sm text-ink-mid">
        <h2 className="mb-2 font-bold text-ink-hi">Find your flow</h2>
        <p>Leave room to rotate. Plan with your next shapes. Use hold once per placement.</p>
        <p className="mt-3 text-xs">Keyboard controls are customizable in Settings.</p>
      </div>
    </aside>
    <div className="flex flex-col gap-4">
      <div ref={boardRef} className="mx-auto w-full touch-none" style={{ maxWidth: "min(340px, max(230px, calc((100svh - 220px) / 2)))" }}>{board}</div>
      {controls}
    </div>
    <aside className="pt-3">{next}</aside>
  </main>;
}
