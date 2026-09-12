import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "../../../animations/helpers/useReducedMotion";

/**
 * Reveals `text` one character at a time, like an old character-generator
 * typing a caption onto the screen. Resets and retypes whenever `text`
 * changes (a new value is a new caption, not a continuation of the old one).
 *
 * This is a `setInterval`-driven JS reveal, not a CSS animation, so
 * index.css's global `prefers-reduced-motion` catch-all (which only
 * neutralises `animation`/`transition` durations) never reaches it — see
 * that hook's own doc comment. Checked explicitly here instead.
 */
export function useTypewriter(text: string, speedMs = 22): string {
  const reducedMotion = useReducedMotion();
  const [shown, setShown] = useState(reducedMotion ? text : "");
  const textRef = useRef(text);

  useEffect(() => {
    textRef.current = text;
    if (reducedMotion) {
      setShown(text);
      return;
    }
    setShown("");
    if (!text) return;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(textRef.current.slice(0, i));
      if (i >= textRef.current.length) window.clearInterval(id);
    }, speedMs);
    return () => window.clearInterval(id);
  }, [text, speedMs, reducedMotion]);

  return shown;
}
