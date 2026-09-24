import { useCallback, useEffect, useRef, useState } from "react";
import { useMandaliInboxStore } from "../store/mandaliInboxStore";

/**
 * Keeps the member's read pointer honest while a Mandali is open.
 *
 *  - On arrival it remembers where the member had read up to (so the chat can
 *    draw a "New messages" line there), then marks the Mandali read.
 *  - While new messages keep arriving it marks read again, but never more often
 *    than every {@link MARK_READ_MIN_INTERVAL_MS} — each mark is a write, and a
 *    busy chat must not spend the request budget the composer needs.
 *  - Nothing is marked read while the tab is hidden: a message you did not see
 *    is not read. Coming back to the tab marks it.
 *  - Leaving flushes one last mark so what you watched scroll by stays read.
 *
 * Returns the timestamp the member had read up to on arrival (`null` when they
 * were already caught up).
 */

export const MARK_READ_MIN_INTERVAL_MS = 15_000;
/** If the digests never load, give up waiting and mark anyway. */
const DIGEST_WAIT_MS = 4_000;

export function useMandaliReadTracking(
  mandaliId: string | null,
  enabled: boolean,
  messageCount: number
): number | null {
  const loaded = useMandaliInboxStore((s) => s.loaded);
  const [unreadSince, setUnreadSince] = useState<number | null>(null);
  const capturedFor = useRef<string | null>(null);
  const lastMarkAt = useRef(0);
  const active = mandaliId !== null && enabled;

  const markNow = useCallback(() => {
    if (!mandaliId || document.visibilityState !== "visible") return;
    lastMarkAt.current = Date.now();
    void useMandaliInboxStore.getState().markRead(mandaliId);
  }, [mandaliId]);

  // Tell the inbox which chat is on screen, so it does not notify about it.
  useEffect(() => {
    if (!active || !mandaliId) return;
    useMandaliInboxStore.getState().setViewing(mandaliId);
    return () => useMandaliInboxStore.getState().setViewing(null);
  }, [active, mandaliId]);

  // On arrival: remember the old boundary, then mark read.
  useEffect(() => {
    if (!active || !mandaliId || capturedFor.current === mandaliId) return;

    const capture = () => {
      const digest = useMandaliInboxStore.getState().digests.find((d) => d.mandaliId === mandaliId);
      const since = digest && digest.unreadCount > 0 ? Date.parse(digest.lastReadAt) : NaN;
      setUnreadSince(Number.isNaN(since) ? null : since);
      capturedFor.current = mandaliId;
      markNow();
    };

    if (loaded) {
      capture();
      return;
    }
    const fallback = setTimeout(capture, DIGEST_WAIT_MS);
    return () => clearTimeout(fallback);
  }, [active, mandaliId, loaded, markNow]);

  // New messages while looking: mark read, at most once per interval.
  useEffect(() => {
    if (!active || capturedFor.current !== mandaliId) return;
    const wait = Math.max(0, MARK_READ_MIN_INTERVAL_MS - (Date.now() - lastMarkAt.current));
    const timer = setTimeout(markNow, wait);
    return () => clearTimeout(timer);
  }, [messageCount, active, mandaliId, markNow]);

  // Back on the tab: whatever arrived meanwhile is now seen.
  useEffect(() => {
    if (!active) return;
    const onVisible = () => {
      if (document.visibilityState === "visible" && capturedFor.current === mandaliId) markNow();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [active, mandaliId, markNow]);

  // Leaving: one last mark, so what scrolled past while you watched stays read.
  useEffect(() => {
    if (!active) return;
    return () => {
      if (capturedFor.current === mandaliId) markNow();
    };
  }, [active, mandaliId, markNow]);

  return active ? unreadSince : null;
}
