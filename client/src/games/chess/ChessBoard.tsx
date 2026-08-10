import { useEffect, useState } from "react";
import ChessBoardMobile from "./ChessBoardMobile";
import ChessBoardDesktop from "./ChessBoardDesktop";
import type { ChatMessage, ChessPublicState, Player } from "@shared/types";

export interface ChessBoardProps {
  state: ChessPublicState;
  players: Player[];
  selfId: string;
  messages?: ChatMessage[];
  roomCode?: string;
  roomPhase?: string;
  onMove: (type: string, data?: unknown) => void;
}

/** Desktop layout gate: real desktop viewports (hover fine pointer, width >= 1024px) */
function isDesktopLayout(): boolean {
  if (typeof window === "undefined") return false;
  if (window.innerWidth < 1024 || window.innerHeight < 650) return false;
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export default function ChessBoard(props: ChessBoardProps) {
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

  return isDesktop ? <ChessBoardDesktop {...props} /> : <ChessBoardMobile {...props} />;
}
