import { useEffect, useState } from "react";
import TeluguCinemaluBoardMobile from "./TeluguCinemaluBoardMobile";
import TeluguCinemaluBoardDesktop from "./TeluguCinemaluBoardDesktop";
import type { TeluguCinemaluPlayerState } from "@shared/types";

export interface TeluguCinemaluBoardContainerProps {
  state: TeluguCinemaluPlayerState;
  selfId: string;
  onMove: (type: string, data?: unknown) => void;
}

function isDesktopLayout(): boolean {
  if (typeof window === "undefined") return false;
  if (window.innerWidth < 1024) return false;
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export default function TeluguCinemaluBoard(props: TeluguCinemaluBoardContainerProps) {
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
    <TeluguCinemaluBoardDesktop {...props} />
  ) : (
    <TeluguCinemaluBoardMobile {...props} />
  );
}
