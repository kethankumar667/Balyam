import { Suspense, lazy } from "react";
import type { WorldId } from "@shared/worlds";

/**
 * What a Rummy table's WORLD draws behind the table: the room the table stands in. It sits behind everything (the
 * panels, the felt and the cards are opaque or translucent over it), so it shows round and between them. The classic
 * table draws nothing here. Every other world is fetched the first time it is shown, so the classic table's bundle
 * does not grow, and until it arrives nothing is drawn in its place. The scenes are shared with Brain Vita's and
 * Ludo's worlds, so a name means one place in every game.
 *
 * The scene is quieted (see `opacity`) because a card table must keep the hand forward: it is atmosphere, never a
 * competitor for the eye. Purely decoration: hidden from assistive tech, never in the way of a tap, and it changes no
 * rule or piece of state.
 */

const ToyScene = lazy(() => import("../brainvita/worlds/ToyWorld").then((m) => ({ default: m.ToyScene })));
const PalaceScene = lazy(() => import("../brainvita/worlds/PalaceWorld").then((m) => ({ default: m.PalaceScene })));
const HoloScene = lazy(() => import("../brainvita/worlds/ClassicWorlds").then((m) => ({ default: m.HoloScene })));
const ZenScene = lazy(() => import("../brainvita/worlds/ZenWorld").then((m) => ({ default: m.ZenScene })));
const ReefScene = lazy(() => import("../brainvita/worlds/ReefWorld").then((m) => ({ default: m.ReefScene })));

/** Every world but the classic table draws a scene. */
const SCENE_WORLDS: readonly WorldId[] = ["neon", "toy", "zen", "reef", "palace"];

export function RummyWorldScene({ world }: { world: WorldId }) {
  if (!SCENE_WORLDS.includes(world)) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 select-none overflow-hidden opacity-50">
      <Suspense fallback={null}>
        {world === "neon" && <HoloScene />}
        {world === "toy" && <ToyScene />}
        {world === "zen" && <ZenScene />}
        {world === "reef" && <ReefScene />}
        {world === "palace" && <PalaceScene />}
      </Suspense>
    </div>
  );
}
