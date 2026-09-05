import { useEffect, useState } from "react";
import NamePlaceAnimalBoardMobile from "./NamePlaceAnimalBoardMobile";
import NamePlaceAnimalBoardDesktop from "./NamePlaceAnimalBoardDesktop";
import type { ChatMessage, NamePlaceAnimalAnswers, NamePlaceAnimalPublicState, Player } from "@shared/types";
import { useGameTheme } from "../../hooks/useGameTheme";

export interface NamePlaceAnimalBoardContainerProps {
  state: NamePlaceAnimalPublicState;
  myAnswers?: NamePlaceAnimalAnswers;
  myPlayerId: string;
  onMove: (type: string, data?: unknown) => void;
  players?: Player[];
  messages?: ChatMessage[];
  roomCode?: string;
  roomPhase?: string;
}

function isDesktopLayout(): boolean {
  if (typeof window === "undefined") return false;
  if (window.innerWidth < 1024) return false;
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export default function NamePlaceAnimalBoard(props: NamePlaceAnimalBoardContainerProps) {
  const [isDesktop, setIsDesktop] = useState<boolean>(() => isDesktopLayout());
  const { theme, toggleTheme, isNotebook, isNeon } = useGameTheme("namesplaceanimal", "notebook");

  useEffect(() => {
    const onResize = () => setIsDesktop(isDesktopLayout());
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  const safeAnswers: NamePlaceAnimalAnswers = props.myAnswers || {
    name: "",
    place: "",
    animal: "",
    thing: "",
  };

  const passProps = {
    state: props.state,
    myAnswers: safeAnswers,
    myPlayerId: props.myPlayerId,
    onMove: props.onMove,
    players: props.players,
    messages: props.messages,
    roomCode: props.roomCode,
    roomPhase: props.roomPhase,
    theme,
    toggleTheme,
    isNotebook,
    isNeon,
  };

  return isDesktop ? (
    <NamePlaceAnimalBoardDesktop {...passProps} />
  ) : (
    <NamePlaceAnimalBoardMobile {...passProps} />
  );
}
