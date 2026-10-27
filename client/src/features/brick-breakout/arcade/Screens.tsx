import { ArrowRight, Crosshair, Layers, Shield, Timer, Trophy, Zap } from "lucide-react";
import { MODE_TITLES, POWER_LABELS, type ArcadeState, type Mode } from "./rules";
import { bestFor, type ArcadeSave } from "./storage";

export const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 disabled:cursor-not-allowed disabled:opacity-40";
export const primaryClass = `${buttonClass} !border-cyan-200 !bg-cyan-200 !text-slate-950 hover:!bg-cyan-100`;
const descriptions: Record<Mode, string> = {
  campaign: "Eight sectors. Three lives. Clear increasingly layered formations and make every return count.",
  "score-attack": "Two minutes of active play. Push your combo, collect power-ups, and beat your own score.",
  daily: "A new UTC seed each day. The same starting formations and power-up placements for everyone. Two minutes.",
};
export function ModeMenu({ data, start }: { data: ArcadeSave; start: (mode: Mode) => void }) {
  const date = new Date().toISOString().slice(0, 10);
  return <main className="mx-auto w-full max-w-6xl px-4 pb-10 pt-5 sm:px-6 sm:pt-12">
    <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
      <section>
        <p className="mb-4 text-xs font-semibold uppercase tracking-[.25em] text-cyan-200">Precision meets overload</p>
        <h2 className="max-w-lg font-display text-4xl leading-[1.1] text-white sm:text-6xl">Break the wall.<br /><span className="text-cyan-200">Find your flow.</span></h2>
        <p className="mt-5 max-w-md text-sm leading-7 text-slate-300">A colorful, high-energy paddle arcade. Read the angle, catch the next power-up, and turn a clean return into a chain reaction.</p>
        <div aria-hidden="true" className="mt-8 hidden max-w-md grid-cols-6 gap-2 rounded-3xl border border-cyan-200/20 bg-slate-900 p-6 lg:grid">
          {Array.from({ length: 24 }, (_, i) => <div key={i} className={`h-5 rounded border-t-2 border-white/50 ${["bg-cyan-300", "bg-indigo-300", "bg-fuchsia-300", "bg-rose-300"][Math.floor(i / 6)]}`} />)}
          <div className="col-span-6 flex h-16 items-end justify-center"><div className="h-2 w-24 rounded-full bg-cyan-100 shadow-[0_0_20px_#67e8f9]" /></div>
        </div>
        <div className="mt-6 flex flex-wrap gap-4 text-xs text-slate-300"><span className="flex items-center gap-2"><Crosshair size={15} /> Drag, mouse or keyboard</span><span className="flex items-center gap-2"><Shield size={15} /> No stakes or coin rewards</span></div>
      </section>
      <section aria-label="Choose a solo mode" className="space-y-3">
        {(["campaign", "score-attack", "daily"] as const).map((mode, index) => {
          const Icon = [Layers, Timer, Zap][index];
          const best = bestFor(data, mode, mode === "daily" ? date : undefined);
          return <button key={mode} type="button" onClick={() => start(mode)} aria-label={`Play ${MODE_TITLES[mode]}`}
            className="group w-full rounded-3xl border border-white/15 bg-slate-900/90 p-5 text-left transition-colors hover:border-cyan-200/70 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
            <div className="flex items-center gap-3"><Icon className="h-10 w-10 shrink-0 rounded-xl bg-cyan-200/10 p-2 text-cyan-200" /><h3 className="flex-1 font-display text-xl text-white">{MODE_TITLES[mode]}</h3><ArrowRight className="h-5 w-5 text-cyan-100" /></div>
            <p className="mt-3 text-sm leading-6 text-slate-300">{descriptions[mode]}</p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs"><span className="text-cyan-200">{mode === "daily" ? `${date} UTC` : index === 0 ? "Sector 01 / 08" : "120 seconds"}</span><span className="font-semibold tabular-nums text-slate-200">{best ? `Device best ${best.toLocaleString()}` : "Set your first device best"}</span></div>
          </button>;
        })}
      </section>
    </div>
    <section className="mt-8 rounded-2xl border border-white/15 bg-slate-900/80 p-4 text-xs leading-6 text-slate-300">
      <p className="font-semibold text-slate-100">Personal competition, honestly labelled</p>
      <p>Finished runs save to your account and keep a device best when storage is allowed. These are client-reported scores, not verified global rankings. Daily runs are repeatable and pausable; this is not a ranked tournament.</p>
      {data.legacyBest > 0 && <p className="mt-2">Historical classic best: <strong className="tabular-nums text-amber-200">{data.legacyBest.toLocaleString()}</strong>. Preserved separately because the old game used different rules.</p>}
    </section>
  </main>;
}
export function RunStats({ state, data }: { state: ArcadeState; data: ArcadeSave }) {
  const remaining = Math.max(0, Math.ceil((120000 - state.elapsed) / 1000));
  const stats = [
    ["Score", state.score.toLocaleString()], ["Sector", state.mode === "campaign" ? `${state.level} / 8` : String(state.level)],
    [state.mode === "campaign" ? "Lives" : "Time left", state.mode === "campaign" ? String(state.lives) : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`],
    ["Combo", `${state.combo || 1}\u00d7`],
  ];
  return <section aria-label="Run statistics" className="grid grid-cols-4 gap-2 rounded-2xl border border-white/15 bg-slate-900 p-3 md:grid-cols-2 lg:gap-4 lg:p-5">
    {stats.map(([label, value]) => <div key={label} className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 break-words text-lg font-semibold tabular-nums text-cyan-100">{value}</p></div>)}
    <p className="col-span-full border-t border-white/10 pt-2 text-xs text-slate-300">Device best <span className="font-semibold tabular-nums text-white">{bestFor(data, state.mode, state.mode === "daily" ? state.date : undefined).toLocaleString()}</span>{state.mode !== "campaign" && ` \u00b7 ${state.lives} lives`}</p>
  </section>;
}
export function PowerStatus({ state }: { state: ArcadeState }) {
  const timed = (until: number) => `${Math.max(0, Math.ceil((until - state.elapsed) / 1000))}s`;
  return <section aria-label="Active power-ups" className="flex flex-wrap gap-2 text-[11px] text-slate-200 lg:rounded-2xl lg:border lg:border-white/15 lg:bg-slate-900 lg:p-4">
    <span className="rounded-lg border border-white/15 px-2 py-1">Balls {state.balls.length} / 3</span>
    <span className="rounded-lg border border-white/15 px-2 py-1">Shield {state.shield ? "ready" : "off"}</span>
    {state.expandUntil > state.elapsed && <span className="rounded-lg border border-cyan-200/50 px-2 py-1">Wide {timed(state.expandUntil)}</span>}
    {state.pierceUntil > state.elapsed && <span className="rounded-lg border border-amber-200/50 px-2 py-1">Pierce {timed(state.pierceUntil)}</span>}
  </section>;
}
export function FieldGuide() {
  return <div className="space-y-4 text-xs leading-6">
    <p>Move with <strong className="text-white">A / D or arrow keys</strong>. Mouse movement or dragging the arena also moves the paddle. Space launches; P or Escape pauses. Hold the on-screen arrows for precise movement.</p>
    <p>Edge hits produce wider angles. Reinforced bricks show <strong className="text-white">II / III</strong> for remaining hits. A <strong className="text-white">+</strong> marks a power-up brick.</p>
    <dl className="space-y-2">{(Object.entries(POWER_LABELS) as [keyof typeof POWER_LABELS, string][]).map(([power, label], i) => <div key={power}><dt className="font-semibold text-cyan-100">{["3", "W", "S", "P"][i]} / {label}</dt><dd>{["Up to three balls. Lose a life only when all are gone.", "A wider paddle for 12 seconds. Picking up another refreshes it.", "Stops one ball at the floor. Another pickup does not stack shields.", "Break through reinforced bricks for 12 seconds."][i]}</dd></div>)}</dl>
    <p>Each brick pays <strong className="text-white">100 &times; original strength &times; combo</strong>. Destroy another within 2.5 seconds to build the combo, up to 10&times;. Clear a sector for 500 &times; sector points. Losing a life resets powers and combo.</p>
    <p>Switching tabs automatically pauses. Timed modes count active play, including time spent waiting to launch or advance a sector.</p>
  </div>;
}
export function RunResults({ state, replay, menu }: { state: ArcadeState; replay: () => void; menu: () => void }) {
  return <section aria-labelledby="breakout-result-title" className="mx-auto max-w-lg space-y-5 rounded-3xl border border-cyan-200/30 bg-slate-900 p-6 text-center">
    <Trophy aria-hidden="true" className="mx-auto h-10 w-10 text-cyan-200" />
    <p className="text-xs uppercase tracking-widest text-cyan-200">{MODE_TITLES[state.mode]} / Solo result</p>
    <h2 id="breakout-result-title" className="font-display text-3xl">{state.result === "cleared" ? "All sectors cleared" : state.result === "time" ? "Time's up. Nice flight." : "One more flight?"}</h2>
    <p className="text-4xl font-semibold tabular-nums text-cyan-100">{state.score.toLocaleString()} <span className="text-sm text-slate-300">pts</span></p>
    <dl className="grid grid-cols-3 gap-3 text-sm">{[["Bricks", state.destroyed], ["Best combo", `${state.bestCombo}\u00d7`], ["Returns", state.returns]].map(([label, value]) => <div key={label}><dt className="text-xs text-slate-400">{label}</dt><dd className="mt-1 font-semibold tabular-nums">{value}</dd></div>)}</dl>
    <p className="text-xs leading-6 text-slate-400">Finished results save automatically to your account, with a local best when optional storage is allowed. No coins or XP are awarded; scores are client-reported, not verified competition.</p>
    <div className="flex flex-wrap justify-center gap-2"><button type="button" className={primaryClass} onClick={replay}>Play again</button><button type="button" className={buttonClass} onClick={menu}>Choose mode</button></div>
  </section>;
}
