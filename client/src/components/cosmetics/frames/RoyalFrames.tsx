import { arcPath, CENTER, polar, spread, starPath, timing, type FrameProps } from "./frameGeometry";

/**
 * Five frames that sit on or round the head: a crown, a laurel wreath, a dragon, a pair of cat ears and a
 * colour wheel. Some wear the avatar, some circle it.
 */

// ── Royal Crown ──

/** A gold crown resting on the avatar, floating a little, over a ring a highlight sweeps round. */
export function RoyalCrown({ uid }: FrameProps) {
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
      </defs>
      <circle cx={CENTER} cy={CENTER} r={44.5} fill="none" stroke={`url(#${uid}-gold)`} strokeWidth={2.4} />
      <circle cx={CENTER} cy={CENTER} r={44.5} fill="none" stroke="#FFFFFF" strokeOpacity={0.85} strokeWidth={2.4} strokeLinecap="round" strokeDasharray="10 270" className="af-spin" style={timing(5)} />
      <g transform="translate(50 -1)">
        <g className="af-float" style={timing(3.6)}>
          <path d="M-13 15 L-14.4 2 L-7 8.4 L0 -3.4 L7 8.4 L14.4 2 L13 15 Z" fill={`url(#${uid}-gold)`} stroke="#92400E" strokeWidth={0.7} strokeLinejoin="round" />
          <rect x={-13} y={11.6} width={26} height={3.8} rx={0.9} fill="#F59E0B" stroke="#92400E" strokeWidth={0.5} />
          {[-14.4, 0, 14.4].map((x, index) => (
            <circle key={x} cx={x} cy={[2, -3.4, 2][index]} r={1.7} fill="#FFF7ED" stroke="#B45309" strokeWidth={0.4} />
          ))}
          {([[-6, "#EF4444"], [0, "#3B82F6"], [6, "#10B981"]] as const).map(([x, color]) => (
            <circle key={x} cx={x} cy={13.5} r={1.2} fill={color} />
          ))}
          <path d={starPath(9.5, -6, 2.6, 0.6, 4)} fill="#FFFFFF" className="af-twinkle" style={timing(2.4)} />
        </g>
      </g>
    </g>
  );
}

// ── Victory Laurel ──

const LEAVES_PER_SIDE = 10;
const LEAF = "M-5.6 0 Q0 -3.2 5.6 0 Q0 3.2 -5.6 0 Z";
const LEAF_TILT = 28;

function branchAngles(side: "left" | "right"): number[] {
  const sweep = 150;
  return Array.from({ length: LEAVES_PER_SIDE }, (_, index) => {
    const along = (index * sweep) / (LEAVES_PER_SIDE - 1);
    return side === "left" ? 188 + along : 172 - along;
  });
}

/** A golden laurel wreath, a branch up each side from a red bow to a star at the top, shimmering leaf by leaf. */
export function VictoryLaurel(_props: FrameProps) {
  const [bowX, bowY] = polar(180, 45.4);
  return (
    <g>
      <path d={arcPath(44.6, 188, 338)} fill="none" stroke="#854D0E" strokeWidth={1} />
      <path d={arcPath(44.6, 22, 172)} fill="none" stroke="#854D0E" strokeWidth={1} />
      {(["left", "right"] as const).flatMap((side) =>
        branchAngles(side).map((angle, index) => {
          const [x, y] = polar(angle, 44.6 + (index % 2 === 0 ? -1.6 : 1.6));
          const turn = side === "left" ? angle - LEAF_TILT : angle + 180 + LEAF_TILT;
          return (
            <path
              key={`${side}-${index}`}
              d={LEAF}
              fill={index % 2 === 0 ? "#65A30D" : "#CA8A04"}
              stroke="#3F6212"
              strokeWidth={0.3}
              transform={`translate(${x} ${y}) rotate(${turn})`}
              className="af-pulse"
              style={timing(2.8, index * 0.2 + (side === "left" ? 0 : 0.1))}
            />
          );
        }),
      )}
      <g transform={`translate(${bowX} ${bowY})`}>
        <path d="M0 0 L-5.2 -2.6 L-4.6 2.6 Z" fill="#DC2626" stroke="#7F1D1D" strokeWidth={0.4} />
        <path d="M0 0 L5.2 -2.6 L4.6 2.6 Z" fill="#DC2626" stroke="#7F1D1D" strokeWidth={0.4} />
        <path d="M-1 1 L-3.4 6.4 L-0.4 4.8 Z M1 1 L3.4 6.4 L0.4 4.8 Z" fill="#B91C1C" />
        <circle r={1.4} fill="#EF4444" stroke="#7F1D1D" strokeWidth={0.3} />
      </g>
      <path d={starPath(50, 4.8, 3.4, 1.4)} fill="#FACC15" stroke="#CA8A04" strokeWidth={0.3} className="af-twinkle" style={timing(3)} />
    </g>
  );
}

// ── Dragon Coil ──

const DRAGON_SPINES = spread(18, 4);

/** A green dragon curled round the avatar, scales sliding along its body, spines on its back, breathing a puff of fire. */
export function DragonCoil(_props: FrameProps) {
  const [headX, headY] = polar(28, 44.6);
  return (
    <g>
      <circle cx={CENTER} cy={CENTER} r={44.6} fill="none" stroke="#047857" strokeWidth={5.8} />
      <circle cx={CENTER} cy={CENTER} r={44.6} fill="none" stroke="#34D399" strokeWidth={3} strokeDasharray="2.6 1.6" className="af-slither" style={timing(2.4)} />
      <circle cx={CENTER} cy={CENTER} r={47.2} fill="none" stroke="#064E3B" strokeWidth={0.5} />
      {DRAGON_SPINES.map((angle) => {
        const [x, y] = polar(angle, 47.4);
        return <path key={angle} d="M-1.5 0 L0 -3.2 L1.5 0 Z" fill="#10B981" stroke="#064E3B" strokeWidth={0.3} transform={`translate(${x} ${y}) rotate(${angle})`} />;
      })}
      <g transform={`translate(${headX} ${headY}) rotate(28) scale(1.5)`}>
        <path d="M-3 -3.4 L-7.6 -7.4 L-1 -4.4 Z" fill="#FDE68A" stroke="#B45309" strokeWidth={0.3} />
        <path d="M-4.2 -3.8 L4.6 -2.4 L8.6 0.4 L4.6 3 L-4.2 3.8 Q-6.4 0 -4.2 -3.8 Z" fill="#059669" stroke="#064E3B" strokeWidth={0.6} strokeLinejoin="round" />
        <circle cx={1.6} cy={-1.2} r={1.25} fill="#FACC15" stroke="#78350F" strokeWidth={0.3} />
        <circle cx={1.8} cy={-1.2} r={0.5} fill="#0F172A" />
        <circle cx={6.2} cy={-0.4} r={0.45} fill="#064E3B" />
        <g transform="translate(9 0.4) rotate(90)">
          <g className="af-flicker" style={timing(0.9)}>
            <path d="M0 -6.4 C2.6 -3.6 2.2 -1 0 -0.2 C-2.2 -1 -2.6 -3.6 0 -6.4 Z" fill="#FB923C" />
            <path d="M0 -4 C1.2 -2.6 1 -1.2 0 -0.6 C-1 -1.2 -1.2 -2.6 0 -4 Z" fill="#FEF08A" />
          </g>
        </g>
      </g>
    </g>
  );
}

// ── Cuddly Cat Ears ──

const EAR_OUTER = "M-8.6 3 Q-9.4 -9.5 -1.4 -15.5 Q6.4 -9.8 8.6 3 Z";
const EAR_INNER = "M-5 2 Q-5.4 -6.6 -1.2 -10.6 Q3.2 -6.8 5 2 Z";
const PAW_ANGLES = [150, 180, 210];

function Ear({ angle, delay }: { angle: number; delay: number }) {
  const [x, y] = polar(angle, 40.5);
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <g className="af-wiggle" style={timing(5.5, delay)}>
        <path d={EAR_OUTER} fill="#FDBA74" stroke="#C2410C" strokeWidth={0.7} strokeLinejoin="round" />
        <path d={EAR_INNER} fill="#FBCFE8" />
      </g>
    </g>
  );
}

/** A pair of cat ears that twitch now and then, a ring of stitched pink and paw prints along the bottom. */
export function CuddlyCatEars(_props: FrameProps) {
  return (
    <g>
      <circle cx={CENTER} cy={CENTER} r={44} fill="none" stroke="#F9A8D4" strokeWidth={2.8} />
      <circle cx={CENTER} cy={CENTER} r={44} fill="none" stroke="#FFFFFF" strokeWidth={1.2} strokeLinecap="round" strokeDasharray="0.1 4.6" />
      <Ear angle={-33} delay={0} />
      <Ear angle={33} delay={0.25} />
      {PAW_ANGLES.map((angle) => {
        const [x, y] = polar(angle, 47);
        return (
          <g key={angle} transform={`translate(${x} ${y}) rotate(${angle})`} fill="#F9A8D4">
            <ellipse cy={0.8} rx={1.7} ry={1.4} />
            {[-1.6, 0, 1.6].map((dx) => (
              <circle key={dx} cx={dx} cy={dx === 0 ? -1.5 : -0.9} r={0.65} />
            ))}
          </g>
        );
      })}
    </g>
  );
}

// ── Prism Spinner ──

const SEGMENTS = 24;
const SEGMENT_SPAN = 360 / SEGMENTS;

/** Every colour of the rainbow in one ring, turning like a colour wheel, a pale dashed ring turning against it. */
export function PrismSpinner(_props: FrameProps) {
  return (
    <g>
      <g className="af-spin" style={timing(8)}>
        {Array.from({ length: SEGMENTS }, (_, index) => (
          <path key={index} d={arcPath(44.6, index * SEGMENT_SPAN, (index + 1) * SEGMENT_SPAN + 0.4)} fill="none" stroke={`hsl(${index * SEGMENT_SPAN} 90% 58%)`} strokeWidth={4.4} />
        ))}
      </g>
      <circle cx={CENTER} cy={CENTER} r={41.9} fill="none" stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={0.7} />
      <circle cx={CENTER} cy={CENTER} r={48} fill="none" stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={0.8} strokeLinecap="round" strokeDasharray="1.4 3.6" className="af-spin-rev" style={timing(12)} />
    </g>
  );
}
