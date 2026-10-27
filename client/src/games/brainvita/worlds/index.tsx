import { Suspense, lazy } from "react";
import { BrainVitaProps } from "../BrainVitaProps";
import { useSkinTokens } from "../BrainVitaSkinContext";
import { HoloScene, WoodScene, WoodSurface } from "./ClassicWorlds";

/**
 * Where a world's own drawing is chosen: the scene behind everything, the board, and the things lying on
 * the table beside it. Each world supplies all three; nothing here is shared between worlds but the place
 * it is put.
 *
 * Only the classic wood is bundled with the game. Every other world's drawing is fetched the first time that
 * world is shown, so a player who never leaves the wooden table never pays for five other tables. Until the
 * piece arrives nothing is drawn in its place, and the board's holes and marbles (which are not part of any
 * world's drawing) are already there.
 */

const HoloSurface = lazy(() => import("../BrainVitaHolo").then((m) => ({ default: m.HoloSurface })));
const HoloProps = lazy(() => import("../BrainVitaHolo").then((m) => ({ default: m.HoloProps })));
const ZenScene = lazy(() => import("./ZenWorld").then((m) => ({ default: m.ZenScene })));
const StoneSurface = lazy(() => import("./ZenWorld").then((m) => ({ default: m.StoneSurface })));
const ZenProps = lazy(() => import("./ZenWorld").then((m) => ({ default: m.ZenProps })));
const ReefScene = lazy(() => import("./ReefWorld").then((m) => ({ default: m.ReefScene })));
const ShellSurface = lazy(() => import("./ReefWorld").then((m) => ({ default: m.ShellSurface })));
const ReefProps = lazy(() => import("./ReefWorld").then((m) => ({ default: m.ReefProps })));
const ToyScene = lazy(() => import("./ToyWorld").then((m) => ({ default: m.ToyScene })));
const ToySurface = lazy(() => import("./ToyWorld").then((m) => ({ default: m.ToySurface })));
const ToyProps = lazy(() => import("./ToyWorld").then((m) => ({ default: m.ToyProps })));
const PalaceScene = lazy(() => import("./PalaceWorld").then((m) => ({ default: m.PalaceScene })));
const PalaceSurface = lazy(() => import("./PalaceWorld").then((m) => ({ default: m.PalaceSurface })));
const PalaceProps = lazy(() => import("./PalaceWorld").then((m) => ({ default: m.PalaceProps })));
const SlateScene = lazy(() => import("./SlateWorld").then((m) => ({ default: m.SlateScene })));
const SlateProps = lazy(() => import("./SlateWorld").then((m) => ({ default: m.SlateProps })));

/** Whatever fills the table behind the board, over the world's background colour. */
export function SceneArt() {
  const { surface } = useSkinTokens();
  if (surface === "wood") return <WoodScene />;
  if (surface === "holo") return <HoloScene />;
  return (
    <Suspense fallback={null}>
      {surface === "stone" && <ZenScene />}
      {surface === "reef" && <ReefScene />}
      {surface === "toy" && <ToyScene />}
      {surface === "palace" && <PalaceScene />}
      {surface === "slate" && <SlateScene />}
    </Suspense>
  );
}

/** The board itself, at the rim width the screen allows. */
export function BoardArt({ frame }: { frame: number }) {
  const { surface } = useSkinTokens();
  // The slate's board is the classic carving in a slate palette, so it is drawn by the same component.
  if (surface === "wood" || surface === "slate") return <WoodSurface frame={frame} />;
  return (
    <Suspense fallback={null}>
      {surface === "holo" && <HoloSurface frame={frame} />}
      {surface === "stone" && <StoneSurface frame={frame} />}
      {surface === "reef" && <ShellSurface frame={frame} />}
      {surface === "toy" && <ToySurface frame={frame} />}
      {surface === "palace" && <PalaceSurface frame={frame} />}
    </Suspense>
  );
}

/** What lies round the board, in the four corners the cross leaves empty. */
export function PropsArt() {
  const { surface } = useSkinTokens();
  if (surface === "wood") return <BrainVitaProps />;
  return (
    <Suspense fallback={null}>
      {surface === "holo" && <HoloProps />}
      {surface === "stone" && <ZenProps />}
      {surface === "reef" && <ReefProps />}
      {surface === "toy" && <ToyProps />}
      {surface === "palace" && <PalaceProps />}
      {surface === "slate" && <SlateProps />}
    </Suspense>
  );
}
