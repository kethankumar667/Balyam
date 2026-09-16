import type { ReactNode } from "react";
import type { HcState } from "@shared/types";

export interface HcMatchLayoutProps {
  state: HcState;
  compact: boolean;
  children: ReactNode;
}

/**
 * Shared responsive geometry for every Hand Cricket theme.
 *
 * Themes own their colours, typography, and match widgets. This frame owns
 * only the dependable game-screen contract: fixed viewport, the same content
 * width, the same live-height treatment, and the same scroll boundary.
 */
export function HcMatchLayout({ state, compact, children }: HcMatchLayoutProps) {
  const isLive = state.phase === "innings1" || state.phase === "innings2";
  const isDesktopLive = isLive && !compact;
  const maxWidth = compact ? 580 : state.phase === "teamSelect" ? 1320 : 1500;

  return (
    <div
      className={`min-h-0 flex-1 overflow-x-hidden px-3 pt-4 sm:px-5 ${
        isDesktopLive ? "overflow-hidden pb-4" : "overflow-y-auto pb-24"
      }`}
    >
      <div className={`mx-auto w-full ${isDesktopLive ? "h-full" : ""}`} style={{ maxWidth }}>
        {children}
      </div>
    </div>
  );
}
