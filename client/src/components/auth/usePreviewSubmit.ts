import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Stands in for the network call these screens will make once accounts exist.
 *
 * It deliberately does NOT fake a sign-in. A stub that flipped some `loggedIn`
 * flag would make the pages demo well and lie to everyone who tried them —
 * including us, later, when the real call goes in and nobody remembers which
 * behaviour was real. So it runs the genuine parts of the interaction (the
 * button's busy state, the disabled window, the announced result) and then
 * says plainly that there is nothing behind it yet.
 *
 * When the backend lands, replace the body of `submit` with the real call.
 * Every state the UI needs is already wired to this shape.
 */
export interface PreviewSubmitState {
  loading: boolean;
  /** Set once a submit has completed. Rendered as a FormNotice. */
  done: boolean;
  submit: () => void;
  reset: () => void;
}

/** How long the busy state is held. Long enough to see, short enough to trust. */
const PRETEND_LATENCY_MS = 650;

export function usePreviewSubmit(): PreviewSubmitState {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const timer = useRef<number | null>(null);

  // A pending timeout that resolves after unmount would set state on a dead
  // component; clearing on unmount is the whole fix.
  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  const submit = useCallback(() => {
    setDone(false);
    setLoading(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setLoading(false);
      setDone(true);
      timer.current = null;
    }, PRETEND_LATENCY_MS);
  }, []);

  const reset = useCallback(() => {
    setDone(false);
  }, []);

  return { loading, done, submit, reset };
}
