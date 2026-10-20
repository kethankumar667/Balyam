import { CENTER, circumference, gearPath, polar, polarAt, starPath, timing, type FrameProps } from "./frameGeometry";

/**
 * Five frames of machines and the night sky: orbiting stars, a galaxy, a neon sign, an arcade border and a
 * clockwork of gears.
 */

// ── Star Orbit ──

const TWINKLES = [
  { angle: 30, radius: 47 },
  { angle: 95, radius: 48.4 },
  { angle: 170, radius: 47.4 },
  { angle: 205, radius: 48.6 },
  { angle: 285, radius: 47.6 },
];

/** A gold star, a ringed planet, a sparkle and a moon, each circling the avatar at its own speed. */
export function StarOrbit(_props: FrameProps) {
  const [starX, starY] = polar(0, 44);
  const [planetX, planetY] = polar(120, 46);
  const [sparkX, sparkY] = polar(240, 48);
  const [moonX, moonY] = polar(320, 43);
  return (
    <g>
      <circle cx={CENTER} cy={CENTER} r={44} fill="none" stroke="#818CF8" strokeOpacity={0.55} strokeWidth={0.8} strokeDasharray="1 3" />
      <circle cx={CENTER} cy={CENTER} r={48} fill="none" stroke="#818CF8" strokeOpacity={0.3} strokeWidth={0.7} />
      <g className="af-spin" style={timing(9)}>
        <path d={starPath(starX, starY, 5.6, 2.4)} fill="#FACC15" stroke="#CA8A04" strokeWidth={0.5} strokeLinejoin="round" />
      </g>
      <g className="af-spin-rev" style={timing(15)}>
        <ellipse cx={planetX} cy={planetY} rx={6.8} ry={1.8} fill="none" stroke="#F59E0B" strokeWidth={0.8} transform={`rotate(-22 ${planetX} ${planetY})`} />
        <circle cx={planetX} cy={planetY} r={3.8} fill="#A78BFA" stroke="#6D28D9" strokeWidth={0.5} />
      </g>
      <g className="af-spin" style={timing(24)}>
        <path d={starPath(sparkX, sparkY, 4, 0.9, 4)} fill="#38BDF8" stroke="#0284C7" strokeWidth={0.3} />
      </g>
      <g className="af-spin-rev" style={timing(33)}>
        <circle cx={moonX} cy={moonY} r={2.9} fill="#E2E8F0" stroke="#64748B" strokeWidth={0.5} />
      </g>
      {TWINKLES.map(({ angle, radius }, index) => {
        const [x, y] = polar(angle, radius);
        return <circle key={angle} cx={x} cy={y} r={0.9} fill="#FFFFFF" className="af-twinkle" style={timing(2 + index * 0.4, index * 0.5)} />;
      })}
    </g>
  );
}

// ── Galaxy Portal ──

const GALAXY_STARS = [
  { angle: 12, radius: 49 },
  { angle: 52, radius: 41.8 },
  { angle: 98, radius: 48.4 },
  { angle: 140, radius: 42.4 },
  { angle: 188, radius: 49 },
  { angle: 232, radius: 41.6 },
  { angle: 276, radius: 48.2 },
  { angle: 318, radius: 42.6 },
];

function Arc({ radius, share, color, width }: { radius: number; share: number; color: string; width: number }) {
  const total = circumference(radius);
  return <circle cx={CENTER} cy={CENTER} r={radius} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={`${total * share} ${total * (1 - share)}`} />;
}

/** A swirling portal: three arcs of light racing at different speeds over a purple glow, with stars blinking in it. */
export function GalaxyPortal({ uid }: FrameProps) {
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-galaxy`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="50%" stopColor="#22D3EE" />
          <stop offset="100%" stopColor="#DB2777" />
        </linearGradient>
      </defs>
      <circle cx={CENTER} cy={CENTER} r={44.4} fill="none" stroke={`url(#${uid}-galaxy)`} strokeWidth={8} strokeOpacity={0.8} className="af-pulse" style={timing(4)} />
      <g className="af-spin" style={timing(6)}>
        <Arc radius={44.5} share={0.18} color="#C084FC" width={3} />
      </g>
      <g className="af-spin-rev" style={timing(9)}>
        <Arc radius={46.4} share={0.1} color="#22D3EE" width={2} />
      </g>
      <g className="af-spin" style={timing(13)}>
        <Arc radius={42.6} share={0.12} color="#F472B6" width={2.2} />
      </g>
      <circle cx={CENTER} cy={CENTER} r={39.6} fill="none" stroke="#1E1B4B" strokeOpacity={0.35} strokeWidth={2.4} />
      {GALAXY_STARS.map(({ angle, radius }, index) => {
        const [x, y] = polar(angle, radius);
        return <path key={angle} d={starPath(x, y, 1.9, 0.45, 4)} fill="#FFFFFF" className="af-twinkle" style={timing(1.8 + (index % 4) * 0.5, index * 0.3)} />;
      })}
    </g>
  );
}

// ── Neon Tube ──

const NEON_OUTER = "88 5 64 5 58 5 50 5";
const NEON_INNER = "70 4 102 4 76 4";

/** Two bent glass tubes lit like a shop sign, one pink, one cyan, each flickering as if the sign were a little faulty. */
export function NeonTube({ uid }: FrameProps) {
  return (
    <g>
      <defs>
        <filter id={`${uid}-glow`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
      </defs>
      <g className="af-neon" style={timing(6)}>
        <circle cx={CENTER} cy={CENTER} r={45.2} fill="none" stroke="#FF2E93" strokeOpacity={0.6} strokeWidth={4} strokeDasharray={NEON_OUTER} filter={`url(#${uid}-glow)`} />
        <circle cx={CENTER} cy={CENTER} r={45.2} fill="none" stroke="#FF4FA3" strokeWidth={1.9} strokeLinecap="round" strokeDasharray={NEON_OUTER} />
        <circle cx={CENTER} cy={CENTER} r={45.2} fill="none" stroke="#FFE4F1" strokeWidth={0.6} strokeLinecap="round" strokeDasharray={NEON_OUTER} />
      </g>
      <g className="af-neon" style={timing(7, 1.3)}>
        <circle cx={CENTER} cy={CENTER} r={41.8} fill="none" stroke="#22D3EE" strokeOpacity={0.6} strokeWidth={3.4} strokeDasharray={NEON_INNER} filter={`url(#${uid}-glow)`} />
        <circle cx={CENTER} cy={CENTER} r={41.8} fill="none" stroke="#67E8F9" strokeWidth={1.6} strokeLinecap="round" strokeDasharray={NEON_INNER} />
        <circle cx={CENTER} cy={CENTER} r={41.8} fill="none" stroke="#ECFEFF" strokeWidth={0.5} strokeLinecap="round" strokeDasharray={NEON_INNER} />
      </g>
    </g>
  );
}

// ── Pixel Arcade ──

const PIXEL = 3.6;
const PIXEL_COLORS = ["#F43F5E", "#FACC15", "#22D3EE", "#A3E635"];
const PIXEL_SAMPLES = 40;

/** The ring snapped to a pixel grid, so it comes out as stairs; one square every sample, in the order round the ring. */
function pixelRing(): Array<{ x: number; y: number }> {
  const seen = new Set<string>();
  const squares: Array<{ x: number; y: number }> = [];
  for (let sample = 0; sample < PIXEL_SAMPLES; sample++) {
    const [px, py] = polar((sample * 360) / PIXEL_SAMPLES, 45);
    const x = Math.round(px / PIXEL) * PIXEL;
    const y = Math.round(py / PIXEL) * PIXEL;
    const key = `${x}:${y}`;
    if (!seen.has(key)) {
      seen.add(key);
      squares.push({ x, y });
    }
  }
  return squares;
}

const PIXELS = pixelRing();

/** An old arcade screen's border: a ring of coloured squares with a light that chases round them. */
export function PixelArcade(_props: FrameProps) {
  return (
    <g shapeRendering="crispEdges">
      {PIXELS.map(({ x, y }, index) => (
        <rect key={`${x}:${y}`} x={x - PIXEL / 2} y={y - PIXEL / 2} width={PIXEL} height={PIXEL} fill={PIXEL_COLORS[index % PIXEL_COLORS.length]} className="af-blink" style={timing(1.8, index * 0.07)} />
      ))}
    </g>
  );
}

// ── Clockwork Gears ──

const GEARS = [
  { angle: -48, radius: 45.4, outer: 8.4, inner: 6.5, teeth: 10, fill: "#D97706", seconds: 9, reverse: false },
  { angle: 92, radius: 46.2, outer: 6.4, inner: 4.9, teeth: 8, fill: "#B45309", seconds: 7.2, reverse: true },
  { angle: 212, radius: 46, outer: 5.2, inner: 4, teeth: 7, fill: "#F59E0B", seconds: 5.6, reverse: false },
];

/** A brass rail with three gears of different sizes meshing round it, turning one way and the next. */
export function ClockworkGears(_props: FrameProps) {
  return (
    <g>
      <circle cx={CENTER} cy={CENTER} r={44} fill="none" stroke="#92400E" strokeWidth={1.4} />
      <circle cx={CENTER} cy={CENTER} r={44} fill="none" stroke="#FCD34D" strokeWidth={0.5} strokeDasharray="1 3" />
      {GEARS.map(({ angle, radius, outer, inner, teeth, fill, seconds, reverse }) => {
        const [cx, cy] = polarAt(CENTER, CENTER, angle, radius);
        return (
          <g key={angle} className={reverse ? "af-roll af-roll-rev" : "af-roll"} style={timing(seconds)}>
            <path d={gearPath(cx, cy, outer, inner, teeth)} fill={fill} stroke="#78350F" strokeWidth={0.6} strokeLinejoin="round" />
            <circle cx={cx} cy={cy} r={inner * 0.4} fill="#78350F" />
            <circle cx={cx} cy={cy} r={inner * 0.16} fill="#FDE68A" />
          </g>
        );
      })}
    </g>
  );
}
