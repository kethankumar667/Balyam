import { useCallback, useEffect, useRef, useState } from "react";

const CONFIRMATION_MS = 2_000;

/**
 * Copies the player's ID to the clipboard and remembers, for two seconds, that it did.
 *
 * What is copied is the PLAYER ID (a support and friend-finding handle), not a profile link, so callers must
 * label it that way. A blocked clipboard leaves `copied` false instead of throwing: there is nothing useful to
 * tell the player beyond the confirmation not appearing.
 */
export function useCopyPlayerId(playerId: string): { copied: boolean; copy: () => Promise<void> } {
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
  }, []);

  const copy = useCallback(async () => {
    if (!navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(playerId);
      setCopied(true);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => setCopied(false), CONFIRMATION_MS);
    } catch {
      setCopied(false);
    }
  }, [playerId]);

  return { copied, copy };
}
