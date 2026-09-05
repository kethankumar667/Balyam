import { useEffect, useState } from "react";
import TambolaBoardMobile from "./TambolaBoardMobile";
import TambolaBoardDesktop from "./TambolaBoardDesktop";
import type { ChatMessage, Player, TambolaPlayerState } from "@shared/types";
import { useGameTheme } from "../../hooks/useGameTheme";

export interface TambolaBoardContainerProps {
  state: TambolaPlayerState;
  selfId: string;
  onMove: (type: string, data?: unknown) => void;
  /** Full room roster (carries `avatar`), used to draw each seat's picture. */
  players: Player[];
  messages: ChatMessage[];
  roomCode: string;
  roomPhase: string;
}

function isDesktopLayout(): boolean {
  if (typeof window === "undefined") return false;
  if (window.innerWidth < 1024) return false;
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export default function TambolaBoard(props: TambolaBoardContainerProps) {
  const [isDesktop, setIsDesktop] = useState<boolean>(() => isDesktopLayout());
  const { theme, toggleTheme, isNotebook, isNeon } = useGameTheme("tambola", "notebook");

  useEffect(() => {
    const onResize = () => setIsDesktop(isDesktopLayout());
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  const themeProps = { theme, toggleTheme, isNotebook, isNeon };

  return isDesktop ? (
    <TambolaBoardDesktop {...props} {...themeProps} />
  ) : (
    <TambolaBoardMobile {...props} {...themeProps} />
  );
}
