import { confetti } from "@tsparticles/confetti";

/** UNO's own card colours, reused as the burst palette so this reads as
 *  "this game's colours" rather than generic rainbow confetti. `disableForReducedMotion`
 *  is on by default in `@tsparticles/confetti`, so no separate matchMedia gate is needed here. */
const UNO_CONFETTI_COLORS = ["#D22B27", "#3AA03A", "#1C6DD0", "#E8B100", "#FFF9F0"];

/** Big burst for winning the round — UnoResultModal fires this once, only
 *  for the self-winner (same "no negative FX for everyone else" precedent
 *  useUnoBoard.ts already sets for the win sound). */
export function fireUnoWinConfetti(): void {
  void confetti({
    count: 140,
    spread: 100,
    startVelocity: 42,
    position: { x: 50, y: 30 },
    colors: UNO_CONFETTI_COLORS,
  });
}

/** Small burst from around the local player's seat when they declare "UNO!" —
 *  pairs with UnoDeclareBubble's speech-bubble pop for the same moment. */
export function fireUnoDeclareConfetti(): void {
  void confetti({
    count: 44,
    spread: 70,
    startVelocity: 30,
    position: { x: 50, y: 78 },
    colors: UNO_CONFETTI_COLORS,
    scalar: 0.8,
  });
}
