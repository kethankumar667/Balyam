import { useEffect, useState, lazy, Suspense } from "react";
import type { DotsBoxesBoardProps } from "./useDotsBoxesBoard";
import { useDotsBoxesBoard } from "./useDotsBoxesBoard";

const DotsBoxesBoardMobile = lazy(() => import("./DotsBoxesBoardMobile"));
const DotsBoxesBoardDesktop = lazy(() => import("./DotsBoxesBoardDesktop"));
const DotsBoxesNotebookMobile = lazy(() => import("./DotsBoxesNotebookMobile"));
const DotsBoxesNotebookDesktop = lazy(() => import("./DotsBoxesNotebookDesktop"));

/** Desktop gate copied from RummyBoard: real desktop only (rules out phone
 *  landscape ≤1133px). Do NOT widen. Mobile shell handles every smaller tier
 *  incl. tablets. */
function isDesktopLayout(): boolean {
  if (typeof window === "undefined") return false;
  if (window.innerWidth < 1024 || window.innerHeight < 600) return false;
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export default function DotsBoxesBoard(props: DotsBoxesBoardProps) {
  const [isDesktop, setIsDesktop] = useState<boolean>(() => isDesktopLayout());
  const { skin } = useDotsBoxesBoard(props);

  useEffect(() => {
    const onResize = () => setIsDesktop(isDesktopLayout());
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  return (
    <Suspense fallback={<div className="w-full h-full min-h-[300px] flex items-center justify-center text-amber-500 animate-pulse">Loading Dots & Boxes...</div>}>
      {isDesktop ? (
        skin === "notebook" ? (
          <DotsBoxesNotebookDesktop {...props} />
        ) : (
          <DotsBoxesBoardDesktop {...props} />
        )
      ) : skin === "notebook" ? (
        <DotsBoxesNotebookMobile {...props} />
      ) : (
        <DotsBoxesBoardMobile {...props} />
      )}
    </Suspense>
  );
}
