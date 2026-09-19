import React from "react";
import { useViewport } from "../../lib/useViewport";
import TicTacToeBoardMobile from "./TicTacToeBoardMobile";
import TicTacToeBoardDesktop from "./TicTacToeBoardDesktop";
import type { TicTacToeBoardProps } from "./TicTacToeBoardProps";

export default function TicTacToeBoard(props: TicTacToeBoardProps) {
  const viewport = useViewport();
  const isDesktop = viewport === "desktop";

  return isDesktop ? (
    <TicTacToeBoardDesktop {...props} />
  ) : (
    <TicTacToeBoardMobile {...props} />
  );
}
