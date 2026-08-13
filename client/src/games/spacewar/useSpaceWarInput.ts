import { useCallback, useEffect, useRef } from "react";

/**
 * Owns which steering keys are currently down.
 *
 * The engine holds input server-side: `keydown` starts the ship moving and it
 * keeps moving every tick until a `keyup` arrives. That is the right design —
 * flight speed then depends on elapsed time rather than on how many packets
 * survived the trip — but it makes a dropped `keyup` catastrophic rather than
 * cosmetic. The ship flies into the wall and stays there, and nothing the
 * pilot does afterwards helps, because as far as the server is concerned the
 * finger is still down.
 *
 * So every route out of a press ends here: pointer up, pointer cancel, the pad
 * unmounting, the window losing focus, the phone locking or the player
 * switching apps. Presses are also de-duplicated, which matters for the
 * keyboard — held-key auto-repeat fires `keydown` thirty times a second and
 * each one was a socket message.
 *
 * The same set is what the board's local prediction reads, so what is drawn
 * ahead of the server is exactly what the server has been told.
 */
export function useSpaceWarInput(onMove: (type: string, data?: unknown) => void) {
  const heldRef = useRef<Set<string>>(new Set());

  // Room.tsx passes a fresh arrow function on every broadcast; a ref keeps the
  // returned handlers stable so a re-render cannot orphan a press.
  const moveRef = useRef(onMove);
  moveRef.current = onMove;

  const press = useCallback((key: string) => {
    if (heldRef.current.has(key)) return;
    heldRef.current.add(key);
    moveRef.current("keydown", key);
  }, []);

  const release = useCallback((key: string) => {
    if (!heldRef.current.delete(key)) return;
    moveRef.current("keyup", key);
  }, []);

  const releaseAll = useCallback(() => {
    for (const key of [...heldRef.current]) {
      heldRef.current.delete(key);
      moveRef.current("keyup", key);
    }
  }, []);

  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === "hidden") releaseAll();
    };
    window.addEventListener("blur", releaseAll);
    window.addEventListener("pagehide", releaseAll);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.removeEventListener("blur", releaseAll);
      window.removeEventListener("pagehide", releaseAll);
      document.removeEventListener("visibilitychange", onHidden);
      releaseAll();
    };
  }, [releaseAll]);

  return { held: heldRef, press, release, releaseAll };
}
