import { CENTER, circumference, polar, starPath, timing, type FrameProps } from "./frameGeometry";

/**
 * Golden Reunion: the frame earned by bringing three new friends to play.
 *
 * It is drawn as a piece of jewellery, because that is what a reunion keepsake is. A thick milled gold band
 * with a bevel on each side, pearl beads and a scalloped gold-lace edge round it, an antique sunburst of
 * pins turning slowly behind. Three medallions are set into the rim, one for each friend, each a tiny
 * silhouette on a gemstone of its own, with a faceted diamond between each pair. A sheen travels the band,
 * the medallions float a little out of step with each other and the diamonds wink. All of it moves in CSS
 * (avatar-frames.css), which stops every piece under reduced motion.
 *
 * Geometry (see frameGeometry.ts): the avatar's edge is at a radius of about 40 on the 100 x 100 canvas.
 * From the inside out: the band 40.6 to 45.4, the beads at 46, the lace edge 47 to 48.6, the pins to 50.
 */

const BAND = 43;
const BAND_WIDTH = 4.8;
const BEAD_RING = 46;
const BEADS = 96;
const LACE_RADIUS = 47;
const SCALLOPS = 36;
const SCALLOP_ARC = 6;
const PINS = 24;
const MEDALLION = 7.2;

/** The three friends: where they sit on the rim, the gemstone behind each, and when each starts to float. */
const FRIENDS = [
  { angle: 0, gem: "amber", delay: 0 },
  { angle: 120, gem: "coral", delay: 0.9 },
  { angle: 240, gem: "teal", delay: 1.8 },
] as const;

/** Light and dark stop of each gemstone. */
const GEMS = {
  amber: ["#FFF0C2", "#F2A024"],
  coral: ["#FFE0D9", "#EE5F52"],
  teal: ["#DDF7F1", "#2A9D8F"],
} as const;

/** A diamond sits between each pair of friends. */
const DIAMONDS = [60, 180, 300];

/** The lace edge: a run of shallow arcs bulging outward, one between each pair of neighbouring points. */
function laceEdge(): string {
  const parts: string[] = [];
  for (let index = 0; index < SCALLOPS; index++) {
    const [x1, y1] = polar((index * 360) / SCALLOPS, LACE_RADIUS);
    const [x2, y2] = polar(((index + 1) * 360) / SCALLOPS, LACE_RADIUS);
    parts.push(`${index === 0 ? "M" : "L"}${x1} ${y1} A${SCALLOP_ARC} ${SCALLOP_ARC} 0 0 1 ${x2} ${y2}`);
  }
  return `${parts.join(" ")} Z`;
}

const LACE = laceEdge();

function Pins() {
  return (
    <g className="af-spin" style={timing(70)}>
      {Array.from({ length: PINS }, (_, index) => {
        const angle = (index * 360) / PINS;
        const long = index % 2 === 0;
        const [x1, y1] = polar(angle, 47.6);
        const [x2, y2] = polar(angle, long ? 49.2 : 48.5);
        return (
          <g key={angle}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#E0A62C" strokeWidth={long ? 1.1 : 0.7} strokeLinecap="round" />
            {long && <circle cx={x2} cy={y2} r={0.75} fill="#FFE9A0" stroke="#A8700F" strokeWidth={0.25} />}
          </g>
        );
      })}
    </g>
  );
}

function Friend({ uid, angle, gem, delay }: { uid: string; angle: number; gem: keyof typeof GEMS; delay: number }) {
  const [x, y] = polar(angle, BAND);
  const bead = (circumference(6.4) / 10) - 0.01;
  return (
    <g transform={`translate(${x} ${y})`} data-part="friend">
      <circle cx={0.6} cy={0.9} r={MEDALLION} fill="#2A1503" fillOpacity={0.3} />
      <g className="af-float" style={timing(4.2, delay)}>
        <circle r={MEDALLION} fill={`url(#${uid}-gold)`} stroke="#7A4A07" strokeWidth={0.55} />
        <circle r={6.4} fill="none" stroke="#FFF6D6" strokeWidth={0.7} strokeLinecap="round" strokeDasharray={`0.01 ${bead}`} />
        <circle r={5.4} fill={`url(#${uid}-${gem})`} stroke="#FFF1BF" strokeWidth={0.55} />
        <circle cy={-1.5} r={1.8} fill="#5C3506" />
        <path d="M-3.7 3.7 Q-3.6 0.6 0 0.6 Q3.6 0.6 3.7 3.7 Z" fill="#5C3506" />
        <path d="M-3.8 -3.1 A5.4 5.4 0 0 1 1.9 -5.1" fill="none" stroke="#FFFFFF" strokeOpacity={0.8} strokeWidth={0.8} strokeLinecap="round" />
      </g>
    </g>
  );
}

function Diamond({ angle, index }: { angle: number; index: number }) {
  const [x, y] = polar(angle, BAND);
  return (
    <g>
      <g transform={`translate(${x} ${y}) rotate(45)`}>
        <rect x={-1.7} y={-1.7} width={3.4} height={3.4} fill="#FFFFFF" stroke="#A8700F" strokeWidth={0.45} />
        <path d="M-1.7 -1.7 L0 0 L1.7 -1.7 Z" fill="#DCEBFF" />
      </g>
      <path d={starPath(x, y, 4.4, 0.9, 4)} fill="#FFFFFF" fillOpacity={0.95} className="af-twinkle" style={timing(2.8, index * 0.9)} />
    </g>
  );
}

export default function GoldenReunionFrame({ uid }: FrameProps) {
  const perimeter = circumference(BAND);
  const beadStep = circumference(BEAD_RING) / BEADS;
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFF2B3" />
          <stop offset="28%" stopColor="#F5C44B" />
          <stop offset="54%" stopColor="#B87812" />
          <stop offset="78%" stopColor="#FFDF84" />
          <stop offset="100%" stopColor="#8F560A" />
        </linearGradient>
        {(Object.keys(GEMS) as (keyof typeof GEMS)[]).map((gem) => (
          <radialGradient key={gem} id={`${uid}-${gem}`} cx="0.35" cy="0.3" r="0.8">
            <stop offset="0%" stopColor={GEMS[gem][0]} />
            <stop offset="100%" stopColor={GEMS[gem][1]} />
          </radialGradient>
        ))}
      </defs>

      <circle cx={CENTER} cy={CENTER} r={48.6} fill="none" stroke="#FFD66B" strokeOpacity={0.3} strokeWidth={2.2} className="af-breathe" style={timing(4.5)} />
      <Pins />

      {/* the lace edge, then the pearl beads on a dark gold seat so they read on light grounds as well as dark */}
      <path d={LACE} fill="none" stroke="#A8700F" strokeWidth={0.9} strokeLinejoin="round" />
      <path d={LACE} fill="none" stroke="#FFD870" strokeWidth={0.45} strokeLinejoin="round" />
      <circle cx={CENTER} cy={CENTER} r={BEAD_RING} fill="none" stroke="#8A5A0E" strokeWidth={1.8} strokeLinecap="round" strokeDasharray={`0.01 ${beadStep - 0.01}`} />
      <circle cx={CENTER} cy={CENTER} r={BEAD_RING} fill="none" stroke="#FFF6D6" strokeWidth={1.15} strokeLinecap="round" strokeDasharray={`0.01 ${beadStep - 0.01}`} />

      {/* the band: the gold itself, a bevel each side, a sheen that travels it */}
      <circle cx={CENTER} cy={CENTER} r={BAND} fill="none" stroke={`url(#${uid}-gold)`} strokeWidth={BAND_WIDTH} />
      <circle cx={CENTER} cy={CENTER} r={41} fill="none" stroke="#FFF6D6" strokeOpacity={0.9} strokeWidth={0.5} />
      <circle cx={CENTER} cy={CENTER} r={45.2} fill="none" stroke="#7A4A07" strokeOpacity={0.75} strokeWidth={0.5} />
      <circle cx={CENTER} cy={CENTER} r={BAND} fill="none" stroke="#FFFFFF" strokeOpacity={0.85} strokeWidth={BAND_WIDTH} strokeLinecap="round" strokeDasharray={`12 ${perimeter - 12}`} className="af-spin" style={timing(7)} />

      {DIAMONDS.map((angle, index) => (
        <Diamond key={angle} angle={angle} index={index} />
      ))}
      {FRIENDS.map((friend) => (
        <Friend key={friend.angle} uid={uid} {...friend} />
      ))}
    </g>
  );
}
