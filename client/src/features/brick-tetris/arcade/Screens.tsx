import { ArrowRight, Clock3, Flag, Play, Trophy, Layers3, X } from "lucide-react";
import type { Challenge, GameState } from "../types";
import type { RunRecord, ArcadeSave, Control } from "./storage";
import { DEFAULT_BINDINGS } from "./storage";
import { MODES, BLOCK_COLORS, modeTitle, formatTime } from "./rules";
import { buttonClass, primaryClass, MiniPiece } from "./Board";
import Modal from "../../../components/Modal";

export function ModeMenu({ onStart, saved, onResume, records, legacyBest, legacyPentix, speed, setSpeed }: {
  onStart: (mode: Challenge) => void; saved: boolean; onResume: () => void;
  records: RunRecord[]; legacyBest: number; legacyPentix: number; speed: number; setSpeed: (speed: number) => void;
}) {
  return <main className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-8">
    <section className="grid items-center gap-6 pb-8 pt-4 lg:grid-cols-[1fr_280px] lg:py-10">
      <div>
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-rim bg-surface-1 px-3 py-1.5 text-xs font-bold text-ink-mid"><span className="h-2 w-2 rounded-full bg-violet-500" />BHALYAM · SOLO ARCADE</div>
        <h1 className="font-[Fredoka] text-5xl font-semibold leading-[0.98] tracking-tight text-ink-hi sm:text-7xl">Small blocks.<br /><span className="text-violet-600 dark:text-violet-400">Big possibilities.</span></h1>
        <p className="mt-5 max-w-lg text-sm leading-relaxed text-ink-mid sm:text-base">A colorful little escape. Stack your shapes, chase a clean board, and find the mode that moves you.</p>
        {saved && <button type="button" className={`${primaryClass} mt-5`} onClick={onResume}><Play size={18} />Resume saved run</button>}
      </div>
      <div aria-hidden="true" className="hidden rotate-6 rounded-[36px] border border-rim bg-surface-1 p-7 shadow-xl lg:block">
        <div className="grid grid-cols-7 gap-1.5 rounded-2xl bg-[#101d34] p-4">
          {Array.from({ length: 63 }, (_, i) => {
            const empty = i < 21 && i % 7 < 5 || i % 7 === 3 && i < 49;
            return <span key={i} className="aspect-square rounded-[4px]" style={{ background: empty ? "#ffffff08" : Object.values(BLOCK_COLORS)[Math.floor(i / 7) % 7], boxShadow: empty ? undefined : "inset 0 3px 0 #ffffff60, inset 0 -3px 0 #00000030" }} />;
          })}
        </div>
        <p className="mt-4 text-center font-[Fredoka] text-xl text-ink-hi">One more line.</p>
      </div>
    </section>
    <div className="mb-4 flex items-center justify-between"><h2 className="font-[Fredoka] text-2xl text-ink-hi">Choose your rhythm</h2><span className="text-xs font-semibold text-ink-mid">6 ways to play</span></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {MODES.map((mode, index) => {
        const personal = records.filter(r => r.mode === mode.id && (mode.id !== "daily" || r.dailyDate === new Date().toISOString().slice(0, 10)));
        const times = personal.filter(r => r.complete);
        const best = mode.id === "sprint" || mode.id === "daily"
          ? times.length ? formatTime(Math.min(...times.map(r => r.elapsedMs))) : "No finish yet"
          : Math.max(mode.id === "marathon" ? legacyBest : mode.id === "pentix" ? legacyPentix : 0, ...personal.map(r => r.score)).toLocaleString();
        return <article key={mode.id} className="relative flex flex-col overflow-hidden rounded-3xl border border-rim bg-surface-1 p-5 shadow-sm">
          <span className="absolute inset-x-0 top-0 h-1" style={{ background: mode.color }} />
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2"><MiniPiece type={["T", "I", "Z", "O", "S", "F"][index] as keyof typeof BLOCK_COLORS} small /></div>
            <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-ink-mid">{mode.badge}</span>
          </div>
          <h3 className="mt-4 font-[Fredoka] text-2xl text-ink-hi">{mode.title}</h3>
          <p className="mb-5 mt-1 min-h-10 text-sm leading-relaxed text-ink-mid">{mode.detail}</p>
          {mode.id === "practice" && <label className="mb-3 flex flex-col gap-1 text-xs font-semibold text-ink-mid">Fall speed · {speed} ms per row
            <input aria-label="Practice fall speed" type="range" min="200" max="2000" step="100" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="min-h-11 w-full accent-violet-600" />
          </label>}
          <div className="mt-auto flex items-center justify-between gap-2 border-t border-rim pt-4">
            <div><p className="text-[10px] uppercase tracking-wider text-ink-mid">Device best</p><p className="font-mono text-sm font-bold text-ink-hi">{best}</p></div>
            <button type="button" aria-label={`Play ${mode.title}`} className={buttonClass} onClick={() => onStart(mode.id)}>Play<ArrowRight size={16} /></button>
          </div>
        </article>;
      })}
    </div>
    <p className="mt-5 text-center text-xs text-ink-mid">Finished results save to your account and keep device bests when storage is allowed. Sprint and Daily Circuit save completion times only after 40 lines. Free Play stays a separate practice record. Daily seeds are repeatable, not verified competition.</p>
  </main>;
}

export function RunStats({ state, compact = false }: { state: GameState; compact?: boolean }) {
  const timed = state.challenge === "attack";
  return <div className={`grid grid-cols-3 rounded-3xl border border-rim bg-surface-1 ${compact ? "gap-1 p-1" : "gap-1 p-2 md:gap-2 md:p-3"}`}>
    {[
      ["Score", state.score.toLocaleString()],
      [timed ? "Remaining" : "Time", formatTime(timed ? 120000 - state.elapsedMs : state.elapsedMs)],
      ["Lines", `${state.linesCleared}${["sprint", "daily"].includes(state.challenge) ? "/40" : ""}`],
    ].map(([title, value]) => <div key={title} className="min-w-0 text-center"><p className={`font-bold uppercase text-ink-mid ${compact ? "text-[9px]" : "text-[10px] tracking-wider"}`}>{title}{compact && title === "Score" ? ` · L${state.level}${state.combo > 0 ? ` ×${state.combo + 1}` : ""}` : ""}{compact && title === "Lines" && state.backToBack ? " · B2B" : ""}</p><p className={`break-all font-mono font-black tabular-nums text-ink-hi ${compact ? "text-sm" : "mt-1 text-base sm:text-lg"}`}>{value}</p></div>)}
    <p className={compact ? "sr-only" : "col-span-3 border-t border-rim pt-1 text-center text-[11px] font-bold text-ink-mid md:pt-2"}>Level {state.level}{state.combo > 0 ? ` · Combo ${state.combo + 1}` : ""}{state.backToBack ? " · Back-to-back" : ""}</p>
  </div>;
}

export function RunResults({ state, onAgain, onMenu }: { state: GameState; onAgain: () => void; onMenu: () => void }) {
  const complete = state.outcome === "complete";
  return <main className="mx-auto w-full max-w-xl px-4 py-8">
    <section className="overflow-hidden rounded-[32px] border border-rim bg-surface-1 p-6 text-center shadow-xl sm:p-10">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-500/15 text-violet-600 dark:text-violet-300">{complete ? <Flag size={32} /> : <Trophy size={32} />}</div>
      <p className="mt-5 text-xs font-bold uppercase tracking-widest text-ink-mid">{modeTitle(state.challenge)}</p>
      <h1 className="mt-2 font-[Fredoka] text-4xl text-ink-hi">{complete ? "Beautifully done." : "That's a wrap."}</h1>
      <p className="mt-2 text-sm text-ink-mid">{complete ? "Your target is complete." : "The stack reached the top. A fresh board is waiting."}</p>
      <p className="mb-6 mt-6 font-mono text-5xl font-black text-violet-600 dark:text-violet-300">{state.score.toLocaleString()}<span className="ml-2 text-sm text-ink-mid">pts</span></p>
      <RunStats state={state} />
      <div className="my-5 flex justify-center gap-8 text-sm text-ink-mid"><span><Layers3 className="mx-auto mb-1 h-5 w-5" />{state.piecesPlaced} shapes</span><span><Clock3 className="mx-auto mb-1 h-5 w-5" />{state.elapsedMs > 0 ? (state.piecesPlaced * 60000 / state.elapsedMs).toFixed(1) : "0"} shapes/min</span></div>
      <div className="flex flex-col gap-2"><button type="button" className={primaryClass} onClick={onAgain}>Play again<Play size={16} /></button><button type="button" className={buttonClass} onClick={onMenu}>Choose another mode</button></div>
    </section>
  </main>;
}

export function SettingsDialog({ open, onClose, data, onChange, haptics, toggleHaptics, bindingError, onBind }: {
  open: boolean; onClose: () => void; data: ArcadeSave; onChange: (next: ArcadeSave) => void;
  haptics: boolean; toggleHaptics: () => void; bindingError: string; onBind: (control: Control, code: string) => void;
}) {
  return <Modal open={open} onClose={onClose} mobileSheet ariaLabel="Brick Blocks settings" panelClassName="max-w-lg">
    <div className="max-h-[85svh] overflow-y-auto rounded-3xl bg-surface-1 p-5 text-ink-hi">
      <div className="mb-4 flex items-center justify-between"><h2 className="font-[Fredoka] text-2xl">Make it yours</h2><button type="button" className={buttonClass} onClick={onClose} aria-label="Close settings"><X size={18} /></button></div>
      <div className="space-y-3">
        {([
          ["Sound", data.sound, () => onChange({ ...data, sound: !data.sound })],
          ["Particles and clear effects", data.effects, () => onChange({ ...data, effects: !data.effects })],
          ["Haptics (supported devices)", haptics, toggleHaptics],
        ] as const).map(([label, checked, toggle]) => <label key={label} className="flex min-h-11 items-center justify-between gap-3 text-sm font-semibold">{label}<input className="h-5 w-5 accent-violet-600" type="checkbox" checked={checked} onChange={toggle} /></label>)}
        <label className="flex flex-col gap-1 text-sm">Volume · {Math.round(data.volume * 100)}%<input aria-label="Volume" type="range" min="0" max="1" step="0.05" value={data.volume} onChange={e => onChange({ ...data, volume: Number(e.target.value) })} className="min-h-11 accent-violet-600" /></label>
        <h3 className="pt-2 text-sm font-bold">Keyboard controls</h3>
        <p className="text-xs text-ink-mid">Focus a key field and press a letter, number, arrow, Shift, Space or Escape. Each action needs a different key.</p>
        {bindingError && <p role="alert" className="text-sm text-danger">{bindingError}</p>}
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(data.bindings) as Control[]).map(control => <label key={control} className="text-[11px] font-bold text-ink-mid">
            {control.replace(/_/g, " ").toLowerCase()}
            <input readOnly aria-label={`Key for ${control}`} className="mt-1 min-h-11 w-full rounded-xl border border-rim bg-surface-2 px-3 text-sm text-ink-hi focus-visible:ring-2 focus-visible:ring-violet-500"
              value={keyLabel(data.bindings[control])}
              onKeyDown={e => { if (e.code !== "Tab") { e.preventDefault(); e.stopPropagation(); onBind(control, e.code); } }} />
          </label>)}
        </div>
        <button type="button" className={`${buttonClass} w-full`} onClick={() => onChange({ ...data, bindings: { ...DEFAULT_BINDINGS } })}>Reset keyboard controls</button>
      </div>
    </div>
  </Modal>;
}

export const keyLabel = (key: string) => key.replace("Key", "").replace("Digit", "").replace("Arrow", "");
