import React from "react";
import { useViewport } from "../../lib/useViewport";
import Connect4BoardMobile from "./Connect4BoardMobile";
import Connect4BoardDesktop from "./Connect4BoardDesktop";
import type { Connect4BoardProps } from "./Connect4BoardProps";

export default function Connect4Board(props: Connect4BoardProps) {
  const viewport = useViewport();
  const isDesktop = viewport === "desktop";

  return isDesktop ? (
    <Connect4BoardDesktop {...props} />
  ) : (
    <Connect4BoardMobile {...props} />
  );
}
