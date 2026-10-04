import { lazy, Suspense, useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { getSocket } from "../../lib/socket";
import { apiFetch } from "../../lib/playerIdentity";
import type { PlayerCardResult, PublicPlayerCard } from "@shared/profile/PublicPlayerCard";
import { PlayerCardContext, type PlayerCardHint, type PlayerCardOpener } from "./PlayerCardContext";
import type { PlayerCardViewState } from "./PlayerCardModal";

// The modal carries the stats grid, the XP bar and the game catalogue lookup.
// None of it is needed until someone taps a face, so it stays out of the
// initial bundle.
const LazyPlayerCardModal = lazy(() => import("./PlayerCardModal"));

const SEAT_CARD_TIMEOUT_MS = 8000;
const FAILURE_MESSAGE = "Could not load this profile. Check your connection and try again.";

/** A load result that can also say "do not offer a retry". Local to this file: the wire type has no use for it. */
type LoadResult = PlayerCardResult | { ok: false; error: string; retryable: false };

interface OpenTarget {
  hint: PlayerCardHint;
  load: () => Promise<LoadResult>;
}

function loadSeatCard(seatId: string): Promise<PlayerCardResult> {
  return new Promise((resolve) => {
    getSocket()
      .timeout(SEAT_CARD_TIMEOUT_MS)
      .emit("player:card", seatId, (timeoutError, result) => {
        resolve(timeoutError || !result ? { ok: false, error: FAILURE_MESSAGE } : result);
      });
  });
}

const NO_RECORD_MESSAGE = "This player has not finished a match yet, so there is no profile to show.";

async function loadAccountCard(accountId: string): Promise<LoadResult> {
  try {
    const response = await apiFetch(`/api/profile/${encodeURIComponent(accountId)}/card`);
    // A 404 is an answer, not a failure: the account exists but has never
    // produced a profile row. Telling that apart from a dropped connection is
    // what keeps the dialog from offering a retry that can never succeed.
    if (response.status === 404) return { ok: false, error: NO_RECORD_MESSAGE, retryable: false };
    if (!response.ok) return { ok: false, error: FAILURE_MESSAGE };
    const body = (await response.json()) as { card?: PublicPlayerCard };
    return body.card ? { ok: true, card: body.card } : { ok: false, error: FAILURE_MESSAGE };
  } catch {
    return { ok: false, error: FAILURE_MESSAGE };
  }
}

/**
 * Mount once, near the router. Owns the single card modal for the whole app,
 * so two avatars can never open two stacked dialogs.
 */
export function PlayerCardProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<OpenTarget | null>(null);
  const [view, setView] = useState<PlayerCardViewState>({ status: "loading" });
  // A slow answer for the previous avatar must not overwrite the card the
  // player has since moved on to; each request carries its own ticket.
  const latestRequest = useRef(0);

  const run = useCallback((next: OpenTarget) => {
    const ticket = ++latestRequest.current;
    setTarget(next);
    setView({ status: "loading" });
    void next.load().then((result) => {
      if (ticket !== latestRequest.current) return;
      if (result.ok) setView({ status: "ready", card: result.card });
      else setView({ status: "error", message: result.error, retryable: !("retryable" in result) });
    });
  }, []);

  const opener = useMemo<PlayerCardOpener>(
    () => ({
      openSeatCard: (seatId, hint) => run({ hint, load: () => loadSeatCard(seatId) }),
      openAccountCard: (accountId, hint) => run({ hint, load: () => loadAccountCard(accountId) }),
    }),
    [run]
  );

  const close = useCallback(() => {
    latestRequest.current++;
    setTarget(null);
  }, []);

  return (
    <PlayerCardContext.Provider value={opener}>
      {children}
      {target && (
        <Suspense fallback={null}>
          <LazyPlayerCardModal
            hint={target.hint}
            view={view}
            onClose={close}
            onRetry={() => run(target)}
          />
        </Suspense>
      )}
    </PlayerCardContext.Provider>
  );
}
