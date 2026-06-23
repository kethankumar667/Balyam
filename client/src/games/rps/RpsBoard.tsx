import { useEffect, useState } from "react";
import RpsBoardMobile from "./RpsBoardMobile";
import RpsBoardDesktop from "./RpsBoardDesktop";
import type { RpsBoardProps } from "./useRpsBoard";

/**
 * RPS table entry point. Routes between the mobile and desktop shells via the
 * same deliberate gate Rummy uses: real desktop only (≥1280×720 AND a
 * hover-capable fine pointer), which rules out phone/tablet landscape reporting
 * wide viewports (iPhone 14 Pro Max landscape = 932px, iPad mini = 1133px).
 * The mobile shell handles every smaller tier, so do NOT widen this gate.
 */
function isDesktopLayout(): boolean {
  if (typeof window === "undefined") return false;
  if (window.innerWidth < 1280 || window.innerHeight < 720) return false;
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export default function RpsBoard(props: RpsBoardProps) {
  // Re-check on resize/rotate so dragging across monitors or rotating a tablet
  // flips to the correct shell.
  const [isDesktop, setIsDesktop] = useState<boolean>(() => isDesktopLayout());
  useEffect(() => {
    const onResize = () => setIsDesktop(isDesktopLayout());
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  return isDesktop ? <RpsBoardDesktop {...props} /> : <RpsBoardMobile {...props} />;
}
