import { useEffect, useState } from "react";
import MemoryMatchBoardMobile from "./MemoryMatchBoardMobile";
import MemoryMatchBoardDesktop from "./MemoryMatchBoardDesktop";
import type { MemoryMatchBoardProps } from "./useMemoryMatchBoard";

/** Desktop gate copied from RummyBoard: real desktop only (rules out phone
 *  landscape ≤1133px). Do NOT widen. Mobile shell handles every smaller tier
 *  incl. tablets. */
function isDesktopLayout(): boolean {
  if (typeof window === "undefined") return false;
  if (window.innerWidth < 1280 || window.innerHeight < 720) return false;
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export default function MemoryMatchBoard(props: MemoryMatchBoardProps) {
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
  return isDesktop ? (
    <MemoryMatchBoardDesktop {...props} />
  ) : (
    <MemoryMatchBoardMobile {...props} />
  );
}
