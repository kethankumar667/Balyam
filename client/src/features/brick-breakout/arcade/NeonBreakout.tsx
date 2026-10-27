import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, HelpCircle, Pause, Settings2, Zap } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import Modal from "../../../components/Modal";
import { useViewport } from "../../../lib/useViewport";
import { NeonBoard } from "./Board";
import { BreakoutBoardDesktop, BreakoutBoardMobile } from "./Layouts";
import { useArcade } from "./useArcade";
import { MODE_TITLES } from "./rules";
import { buttonClass, primaryClass, FieldGuide, ModeMenu, PowerStatus, RunResults, RunStats } from "./Screens";

export function NeonBreakout({ onExit }: { onExit?: () => void }) {
  const game = useArcade();
  const viewport = useViewport();
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const [panel, setPanel] = useState<"settings" | "help" | null>(null);
  const [leaving, setLeaving] = useState<"menu" | "lounge" | null>(null);
  game.inputBlocked.current = Boolean(panel || leaving);
  const alreadyPaused = useRef(false);
  const { state, data } = game;
  const leave = (destination: "menu" | "lounge") => {
    if (game.menu || state.status === "finished") {
      if (destination === "menu") game.returnToMenu();
      else if (onExit) onExit(); else navigate("/games");
      return;
    }
    alreadyPaused.current = game.stateRef.current.status === "paused";
    game.pause(); setLeaving(destination);
  };
  const cancelLeave = () => { setLeaving(null); if (!alreadyPaused.current) game.resume(); };
  const openPanel = (next: "settings" | "help") => { if (!game.menu) game.pause(); setPanel(next); };
  const controls = <div className="grid grid-cols-[1fr_1.5fr_1fr] gap-2">
    {(["left", "launch", "right"] as const).map(direction => direction === "launch" ?
      <button key={direction} type="button" className={primaryClass} onClick={game.fire} disabled={state.status !== "serve"} aria-label="Launch ball"><Zap className="h-4 w-4" aria-hidden="true" />Launch</button> :
      <button key={direction} type="button" aria-label={`Move paddle ${direction}`} className={`${buttonClass} touch-none select-none`}
        onPointerDown={event => {
          event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); game.keys.current.add(direction);
        }}
        onPointerUp={event => { game.keys.current.delete(direction); event.currentTarget.releasePointerCapture(event.pointerId); }}
        onPointerCancel={() => game.keys.current.delete(direction)}
        onLostPointerCapture={() => game.keys.current.delete(direction)}
        onClick={event => { if (event.detail === 0) game.move(game.stateRef.current.paddleX + (direction === "left" ? -24 : 24)); }}>
        {direction === "left" ? <ArrowLeft aria-hidden="true" className="h-5 w-5" /> : <ArrowRight aria-hidden="true" className="h-5 w-5" />}
      </button>)}
  </div>;
  const board = <div className="relative flex h-full w-full min-w-0 items-center justify-center">
    <NeonBoard stateRef={game.stateRef} effects={data.effects && !reduce} onMove={game.move} onLaunch={game.fire}
      onPause={() => { if (game.stateRef.current.status === "paused") game.resume(); else game.pause(); }} />
    {(state.status === "paused" || state.status === "sector-clear") && <section className="absolute inset-2 flex flex-col items-center justify-center gap-4 rounded-xl border border-cyan-100/20 bg-slate-950/95 p-4 text-center">
      <p className="text-xs uppercase tracking-widest text-cyan-200">Neon flight control</p>
      <h2 className="font-display text-2xl">{state.status === "paused" ? "Flight paused" : `Sector ${state.level} clear`}</h2>
      <p className="max-w-[230px] text-sm leading-6 text-slate-300">{state.status === "paused" ? "Take a breath. Your run and timer are waiting." : "Formation cleared. Your timer keeps running until you pause."}</p>
      <button type="button" className={primaryClass} onClick={state.status === "paused" ? game.resume : game.next}>{state.status === "paused" ? "Resume game" : "Next sector"}</button>
    </section>}
  </div>;
  const Layout = viewport === "mobile" ? BreakoutBoardMobile : BreakoutBoardDesktop;
  return <div className="min-h-svh bg-[#070d1d] font-sans text-slate-100 selection:bg-cyan-200 selection:text-slate-950">
    <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-5 sm:py-5">
      <div className="flex items-center gap-3">
        {game.menu && !onExit ? <Link to="/games" className={buttonClass} aria-label="Back to games"><ArrowLeft className="h-4 w-4" /></Link> :
          <button type="button" onClick={() => leave("lounge")} className={buttonClass} aria-label="Back to games"><ArrowLeft className="h-4 w-4" /></button>}
        <div><p className="text-[9px] font-semibold uppercase tracking-[.25em] text-cyan-200">Bhalyam arcade</p><h1 className="font-display text-lg leading-tight sm:text-2xl">Brick Breakout</h1></div>
      </div>
      <nav aria-label="Arcade controls" className="flex flex-wrap gap-2">
        {!game.menu && state.status !== "finished" && <button type="button" onClick={() => { if (state.status === "paused") game.resume(); else game.pause(); }} className={buttonClass} aria-label={state.status === "paused" ? "Resume run" : "Pause game"}><Pause className="h-4 w-4" aria-hidden="true" /><span className="hidden sm:inline">{state.status === "paused" ? "Resume" : "Pause"}</span></button>}
        <button type="button" className={buttonClass} onClick={() => openPanel("help")} aria-label="How to play"><HelpCircle className="h-4 w-4" aria-hidden="true" /></button>
        <button type="button" className={buttonClass} onClick={() => openPanel("settings")} aria-label="Arcade settings"><Settings2 className="h-4 w-4" aria-hidden="true" /></button>
      </nav>
    </header>
    {game.error && <p role="alert" className="mx-3 mb-4 rounded-xl border border-amber-300/50 bg-amber-950 p-3 text-sm text-amber-100">{game.error}</p>}
    {!game.canSave && <p className="mx-auto max-w-4xl px-4 pb-3 text-xs text-amber-200">Essential-only storage: play normally; new records and preferences last only in this tab.</p>}
    {game.menu ? <ModeMenu data={data} start={game.start} /> : <>
      <div className="mx-auto mb-3 flex max-w-6xl flex-wrap items-center justify-between gap-2 px-3 sm:px-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-200">{MODE_TITLES[state.mode]}{state.mode === "daily" ? ` / ${state.date} UTC` : ""}</p>
        <button type="button" className={buttonClass} onClick={() => leave("menu")}>Choose mode</button>
      </div>
      {state.status === "finished" ? <div className="px-3 py-6"><RunResults state={state} replay={() => game.start(state.mode)} menu={game.returnToMenu} /></div> :
        <Layout board={board} stats={<RunStats state={state} data={data} />} powers={<PowerStatus state={state} />} controls={controls} guide={<FieldGuide />} />}
      <p role="status" aria-live="polite" className="mx-auto max-w-4xl px-4 py-3 text-center text-xs text-slate-300">{state.notice}</p>
    </>}
    {panel && <Modal open onClose={() => setPanel(null)} ariaLabelledBy="breakout-panel-title" mobileSheet panelClassName="w-full max-w-lg rounded-t-3xl border border-white/20 bg-slate-900 p-6 text-slate-100 md:rounded-3xl">
      <h2 id="breakout-panel-title" className="mb-5 font-display text-xl">{panel === "help" ? "Pilot's field guide" : "Arcade settings"}</h2>
      <div className="space-y-4">
        {panel === "help" ? <div className="rounded-2xl bg-slate-900 p-4 text-slate-200"><FieldGuide /></div> : <>
          <label className="flex min-h-11 items-center justify-between gap-4 text-sm">Sound cues<input type="checkbox" checked={data.sound} onChange={event => game.persist({ ...data, sound: event.target.checked })} className="h-5 w-5 accent-cyan-600" /></label>
          <label className="flex min-h-11 items-center justify-between gap-4 text-sm">Trails & impact particles<input type="checkbox" checked={data.effects} onChange={event => game.persist({ ...data, effects: event.target.checked })} className="h-5 w-5 accent-cyan-600" /></label>
          <p className="text-xs leading-6">Reduced-motion preferences automatically disable trails and particles. Settings do not change scoring.</p>
          <p className="text-xs leading-6">Scores stay on this device. Existing classic records remain historical. No run is uploaded as a verified competitive result.</p>
        </>}
        <button type="button" className={buttonClass} onClick={() => setPanel(null)}>Done</button>
      </div>
    </Modal>}
    {leaving && <Modal open onClose={cancelLeave} ariaLabelledBy="breakout-leave-title" mobileSheet panelClassName="w-full max-w-md rounded-t-3xl border border-white/20 bg-slate-900 p-6 text-slate-100 md:rounded-3xl">
      <h2 id="breakout-leave-title" className="mb-4 font-display text-xl">Leave this run?</h2>
      <p className="text-sm leading-6">This run is paused. Leaving discards the unfinished run; completed device records are kept.</p>
      <div className="mt-5 flex flex-wrap gap-2"><button type="button" className={primaryClass} onClick={cancelLeave}>Keep playing</button><button type="button" className={buttonClass} onClick={() => {
        const destination = leaving; setLeaving(null); game.returnToMenu();
        if (destination === "lounge") { if (onExit) onExit(); else navigate("/games"); }
      }}>Leave run</button></div>
    </Modal>}
  </div>;
}
