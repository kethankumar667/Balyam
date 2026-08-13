import { useEffect, useState } from "react";
import HandCricketBoardMobile from "./HandCricketBoardMobile";
import HandCricketBoardDesktop from "./HandCricketBoardDesktop";
import HcBroadcastShell from "./HcBroadcastShell";
import InningsBreakOverlay from "./InningsBreakOverlay";
import { useSkin } from "../skin";
import type { HandCricketBoardProps } from "./hc-shared";

/** Desktop gate copied from RummyBoard: real desktop only (rules out phone
 *  landscape ≤1133px). Do NOT widen. Mobile shell handles every smaller tier
 *  incl. tablets. */
function isDesktopLayout(): boolean {
  if (typeof window === "undefined") return false;
  if (window.innerWidth < 1280 || window.innerHeight < 720) return false;
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export default function HandCricketBoard(props: HandCricketBoardProps) {
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

  // Skin picks the LOOK, the gate above picks the LAYOUT — two independent
  // axes, same split as RpsBoard.
  const [skin] = useSkin();

  // Preserve the original board's early-return exactly: render nothing
  // until we know who's asking (e.g. a spectating socket with no seat).
  if (!props.selfId) return null;

  /**
   * The innings break sits ABOVE whichever board renders below.
   *
   * Mounted here rather than inside the mobile and desktop boards because it
   * is identical for both and must not be forgotten in one of them — the
   * server refuses play for ten seconds either way, and a board without this
   * overlay just looks frozen.
   */
  const breakOverlay = (
    <InningsBreakOverlay
      state={props.state}
      players={props.players}
      selfId={props.selfId}
    />
  );

  if (skin === "broadcast") {
    // One shell for both layouts — the broadcast composition is a single
    // centred column, so only its max-width and density change.
    return (
      <>
        <HcBroadcastShell {...props} compact={!isDesktop} />
        {breakOverlay}
      </>
    );
  }

  return (
    <>
      {isDesktop ? (
        <HandCricketBoardDesktop {...props} />
      ) : (
        <HandCricketBoardMobile {...props} />
      )}
      {breakOverlay}
    </>
  );
}
