import { useCallback, useEffect, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, HelpCircle, Moon, Sun, Pause, Play, Settings2, Eye, EyeOff } from "lucide-react";
import { createInitialState, gameReducer } from "./engine/gameReducer";
import { useGameLoop } from "./hooks/useGameLoop";
import { useKeyboardControls } from "./hooks/useKeyboardControls";
import { useTouchControls } from "./hooks/useTouchControls";
import { tetrisAudio } from "./services/audioService";
import { loadTetrisData } from "./services/storageService";
import type { Challenge, GameAction } from "./types";
import { readArcade, writeArcade, recordRun, retainRecords, DEFAULT_BINDINGS, type ArcadeSave, type Control } from "./arcade/storage";
import { dailySeed, isTimed, modeTitle, BLOCK_COLORS } from "./arcade/rules";
import { ColorBoard, ControlDeck, MiniPiece, buttonClass, primaryClass } from "./arcade/Board";
import { DesktopArena, MobileArena } from "./arcade/Layouts";
import { ModeMenu, RunResults, RunStats, SettingsDialog } from "./arcade/Screens";
import { useViewport } from "../../lib/useViewport";
import { useTheme } from "../../lib/useTheme";
import { useHaptics } from "../../hooks/useHaptics";
import Modal from "../../components/Modal";
import { readConsent, subscribeConsent } from "../../lib/privacy/consent";

const canSave = () => readConsent()?.choice !== "essential-only";
const LANDSCAPE_QUERY = "(min-width: 480px) and (max-width: 1023px) and (max-height: 600px)";
const compactLandscape = () => typeof window !== "undefined" && Boolean(window.matchMedia?.(LANDSCAPE_QUERY).matches);
const subscribeLandscape = (onChange: () => void) => {
  const query = window.matchMedia?.(LANDSCAPE_QUERY);
  query?.addEventListener("change", onChange);
  return () => query?.removeEventListener("change", onChange);
};

const fallbackSave = (): ArcadeSave => ({ version: 1, records: [], run: null, bindings: { ...DEFAULT_BINDINGS }, sound: true, volume: 0.5, effects: true });
function loadSave() {
  try { return { data: readArcade(), error: "" }; }
  catch (error) { return { data: fallbackSave(), error: `Saved data could not be read: ${error instanceof Error ? error.message : "Storage unavailable"}` }; }
}

export default function BrickTetrisGame() {
  const [loaded] = useState(loadSave);
  const [data, setData] = useState(loaded.data);
  const [error, setError] = useState(loaded.error);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [bindingError, setBindingError] = useState("");
  const [speed, setSpeed] = useState(1000);
  const [legacy] = useState(loadTetrisData);
  const storageAllowed = useSyncExternalStore(subscribeConsent, canSave, () => false);
  const [state, dispatch] = useReducer(gameReducer, undefined, () => ({ ...createInitialState(legacy.bestClassicScore), status: "menu" as const }));
  const [theme, toggleTheme] = useTheme();
  const viewport = useViewport();
  const landscape = useSyncExternalStore(subscribeLandscape, compactLandscape, () => false);
  const mobileLayout = viewport === "mobile" || landscape;
  const haptics = useHaptics();
  const boardRef = useRef<HTMLDivElement>(null);
  const latest = useRef({ state, data });
  latest.current = { state, data };
  const recorded = useRef(false);

  const persist = useCallback((next: ArcadeSave) => {
    setData(next);
    if (loaded.error || !canSave()) return;
    try { writeArcade(next); setError(""); }
    catch (cause) { setError(`Progress could not be saved on this device. ${cause instanceof Error ? cause.message : "Storage unavailable"}`); }
  }, [loaded.error]);

  const act = useCallback((action: GameAction) => {
    if (action.type !== "PAUSE_TOGGLE" && latest.current.state.status !== "playing") return;
    dispatch(action);
    if (action.type === "HARD_DROP") { tetrisAudio.playHardDrop(); haptics.subtle(); }
    else if (action.type === "ROTATE_CW" || action.type === "ROTATE_CCW") tetrisAudio.playRotate();
    else if (action.type === "HOLD_PIECE") tetrisAudio.playHold();
  }, [haptics]);

  useGameLoop(state.status, dispatch);
  useKeyboardControls(state, act, data.bindings);
  useTouchControls(state, act, boardRef, landscape ? "landscape" : viewport);

  useEffect(() => { tetrisAudio.setMuted(!data.sound); tetrisAudio.setVolume(data.volume); }, [data.sound, data.volume]);
  useEffect(() => {
    if (state.status === "line-clearing") {
      tetrisAudio.playLineClear();
      haptics.subtle();
    }
    if (state.status === "game-over" && !recorded.current) {
      recorded.current = true;
      tetrisAudio.playGameOver();
      const current = latest.current;
      const record = recordRun(current.state);
      persist({ ...current.data, run: null, records: retainRecords([record, ...current.data.records]) });
    }
  }, [state.status, haptics, persist]);

  useEffect(() => {
    const save = () => {
      const { state: run, data: saved } = latest.current;
      if (!isTimed(run.challenge) && ["playing", "line-clearing", "paused"].includes(run.status)) {
        persist({ ...saved, run: { ...run, status: "paused", pausedFrom: run.status === "line-clearing" ? "line-clearing" : run.status === "paused" ? run.pausedFrom : "playing" } });
      }
    };
    const timer = window.setInterval(save, 5000);
    window.addEventListener("pagehide", save);
    return () => { clearInterval(timer); window.removeEventListener("pagehide", save); };
  }, [persist]);

  const start = (mode: Challenge) => {
    recorded.current = false;
    const date = new Date().toISOString().slice(0, 10);
    dispatch({ type: "START_GAME", payload: { challenge: mode, practiceSpeed: speed, seed: mode === "daily" ? dailySeed(date) : undefined, dailyDate: mode === "daily" ? date : undefined } });
    persist({ ...data, run: null });
  };
  const pause = () => dispatch({ type: "PAUSE_TOGGLE" });
  const openPanel = (which: "settings" | "help") => {
    if (state.status === "playing" || state.status === "line-clearing") pause();
    if (which === "settings") setSettingsOpen(true); else setHelpOpen(true);
  };
  const menu = () => {
    if (!isTimed(state.challenge) && ["playing", "line-clearing", "paused"].includes(state.status)) persist({ ...data, run: state });
    dispatch({ type: "BACK_TO_MENU" });
    setExitOpen(false);
  };
  const bind = (control: Control, code: string) => {
    if (!/^(Arrow(Left|Right|Up|Down)|Key[A-Z]|Digit[0-9]|Space|Escape|ShiftLeft|ShiftRight)$/.test(code)) {
      setBindingError("Choose a letter, number, arrow, Shift, Space or Escape."); return;
    }
    if (Object.entries(data.bindings).some(([other, key]) => other !== control && key === code)) {
      setBindingError("That key is already assigned. Choose a different key."); return;
    }
    setBindingError("");
    persist({ ...data, bindings: { ...data.bindings, [control]: code } });
  };
  const inRun = ["playing", "line-clearing", "paused"].includes(state.status);
  const hold = <div className={`flex min-w-0 items-center justify-between gap-2 rounded-2xl border border-rim bg-surface-1 p-2 ${mobileLayout ? "min-h-12 shrink" : "min-h-16 flex-col items-start rounded-3xl p-5"}`}>
    <div><h2 className="text-[10px] font-bold uppercase tracking-widest text-ink-mid">Hold</h2>{!mobileLayout && <p className="mt-1 text-xs text-ink-mid">One swap per shape</p>}</div><MiniPiece type={state.heldPiece} small={mobileLayout} />
  </div>;
  const next = <div className={`flex min-w-0 items-center gap-2 rounded-2xl border border-rim bg-surface-1 p-2 ${mobileLayout ? "min-h-12" : "min-h-16 flex-col items-start rounded-3xl p-5"}`}>
    <h2 className="text-[10px] font-bold uppercase tracking-widest text-ink-mid">Next</h2>
    <div className={`flex min-w-0 gap-1 ${mobileLayout ? "" : "flex-col gap-6"}`}>{state.nextQueue.slice(0, mobileLayout ? 3 : 4).map((type, i) => <MiniPiece key={i} type={type} small={mobileLayout} />)}</div>
  </div>;
  const arenaProps = {
    board: <ColorBoard state={state} effects={data.effects} fitHeight={mobileLayout} />, hold, next,
    stats: <RunStats state={state} compact={mobileLayout} />,
    controls: <ControlDeck dispatch={act} canHold={state.canHold && state.status === "playing"} />,
    boardRef,
  };

  return <div className="min-h-[100svh] bg-surface-0 text-ink-hi selection:bg-violet-300/30">
    <div className="flex h-1.5" aria-hidden="true">{Object.values(BLOCK_COLORS).slice(0, 7).map(color => <span key={color} className="flex-1" style={{ background: color }} />)}</div>
    <header className="mx-auto mb-4 flex w-full max-w-6xl flex-wrap items-center justify-between gap-1 px-3 py-3 sm:px-8">
      <div className="flex items-center gap-1 sm:gap-4">
        {inRun ? <button type="button" className={`${buttonClass} min-w-11 !px-2`} aria-label="Choose mode" onClick={() => { if (state.status !== "paused") pause(); setExitOpen(true); }}><ArrowLeft size={18} /></button>
          : <Link to="/" className={`${buttonClass} min-w-11 !px-2`} aria-label="Back to BHALYAM"><ArrowLeft size={18} /></Link>}
        <div><p className="font-[Fredoka] text-base font-semibold leading-none sm:text-2xl">Brick Blocks<span className="text-violet-500">.</span></p><p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-ink-mid">{inRun ? modeTitle(state.challenge) : "Color Arcade"}</p></div>
      </div>
      <nav aria-label="Game settings" className="flex gap-1">
        {inRun && <button type="button" className={`${buttonClass} min-w-11 !px-2`} aria-label={state.status === "paused" ? "Resume game" : "Pause game"} onClick={pause}>{state.status === "paused" ? <Play size={18} /> : <Pause size={18} />}</button>}
        <button type="button" className={`${buttonClass} min-w-11 !px-2`} aria-label="Toggle light and dark theme" onClick={toggleTheme}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button>
        <button type="button" className={`${buttonClass} min-w-11 hidden !px-2 sm:flex`} aria-label="How to play" onClick={() => openPanel("help")}><HelpCircle size={18} /></button>
        <button type="button" className={`${buttonClass} min-w-11 !px-2`} aria-label="Open settings" onClick={() => openPanel("settings")}><Settings2 size={18} /></button>
      </nav>
    </header>
    {error && <div role="alert" className="mx-auto mb-4 max-w-3xl rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-ink-hi">{error}{loaded.error && <p>Saving is disabled to protect your existing data. Reload after resolving the storage problem.</p>}</div>}
    {!storageAllowed && !inRun && <p role="status" className="mx-auto mb-4 max-w-3xl px-4 text-center text-xs text-ink-mid">Privacy is set to essential only. New records, settings and saved runs last only for this visit.</p>}
    {state.status === "menu" && <ModeMenu onStart={start} saved={data.run !== null} onResume={() => { if (data.run) { recorded.current = false; dispatch({ type: "RESTORE_GAME", payload: data.run }); } }} records={data.records} legacyBest={legacy.bestClassicScore} legacyPentix={legacy.bestPentixScore} speed={speed} setSpeed={setSpeed} />}
    {inRun && <>
      {mobileLayout ? <MobileArena {...arenaProps} landscape={landscape} /> : <DesktopArena {...arenaProps} />}
      <p className="mx-auto mb-3 max-w-md px-3 text-center text-[11px] text-ink-mid">Tap board to rotate · drag to move · swipe up to drop</p>
      {!storageAllowed && <p className="mx-auto mb-4 max-w-md px-4 text-center text-xs text-ink-mid">Essential-only privacy: progress lasts for this visit.</p>}
      <div className="mx-auto flex max-w-md flex-wrap items-center justify-center gap-3 pb-5">
        <button type="button" className={`${buttonClass} text-xs`} onClick={() => dispatch({ type: "TOGGLE_GHOST" })} aria-pressed={state.settings.ghostPieceEnabled}>{state.settings.ghostPieceEnabled ? <Eye size={16} /> : <EyeOff size={16} />}Landing guide</button>
        <button type="button" className={`${buttonClass} text-xs`} onClick={() => openPanel("help")}><HelpCircle size={16} />How to play</button>
      </div>
      {state.status === "paused" && <div className="mx-auto mb-6 flex max-w-md flex-col gap-2 px-3">
        <button type="button" className={primaryClass} onClick={pause}><Play size={18} />Resume game</button>
        <p className="text-center text-xs text-ink-mid">{isTimed(state.challenge) ? "This mode's clock keeps running while paused." : storageAllowed ? "Your run saves on this device every 5 seconds." : "Saving is off in your privacy settings."}</p>
      </div>}
    </>}
    {state.status === "game-over" && <RunResults state={state} onAgain={() => start(state.challenge)} onMenu={menu} />}
    <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} data={data} onChange={persist} haptics={haptics.enabled} toggleHaptics={haptics.toggle} bindingError={bindingError} onBind={bind} />
    <Modal open={helpOpen} onClose={() => setHelpOpen(false)} mobileSheet ariaLabel="How to play Brick Blocks" panelClassName="max-w-lg">
      <div className="rounded-3xl bg-surface-1 p-6 text-ink-hi"><h2 className="font-[Fredoka] text-3xl">A little room to think.</h2>
        <ol className="my-5 list-decimal space-y-3 pl-5 text-sm text-ink-mid"><li>Move and rotate falling shapes to fill a complete row. Full rows disappear.</li><li>Use the dashed landing guide before a hard drop. Hold keeps a shape for later, once per placement.</li><li>Clear several rows together and on consecutive placements for bigger scores.</li><li>On touch screens, tap the board to rotate, drag sideways to move, swipe down to soften the fall or swipe up to drop.</li><li>Use the on-screen buttons or remap your keyboard in Settings. Colors are supported by each shape's distinct geometry.</li></ol>
        <p className="mb-4 text-xs text-ink-mid">Sprint and Daily Circuit target 40 lines. Score Attack lasts two minutes. Timed clocks continue during pauses. Free Play has a fixed fall speed and no time limit.</p>
        <button type="button" className={`${primaryClass} w-full`} onClick={() => setHelpOpen(false)}>Got it</button>
      </div>
    </Modal>
    <Modal open={exitOpen} onClose={() => setExitOpen(false)} mobileSheet ariaLabel="Leave this run?" panelClassName="max-w-sm">
      <div className="rounded-3xl bg-surface-1 p-6 text-ink-hi"><h2 className="font-[Fredoka] text-2xl">Choose another rhythm?</h2><p className="my-4 text-sm text-ink-mid">{isTimed(state.challenge) ? "This timed run will end without a record." : storageAllowed ? "Your current run will be saved on this device." : "Your current run will remain available for this visit only."}</p>
        <div className="flex flex-col gap-2"><button type="button" className={buttonClass} onClick={() => setExitOpen(false)}>Stay here</button><button type="button" className={primaryClass} onClick={menu}>Choose mode</button></div>
      </div>
    </Modal>
  </div>;
}
