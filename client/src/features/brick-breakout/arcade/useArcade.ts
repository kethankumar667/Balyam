import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { advance, createRun, launch, moveTo, nextSector, pauseRun, resumeRun, STEP, type ArcadeState, type Mode } from "./rules";
import { defaultSave, loadArcade, recordRun, saveArcade, type ArcadeSave } from "./storage";
import { breakoutAudio } from "../services/audioService";
import { readConsent, subscribeConsent } from "../../../lib/privacy/consent";

const storageAllowed = () => readConsent()?.choice !== "essential-only";
function load() {
  try { return { data: loadArcade(), error: "" }; }
  catch (error) {
    return { data: defaultSave(), error: `Saved records could not be read. They will not be overwritten. ${error instanceof Error ? error.message : "Storage unavailable."}` };
  }
}
export function useArcade() {
  const [loaded] = useState(load);
  const [data, setData] = useState(loaded.data);
  const dataRef = useRef(data);
  const [error, setError] = useState(loaded.error);
  const canSave = useSyncExternalStore(subscribeConsent, storageAllowed, () => false);
  const [state, setState] = useState(() => createRun("campaign"));
  const stateRef = useRef(state);
  const [menu, setMenu] = useState(true);
  const menuRef = useRef(menu);
  const keys = useRef(new Set<string>());
  const inputBlocked = useRef(false);
  const recorded = useRef(false);
  const commit = useCallback((next: ArcadeState) => { stateRef.current = next; setState(next); }, []);
  const persist = useCallback((next: ArcadeSave) => {
    dataRef.current = next; setData(next);
    if (loaded.error || !storageAllowed()) return;
    try { saveArcade(next); setError(""); }
    catch (cause) { setError(`Your record is only in this tab: saving failed. ${cause instanceof Error ? cause.message : "Storage unavailable."}`); }
  }, [loaded.error]);
  const pause = useCallback(() => { keys.current.clear(); commit(pauseRun(stateRef.current)); }, [commit]);
  const resume = useCallback(() => commit(resumeRun(stateRef.current)), [commit]);
  const move = useCallback((x: number) => { stateRef.current = moveTo(stateRef.current, x); }, []);
  const fire = useCallback(() => {
    const next = launch(stateRef.current);
    if (next !== stateRef.current) breakoutAudio.playBallLaunch();
    commit(next);
  }, [commit]);
  const start = useCallback((mode: Mode) => {
    const date = new Date().toISOString().slice(0, 10);
    const seed = mode === "daily" ? 0 : crypto.getRandomValues(new Uint32Array(1))[0];
    recorded.current = false; keys.current.clear(); menuRef.current = false; setMenu(false);
    commit(createRun(mode, date, seed));
  }, [commit]);
  const returnToMenu = useCallback(() => { keys.current.clear(); menuRef.current = true; setMenu(true); }, []);
  const next = useCallback(() => commit(nextSector(stateRef.current)), [commit]);
  useEffect(() => { breakoutAudio.setMuted(!data.sound); }, [data.sound]);

  useEffect(() => {
    let raf = 0;
    let previous = 0;
    let accumulator = 0;
    let lastPublish = 0;
    const frame = (now: number) => {
      const gap = previous ? now - previous : 0;
      previous = now;
      if (!menuRef.current && gap > 250) { pause(); accumulator = 0; }
      if (!menuRef.current) {
        const before = stateRef.current;
        accumulator += Math.min(gap, 100);
        while (accumulator >= STEP) {
          const direction = Number(keys.current.has("right")) - Number(keys.current.has("left"));
          stateRef.current = moveTo(stateRef.current, stateRef.current.paddleX + direction * 430 * STEP / 1000);
          stateRef.current = advance(stateRef.current, STEP);
          accumulator -= STEP;
        }
        const current = stateRef.current;
        if (current.destroyed > before.destroyed) breakoutAudio.playBrickDestroy();
        else if (current.returns > before.returns) breakoutAudio.playPaddleBounce();
        if (current.lives < before.lives) breakoutAudio.playLifeLost();
        if (current.status === "sector-clear" && before.status !== "sector-clear") breakoutAudio.playLevelComplete();
        if (current.status === "finished" && !recorded.current) {
          recorded.current = true;
          breakoutAudio.playGameOver();
          persist(recordRun(dataRef.current, current));
        }
        if (now - lastPublish >= 50 || current.status !== before.status) { setState(current); lastPublish = now; }
      } else accumulator = 0;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [pause, persist]);

  useEffect(() => {
    const blur = () => { keys.current.clear(); if (!menuRef.current) pause(); };
    const hidden = () => { if (document.hidden) blur(); };
    const keydown = (event: KeyboardEvent) => {
      if (menuRef.current || inputBlocked.current || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (["ArrowLeft", "KeyA", "ArrowRight", "KeyD"].includes(event.code)) {
        event.preventDefault();
        keys.current.add(event.code === "ArrowLeft" || event.code === "KeyA" ? "left" : "right");
      }
      const target = event.target instanceof HTMLElement ? event.target.tagName : "";
      if (target === "CANVAS") return;
      if (event.code === "Space" && target !== "BUTTON") { event.preventDefault(); if (!event.repeat) fire(); }
      if ((event.code === "KeyP" || event.code === "Escape") && !event.repeat) {
        event.preventDefault();
        if (stateRef.current.status === "paused") resume(); else pause();
      }
    };
    const keyup = (event: KeyboardEvent) => {
      if (["ArrowLeft", "KeyA"].includes(event.code)) keys.current.delete("left");
      if (["ArrowRight", "KeyD"].includes(event.code)) keys.current.delete("right");
    };
    window.addEventListener("keydown", keydown); window.addEventListener("keyup", keyup);
    window.addEventListener("blur", blur); document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("keydown", keydown); window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", blur); document.removeEventListener("visibilitychange", hidden);
    };
  }, [fire, pause, resume]);
  return { state, stateRef, data, error, canSave, menu, keys, inputBlocked, start, pause, resume, move, fire, next, returnToMenu, persist };
}
