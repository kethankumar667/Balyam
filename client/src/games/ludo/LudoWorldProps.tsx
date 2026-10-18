import type { WorldId } from "@shared/worlds";
import { Blocks, Crayons, Duck } from "../brainvita/worlds/ToyWorld";
import { Diya, MarigoldBunch } from "../brainvita/worlds/PalaceWorld";
import { Bamboo, Cairn, Lantern } from "../brainvita/worlds/ZenWorld";
import { Scallop, SeaFan, Starfish } from "../brainvita/worlds/ReefWorld";
import { motion } from "../brainvita/worlds/WorldMotion";

/**
 * The things a world leaves lying about round a Ludo table, in the corners the rails and the board leave free. They sit
 * behind the rails and the board (the scene is behind everything), sized off the width of the screen so they stay
 * small beside a big board, and are only drawn on the wide layout. The board is a full square, so unlike Brain Vita's
 * cross there are no empty corners on it to put them in.
 */

const SIZE = "w-[clamp(96px,8.5vw,150px)]";

/** A target reticle: a dashed ring turning round two thin ones, with a bright core. Drawn flat, in the deck's own cyan. */
function NeonReticle({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 120 120" className={className}>
      <circle cx="60" cy="60" r="54" fill="none" stroke="#22D3EE" strokeWidth="1.5" strokeDasharray="6 8" opacity="0.7" />
      <circle cx="60" cy="60" r="38" fill="none" stroke="#22D3EE" strokeWidth="2" opacity="0.85" />
      <circle cx="60" cy="60" r="22" fill="none" stroke="#E879F9" strokeWidth="1.5" opacity="0.8" />
      <path d="M60 2 V16 M60 104 V118 M2 60 H16 M104 60 H118" stroke="#A5F3FC" strokeWidth="2" />
      <circle cx="60" cy="60" r="6" fill="#A5F3FC" data-bvw style={{ animation: motion("twinkle", 3.4, { timing: "ease-in-out" }) }} />
    </svg>
  );
}

/** A core of energy: the glowing ball the deck's marbles are made of. */
function NeonOrb({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 120 120" className={className}>
      <defs>
        <radialGradient id="lw-neon-orb" cx="38%" cy="32%" r="72%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="30%" stopColor="#C4F8FF" />
          <stop offset="62%" stopColor="#22D3EE" />
          <stop offset="100%" stopColor="#083344" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="56" fill="#22D3EE" opacity="0.14" />
      <circle cx="60" cy="60" r="38" fill="url(#lw-neon-orb)" data-bvw style={{ animation: motion("float", 5, { timing: "ease-in-out" }) }} />
    </svg>
  );
}

/** A level meter: five bars of light, the way a deck shows signal. */
function NeonBars({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 120 90" className={className}>
      {[34, 56, 76, 52, 66].map((height, index) => (
        <rect key={index} x={8 + index * 22} y={84 - height} width="14" height={height} rx="2" fill={index === 2 ? "#E879F9" : "#22D3EE"} opacity={0.55 + index * 0.08} />
      ))}
      <path d="M4 86 H116" stroke="#A5F3FC" strokeWidth="1.5" opacity="0.7" />
    </svg>
  );
}

export default function LudoWorldProps({ world }: { world: WorldId }) {
  if (world === "neon") {
    return (
      <>
        <NeonReticle className={`absolute bottom-[2%] left-[1%] ${SIZE} drop-shadow-[0_0_10px_rgba(34,211,238,0.55)]`} />
        <NeonOrb className={`absolute right-[1.5%] top-[22%] ${SIZE} drop-shadow-[0_0_14px_rgba(34,211,238,0.6)]`} />
        <NeonBars className={`absolute bottom-[14%] right-[1.5%] ${SIZE} drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]`} />
      </>
    );
  }
  if (world === "toy") {
    return (
      <>
        <Blocks className={`absolute bottom-[2%] left-[1%] ${SIZE} drop-shadow-[0_8px_6px_rgba(80,50,0,0.25)]`} />
        <Duck className={`absolute right-[1.5%] top-[14%] ${SIZE} rotate-[6deg] drop-shadow-[0_8px_6px_rgba(80,50,0,0.25)]`} />
        <Crayons className={`absolute bottom-[2%] right-[1.5%] ${SIZE} drop-shadow-[0_8px_6px_rgba(80,50,0,0.25)]`} />
      </>
    );
  }
  if (world === "zen") {
    return (
      <>
        <Cairn className={`absolute bottom-[2%] left-[1%] ${SIZE} drop-shadow-[0_8px_6px_rgba(40,30,10,0.4)]`} />
        <Bamboo className="absolute right-[1.5%] top-[22%] h-[clamp(110px,14vw,190px)] w-auto drop-shadow-[0_8px_6px_rgba(40,30,10,0.35)]" />
        <Lantern className="absolute bottom-[14%] right-[1.5%] w-[clamp(70px,6.5vw,110px)] drop-shadow-[0_8px_6px_rgba(40,30,10,0.4)]" />
      </>
    );
  }
  if (world === "reef") {
    return (
      <>
        <Scallop className={`absolute bottom-[2%] left-[1%] ${SIZE} -rotate-[8deg] drop-shadow-[0_8px_6px_rgba(0,25,50,0.45)]`} />
        <SeaFan className={`absolute right-[1.5%] top-[22%] ${SIZE} rotate-[5deg] drop-shadow-[0_8px_6px_rgba(0,25,50,0.45)]`} />
        <Starfish className={`absolute bottom-[14%] right-[1.5%] ${SIZE} rotate-[12deg] drop-shadow-[0_8px_6px_rgba(0,25,50,0.45)]`} />
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
