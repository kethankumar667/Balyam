import { useEffect, useState, lazy, Suspense } from "react";
import type { ChatMessage, CarromPublicState, Player } from "@shared/types";

const CarromBoardMobile = lazy(() => import("./CarromBoardMobile"));
const CarromBoardDesktop = lazy(() => import("./CarromBoardDesktop"));

export interface CarromBoardProps {
  state: CarromPublicState;
  players: Player[];
  selfId: string;
  messages?: ChatMessage[];
  roomCode?: string;
  roomPhase?: string;
  onMove: (type: string, data?: unknown) => void;
  /** Carrom draws its own full-width header, so it owns the Leave control.
   *  The room shell no longer floats a second one over the top-right corner. */
  onLeave?: () => void;
}

/** Desktop layout gate: real desktop viewports (hover fine pointer, width >= 1024px) */
function isDesktopLayout(): boolean {
  if (typeof window === "undefined") return false;
  if (window.innerWidth < 1024 || window.innerHeight < 650) return false;
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export default function CarromBoard(props: CarromBoardProps) {
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

  return (
    <Suspense
      fallback={
        <div className="w-full h-full min-h-[350px] flex flex-col items-center justify-center gap-3 text-amber-400 font-sans">
          <div className="w-10 h-10 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold uppercase tracking-wider text-amber-200/80">
            Setting up Carrom Board...
          </span>
        </div>
      }
    >
      {isDesktop ? <CarromBoardDesktop {...props} /> : <CarromBoardMobile {...props} />}
    </Suspense>
  );
}
