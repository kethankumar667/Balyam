import { useEffect, useState } from "react";
import HandCricketBoardMobile from "./HandCricketBoardMobile";
import HandCricketBoardDesktop from "./HandCricketBoardDesktop";
import type { HandCricketBoardProps } from "./hc-shared";

/** Desktop gate copied from RummyBoard: real desktop only (rules out phone
 *  landscape ≤1133px). Do NOT widen. Mobile shell handles every smaller tier
 *  incl. tablets. */
function isDesktopLayout(): boolean {
  if (typeof window === "undefined") return false;
  if (window.innerWidth < 1280 || window.innerHeight < 720) return false;
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export default function HandCricketBoard(props: HandCricketBoardProps) {
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

  // Preserve the original board's early-return exactly: render nothing
  // until we know who's asking (e.g. a spectating socket with no seat).
  if (!props.selfId) return null;

  return isDesktop ? (
    <HandCricketBoardDesktop {...props} />
  ) : (
    <HandCricketBoardMobile {...props} />
  );
}
