import { Suspense, lazy } from "react";
import type { WorldId } from "@shared/worlds";

/**
 * What a Ludo table's WORLD puts behind and beside the board: the scene that fills the screen, the things lying
 * about in the free corners (desktop only: on a phone the board takes the whole width and there is no room), and the
 * paint the board's tiles are filled with (see LudoWorldDefs).
 *
 * The classic table draws nothing here: it keeps its own backdrop and falling petals. Every other world is fetched
 * the first time it is shown, so the classic table's bundle does not grow, and until it arrives nothing is drawn in
 * its place. The scenes and props are shared with Brain Vita's worlds, so a name means one place in every game.
 *
 * Purely decoration: hidden from assistive tech, never in the way of a tap, and it changes no rule, colour of a seat
 * or piece of state.
 */

const ToyScene = lazy(() => import("../brainvita/worlds/ToyWorld").then((m) => ({ default: m.ToyScene })));
const PalaceScene = lazy(() => import("../brainvita/worlds/PalaceWorld").then((m) => ({ default: m.PalaceScene })));
const HoloScene = lazy(() => import("../brainvita/worlds/ClassicWorlds").then((m) => ({ default: m.HoloScene })));
const ZenScene = lazy(() => import("../brainvita/worlds/ZenWorld").then((m) => ({ default: m.ZenScene })));
const ReefScene = lazy(() => import("../brainvita/worlds/ReefWorld").then((m) => ({ default: m.ReefScene })));
const LudoWorldProps = lazy(() => import("./LudoWorldProps"));

/**
 * The paints the world's tiles are filled with. The stylesheet points `--ludo-cell` at one of these (a `url()` is fine
 * there because the variable is only ever used as an SVG fill), so one small hidden drawing re-skins every tile on
 * both board renderers without either of them knowing.
 */
export function LudoWorldDefs() {
  return (
    <svg width="0" height="0" aria-hidden className="pointer-events-none absolute">
      <defs>
        <linearGradient id="lw-neon-tile" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#14427A" />
          <stop offset="100%" stopColor="#0A2447" />
        </linearGradient>
        <linearGradient id="lw-zen-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F6F3E7" />
          <stop offset="55%" stopColor="#E4DFCE" />
          <stop offset="100%" stopColor="#CDC6B0" />
        </linearGradient>
        <linearGradient id="lw-reef-tile" x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="55%" stopColor="#FFF0EA" />
          <stop offset="100%" stopColor="#F2CFC3" />
        </linearGradient>
        <linearGradient id="lw-toy-tile" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="55%" stopColor="#F6F9FF" />
          <stop offset="100%" stopColor="#DCE7FF" />
        </linearGradient>
        <linearGradient id="lw-palace-tile" x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#FDF9EC" />
          <stop offset="50%" stopColor="#F1E6CB" />
          <stop offset="100%" stopColor="#DCCBA0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** Every world but the classic table draws a scene; the classic keeps its own backdrop. */
const SCENE_WORLDS: readonly WorldId[] = ["neon", "toy", "zen", "reef", "palace"];

export interface LudoWorldSceneProps {
  world: WorldId;
  /** The wide layout has free corners beside the board for the world's props. */
  isDesktop?: boolean;
}

export function LudoWorldScene({ world, isDesktop = false }: LudoWorldSceneProps) {
  if (!SCENE_WORLDS.includes(world)) return null;
  return (
    <>
      <LudoWorldDefs />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 select-none overflow-hidden rounded-2xl">
        <Suspense fallback={null}>
          {world === "neon" && <HoloScene />}
          {world === "toy" && <ToyScene />}
          {world === "zen" && <ZenScene />}
          {world === "reef" && <ReefScene />}
          {world === "palace" && <PalaceScene />}
          {isDesktop && <LudoWorldProps world={world} />}
        </Suspense>
      </div>
    </>
  );
}
