import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { CoachHint, CoachHintResponse } from "@shared/types";
import { getSocket } from "../lib/socket";

/**
 * Ids the coach is currently pointing at, readable by any descendant.
 *
 * A context rather than a prop chain because the cards that need to know sit
 * several layers below the board root (board → hand → meld lane → draggable
 * wrapper → card), and every layer in between is a pure layout component
 * with no interest in coaching. Threading a Set through all of them would
 * mean editing five signatures per game to add one annotation.
 */
const CoachHighlightContext = createContext<ReadonlySet<string>>(new Set());

export function CoachHighlightProvider({
  ids,
  children,
}: {
  ids: ReadonlySet<string>;
  children: React.ReactNode;
}) {
  return (
    <CoachHighlightContext.Provider value={ids}>{children}</CoachHighlightContext.Provider>
  );
}

/** True when the coach is pointing at this id. Safe outside a provider. */
export function useIsCoachHighlighted(id: string | undefined): boolean {
  const ids = useContext(CoachHighlightContext);
  return id ? ids.has(id) : false;
}

/**
 * AI Coach hint button.
 *
 * One component for every game: the hint contract is game-agnostic, so a game
 * gets a coach by implementing `getHint` on its engine and dropping this in.
 *
 * The hint is requested on demand rather than streamed. A hint that updates
 * itself every turn stops being a hint and becomes an autopilot — you would
 * read the highlight instead of the board. Making it a deliberate press keeps
 * it a teaching tool, and keeps beginners from leaning on it by default.
 */

export interface CoachState {
  hint: CoachHint | null;
  /** Card ids / "r,c" cells the caller should highlight. */
  highlight: ReadonlySet<string>;
  loading: boolean;
  error: string | null;
  request: () => void;
  dismiss: () => void;
}

/**
 * Hook half — lets a board highlight its own cards/cells from the hint while
 * rendering the button wherever its layout prefers.
 */
export function useCoach(): CoachState {
  const [hint, setHint] = useState<CoachHint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const request = useCallback(() => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError(null);
    getSocket().emit("coach:hint", (res: CoachHintResponse) => {
      inFlight.current = false;
      setLoading(false);
      if (res.ok && res.hint) {
        setHint(res.hint);
        setError(null);
      } else {
        setHint(null);
        setError(res.error ?? "No hint available");
      }
    });
  }, []);

  const dismiss = useCallback(() => {
    setHint(null);
    setError(null);
  }, []);

  // A hint describes one board state. Once anything moves it is stale, and a
  // stale hint pointing at a card you no longer hold is worse than none.
  useEffect(() => {
    if (!hint) return;
    const socket = getSocket();
    const clear = () => setHint(null);
    socket.on("game:state", clear);
    return () => {
      socket.off("game:state", clear);
    };
  }, [hint]);

  const highlight = new Set(hint?.highlight ?? []);
  return { hint, highlight, loading, error, request, dismiss };
}

const KIND_ICON: Record<CoachHint["kind"], string> = {
  draw: "🃏",
  discard: "🗑",
  declare: "🏆",
  build: "🧩",
  place: "✏️",
  wait: "👀",
};

/** Button + hint card. Pass a `coach` from useCoach to share state with a board. */
export default function CoachHintButton({
  coach,
  compact = false,
  align = "right",
  className = "",
}: {
  coach: CoachState;
  /** Icon-only trigger, for tight game chrome. */
  compact?: boolean;
  align?: "left" | "right";
  className?: string;
}) {
  const { hint, loading, error, request, dismiss } = coach;

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={hint || error ? dismiss : request}
        disabled={loading}
        aria-label="Get a hint"
        className={`flex items-center gap-1.5 rounded-full font-semibold transition disabled:opacity-50 bg-[#E6A11E] hover:bg-[#D89215] text-[#2B2118] ${
          compact ? "w-9 h-9 justify-center text-base shadow-md" : "px-3 py-1.5 text-xs"
        }`}
        title="Ask the coach what to do next"
      >
        <span aria-hidden>{loading ? "…" : "💡"}</span>
        {!compact && <span>{loading ? "Thinking" : hint || error ? "Hide hint" : "Hint"}</span>}
      </button>

      {(hint || error) && (
        <div
          role="status"
          className={`absolute z-50 mt-2 w-[min(80vw,20rem)] rounded-xl p-3 shadow-2xl text-left ${
            align === "left" ? "left-0" : "right-0"
          }`}
          style={{ background: "#F6EDDB", border: "1px solid #C8A66B" }}
        >
          {hint ? (
            <>
              <div className="flex items-start gap-2">
                <span aria-hidden className="text-lg leading-none">
                  {KIND_ICON[hint.kind] ?? "💡"}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#3A3027]">{hint.headline}</p>
                  <p className="text-xs text-[#6E5E4D] mt-0.5">{hint.detail}</p>
                </div>
              </div>
              {hint.groups && hint.groups.length > 0 && (
                <p className="text-[11px] text-[#8A7865] mt-2">
                  {hint.groups.length} group{hint.groups.length === 1 ? "" : "s"} highlighted on
                  your cards.
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-[#6E5E4D]">{error}</p>
          )}
          <button
            onClick={dismiss}
            className="mt-2 text-[11px] font-semibold text-[#8A5A2B] hover:underline"
          >
            Got it
          </button>
        </div>
      )}
    </div>
  );
}
