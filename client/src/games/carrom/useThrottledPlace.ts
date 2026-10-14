import { useCallback, useEffect, useRef } from "react";

/** The least time between two striker-position messages. 50 ms is 20 a second: smooth, and cheap for the server. */
export const PLACE_INTERVAL_MS = 50;

/**
 * Wraps "put the striker here" so dragging the slider does not flood the server.
 *
 * Every message makes the server broadcast the whole game state, and the striker is drawn from that
 * answer, so one message per input event (hundreds a second on a fast mouse) made the striker lag and
 * stutter under the finger. This sends the first position at once, then at most one message per
 * interval, and the last position always gets through. It sends nothing after the board is gone.
 */
export function useThrottledPlace(send: (pos: number) => void): (pos: number) => void {
  const sendRef = useRef(send);
  sendRef.current = send;
  const pendingRef = useRef<number | null>(null);
  const lastSentAtRef = useRef(Number.NEGATIVE_INFINITY);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    timerRef.current = null;
    const pos = pendingRef.current;
    if (pos === null) return;
    pendingRef.current = null;
    lastSentAtRef.current = Date.now();
    sendRef.current(pos);
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = null;
      pendingRef.current = null;
    },
    [],
  );

  return useCallback(
    (pos: number) => {
      pendingRef.current = pos;
      const wait = lastSentAtRef.current + PLACE_INTERVAL_MS - Date.now();
      if (wait <= 0) {
        if (timerRef.current !== null) clearTimeout(timerRef.current);
        flush();
      } else if (timerRef.current === null) {
        timerRef.current = setTimeout(flush, wait);
      }
    },
    [flush],
  );
}
