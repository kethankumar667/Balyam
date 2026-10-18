import type { WorldId } from "@shared/worlds";
import { Blocks, Crayons, Duck } from "../brainvita/worlds/ToyWorld";
import { Diya, MarigoldBunch } from "../brainvita/worlds/PalaceWorld";

/**
 * The things a world leaves lying about round a Ludo table, in the corners the rails and the board leave free. They sit
 * behind the rails and the board (the scene is behind everything), sized off the width of the screen so they stay
 * small beside a big board, and are only drawn on the wide layout. The board is a full square, so unlike Brain Vita's
 * cross there are no empty corners on it to put them in.
 */

const SIZE = "w-[clamp(96px,8.5vw,150px)]";

export default function LudoWorldProps({ world }: { world: WorldId }) {
  if (world === "toy") {
    return (
      <>
        <Blocks className={`absolute bottom-[2%] left-[1%] ${SIZE} drop-shadow-[0_8px_6px_rgba(80,50,0,0.25)]`} />
        <Duck className={`absolute right-[1.5%] top-[14%] ${SIZE} rotate-[6deg] drop-shadow-[0_8px_6px_rgba(80,50,0,0.25)]`} />
        <Crayons className={`absolute bottom-[2%] right-[1.5%] ${SIZE} drop-shadow-[0_8px_6px_rgba(80,50,0,0.25)]`} />
      </>
    );
  }
  if (world === "palace") {
    return (
      <>
        <Diya className={`absolute bottom-[2%] left-[1%] ${SIZE} drop-shadow-[0_8px_8px_rgba(0,0,0,0.5)]`} />
        <MarigoldBunch className={`absolute right-[1%] top-[13%] ${SIZE} rotate-[5deg] drop-shadow-[0_8px_8px_rgba(0,0,0,0.4)]`} />
        <Diya className={`absolute bottom-[2%] right-[1.5%] ${SIZE} drop-shadow-[0_8px_8px_rgba(0,0,0,0.5)]`} delay={1.3} />
      </>
    );
  }
  return null;
}
