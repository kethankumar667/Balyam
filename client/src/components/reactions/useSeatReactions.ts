import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactionRecvPayload } from "@shared/types";
import { getSocket } from "../../lib/socket";

/**
 * Drop-in "opponent-targeted reaction" plumbing for any board that doesn't
 * already have its own (RPS's `useRpsBoard`, Ludo's `useLudoBoard`).
 *
 * Three-line integration for a board that renders per-player seat cards:
 *   const reactions = useSeatReactions();
 *   <SomeSeatCard ref={reactions.registerCardRef(seat.playerId)} ... />
 *   <FloatingReactionsLayer reactions={reactions.items} anchorOf={reactions.anchorOf} />
 *
 * That's the whole contract: register each seat's real DOM element (the
 * card/avatar wrapper a reaction should fly to and shake), and mount the
 * shared arc layer once. This hook owns the socket listener, the anchor
 * math (DOM rect → viewport percent, what `FloatingReactionsLayer` wants),
 * and triggering the shared `.reaction-hit-shake` flinch on the struck
 * seat's registered element — same technique and 700ms timing as
 * Ludo's/RPS's own hand-rolled versions (see index.css's doc comment on
 * `reaction-hit-shake` for why the timing is fixed at 700ms: it's tuned to
 * the 720ms `reaction-fling` flight so the shake lands with the impact).
 *
 * Whether a seat card needs targeting is a separate concern (see
 * InlineRoomRail's Players panel, or dispatch `bhalyam:react-at-player` from
 * the seat itself) — this hook only handles RECEIVING and rendering.
 */
export function useSeatReactions() {
  const [items, setItems] = useState<ReactionRecvPayload[]>([]);
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    const socket = getSocket();
    const onReaction = (r: ReactionRecvPayload) => {
      setItems((prev) => [...prev, r]);
      if (r.targetPlayerId) {
        const hitId = r.targetPlayerId;
        window.setTimeout(() => {
          const el = cardRefs.current.get(hitId);
          if (!el) return;
          el.classList.remove("reaction-hit-shake");
          // Force a reflow so re-adding the class restarts the animation for
          // rapid-fire hits on the same seat.
          void el.offsetWidth;
          el.classList.add("reaction-hit-shake");
          window.setTimeout(() => el.classList.remove("reaction-hit-shake"), 460);
        }, 700);
      }
      window.setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== r.id)), 2000);
    };
    socket.on("room:reaction", onReaction);
    return () => {
      socket.off("room:reaction", onReaction);
    };
  }, []);

  const registerCardRef = useCallback(
    (playerId: string | null) => (el: HTMLElement | null) => {
      if (!playerId) return;
      if (el) cardRefs.current.set(playerId, el);
      else cardRefs.current.delete(playerId);
    },
    [],
  );

  const anchorOf = useCallback((playerId: string): { left: number; top: number } | null => {
    const el = cardRefs.current.get(playerId);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      left: ((r.left + r.width / 2) / window.innerWidth) * 100,
      top: (r.top / window.innerHeight) * 100,
    };
  }, []);

  return { items, registerCardRef, anchorOf };
}
