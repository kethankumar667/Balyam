import { lazy, Suspense, useEffect, useState } from "react";
import InningsBreakOverlay from "./InningsBreakOverlay";
import { useHcSkin, type HcSkin } from "./hc-skin";
import type { HandCricketBoardProps } from "./hc-shared";

/**
 * Lazy per-theme: `check:bundle`'s 550 KB budget for this chunk was blown by
 * adding the Doordarshan theme (its own kit, phase components, celebration
 * overlay, and transient-FX modules) on top of the existing Broadcast and
 * Classic skins, all previously bundled eagerly. Splitting each theme into
 * its own chunk means a match only ever downloads the ONE skin actually in
 * use, rather than every player paying for all three on first load.
 */
const HandCricketBoardMobile = lazy(() => import("./HandCricketBoardMobile"));
const HandCricketBoardDesktop = lazy(() => import("./HandCricketBoardDesktop"));
const HcBroadcastShell = lazy(() => import("./HcBroadcastShell"));
const HcDoordarshanShell = lazy(() => import("./doordarshan/HcDoordarshanShell"));
const HcCricbuzzShell = lazy(() => import("./cricbuzz/HcCricbuzzShell"));

// Matches each theme's own shell background exactly (pro-kit.tsx's PRO.bg0
// for Broadcast, doordarshan-kit.tsx's DD.bg0 for Doordarshan, Cricbuzz green
// for Cricbuzz, the notebook parchment cream for Classic) so a cold-cache chunk
// load never flashes the wrong theme's color at the loading player.
const SHELL_LOADING_BG: Record<HcSkin, string> = {
  broadcast: "#070F1C",
  cricbuzz: "#004838",
  doordarshan: "#120D08",
  nostalgia: "#FBF5E0",
};

function ShellLoading({ skin }: { skin: HcSkin }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "grid",
        placeItems: "center",
        background: SHELL_LOADING_BG[skin],
      }}
      aria-busy="true"
      aria-label="Loading Hand Cricket"
    />
  );
}

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
  const [skin] = useHcSkin();

  // Preserve the original board's early-return exactly: render nothing
  // until we know who's asking (e.g. a spectating socket with no seat).
  if (!props.selfId) return null;

  // Broadcast and Doordarshan are each a single responsive shell that mounts
  // its own themed innings-break overlay (see useInningsBreakCountdown.ts).
  if (skin === "cricbuzz") {
    return (
      <Suspense fallback={<ShellLoading skin="cricbuzz" />}>
        <HcCricbuzzShell {...props} compact={!isDesktop} />
      </Suspense>
    );
  }
  if (skin === "doordarshan") {
    return (
      <Suspense fallback={<ShellLoading skin="doordarshan" />}>
        <HcDoordarshanShell {...props} compact={!isDesktop} />
      </Suspense>
    );
  }
  if (skin === "broadcast") {
    return (
      <Suspense fallback={<ShellLoading skin="broadcast" />}>
        <HcBroadcastShell {...props} compact={!isDesktop} />
      </Suspense>
    );
  }

  // nostalgia (Classic) — the original notebook skin's desktop/mobile split.
  // The innings break sits ABOVE whichever board renders below, mounted here
  // rather than inside either board because it's identical for both and must
  // not be forgotten in one of them — the server refuses play for ten
  // seconds either way, and a board without this overlay just looks frozen.
  return (
    <Suspense fallback={<ShellLoading skin="nostalgia" />}>
      {isDesktop ? (
        <HandCricketBoardDesktop {...props} />
      ) : (
        <HandCricketBoardMobile {...props} />
      )}
      <InningsBreakOverlay state={props.state} players={props.players} selfId={props.selfId} />
    </Suspense>
  );
}
