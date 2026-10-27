import { useEffect, useState } from "react";
import StarBoardMobile from "./StarBoardMobile";
import StarBoardDesktop from "./StarBoardDesktop";
import type { StarBoardProps } from "./useStarBoard";
import { useSchoolSlate } from "../../lib/schoolSlate";
import { STAR_SLATE_VARS } from "./starSlate";

/** Desktop gate copied from RummyBoard: real desktop only (rules out phone
 *  landscape ≤1133px). Do NOT widen. The mobile shell handles every smaller
 *  tier including tablets. */
function isDesktopLayout(): boolean {
  if (typeof window === "undefined") return false;
  if (window.innerWidth < 1280 || window.innerHeight < 720) return false;
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export default function StarBoard(props: StarBoardProps) {
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
  const slate = useSchoolSlate("stargame");
  // The wrapper only carries the slate's colour variables down to both shells; it takes no part in layout.
  return (
    <div className="contents" style={slate.isOn ? STAR_SLATE_VARS : undefined}>
      {isDesktop ? <StarBoardDesktop {...props} /> : <StarBoardMobile {...props} />}
    </div>
  );
}
