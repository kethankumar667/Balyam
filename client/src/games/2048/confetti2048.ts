import { confetti } from "@tsparticles/confetti";
import { getPrefersReducedMotion } from "../../hooks/useReducedMotion";

/**
 * Royal gold, amber, and champagne confetti burst for 2048 milestone fusions.
 */
const GOLD_CONFETTI_COLORS = ["#F59E0B", "#FCD34D", "#D97706", "#FEF08A", "#FFFFFF", "#FBBF24"];

export function fire2048WinConfetti(): void {
  if (getPrefersReducedMotion()) return;
  try {
    void confetti({
      count: 110,
      spread: 85,
      startVelocity: 40,
      position: { x: 50, y: 35 },
      colors: GOLD_CONFETTI_COLORS,
    });
  } catch {
    // Non-visual environments or tests fail silently
  }
}
