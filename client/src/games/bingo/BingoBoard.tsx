import { useEffect, useState } from "react";
import BingoBoardMobile from "./BingoBoardMobile";
import BingoBoardDesktop from "./BingoBoardDesktop";
import type { BingoBoardProps } from "./useBingoBoard";

/** Desktop gate copied from RummyBoard/StarBoard/UnoBoard: real desktop
 * only (rules out phone landscape <=1133px). Do NOT widen. The mobile
 * shell handles every smaller tier including tablets. */
function isDesktopLayout(): boolean {
  if (typeof window === "undefined") return false;
  if (window.innerWidth < 1280 || window.innerHeight < 720) return false;
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export default function BingoBoard(props: BingoBoardProps) {
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
  return isDesktop ? <BingoBoardDesktop {...props} /> : <BingoBoardMobile {...props} />;
}
