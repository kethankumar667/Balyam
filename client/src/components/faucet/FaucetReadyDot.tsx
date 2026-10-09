import { useReducedMotion } from "framer-motion";
import { useFaucetCountdown } from "../../hooks/useFaucetCountdown";

/**
 * A small beacon on the wallet chip, phones only, saying "free coins are waiting".
 *
 * The header has no room for the faucet chip on a phone, so this is the nudge that
 * sends the player to the wallet drawer where the claim is. Purely decorative:
 * the wallet chip's own label stays the accessible name, and the drawer row is
 * what a screen reader reaches. Place it inside a `relative` wrapper.
 */
export function FaucetReadyDot() {
  const reducedMotion = useReducedMotion();
  const { isReady } = useFaucetCountdown();
  if (!isReady) return null;

  return (
    <span className="pointer-events-none absolute -top-0.5 -right-0.5 z-10 flex h-3 w-3 sm:hidden" aria-hidden="true">
      {!reducedMotion && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
      <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-[var(--chrome-panel)]" />
    </span>
  );
}

export default FaucetReadyDot;
