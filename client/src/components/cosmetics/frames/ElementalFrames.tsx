import { bandOutline, CENTER, polar, spread, starPath, timing, wavyRingPath, type FrameProps } from "./frameGeometry";

/**
 * Five frames made of weather and water: rolling fire, ice, lightning, waves and bubbles. What moves, and how,
 * is what tells them apart: the fire turns, the ice glints, the lightning strikes, the waves roll, the bubbles drift.
 */

// ── Blaze Ring ──

const FLAMES_BIG = bandOutline(wavyRingPath(47, 3.6, 9), 41);
const FLAMES_SMALL = bandOutline(wavyRingPath(45, 2.4, 13, 40), 41);

/** A ring of fire whose ragged edge rolls round the avatar, a smaller bright layer rolling the other way. */
export function BlazeRing({ uid }: FrameProps) {
  return (
    <g>
      <defs>
        <radialGradient id={`${uid}-blaze`} cx="50%" cy="50%" r="50%">
          <stop offset="80%" stopColor="#FDE047" />
          <stop offset="90%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#B91C1C" stopOpacity="0.9" />
        </radialGradient>
        <radialGradient id={`${uid}-ember`} cx="50%" cy="50%" r="50%">
          <stop offset="82%" stopColor="#FEF9C3" />
          <stop offset="96%" stopColor="#FB923C" />
        </radialGradient>
      </defs>
      <circle cx={CENTER} cy={CENTER} r={45} fill="none" stroke="#F97316" strokeOpacity={0.3} strokeWidth={8} className="af-pulse" style={timing(1.6)} />
      <g className="af-spin" style={timing(11)}>
        <path d={FLAMES_BIG} fillRule="evenodd" fill={`url(#${uid}-blaze)`} />
      </g>
      <g className="af-spin-rev" style={timing(7)}>
        <path d={FLAMES_SMALL} fillRule="evenodd" fill={`url(#${uid}-ember)`} fillOpacity={0.85} />
      </g>
    </g>
  );
}

// ── Frost Crystals ──

const GLINTS = [
  { angle: 15, radius: 48.4 },
  { angle: 75, radius: 47.6 },
  { angle: 140, radius: 48.6 },
  { angle: 205, radius: 47.8 },
  { angle: 260, radius: 48.4 },
  { angle: 320, radius: 47.5 },
];

function Crystal({ angle, radius, scale }: { angle: number; radius: number; scale: number }) {
  const [x, y] = polar(angle, radius);
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`}>
      <path d="M0 -8 L2.6 0 L0 4.6 L-2.6 0 Z" fill="#E0F2FE" stroke="#0EA5E9" strokeWidth={0.7} strokeLinejoin="round" />
      <path d="M0 -4 L-2.8 -6.4 M0 -4 L2.8 -6.4 M0 -1 L-3.2 -2.6 M0 -1 L3.2 -2.6" fill="none" stroke="#38BDF8" strokeWidth={0.7} strokeLinecap="round" />
    </g>
  );
}

/** An icy ring with six crystals and a glint travelling round it, snowflake sparkles blinking on and off. */
export function FrostCrystals(_props: FrameProps) {
  return (
    <g>
      <circle cx={CENTER} cy={CENTER} r={43.2} fill="none" stroke="#7DD3FC" strokeWidth={2} />
      <circle cx={CENTER} cy={CENTER} r={43.2} fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeDasharray="8 263" className="af-spin" style={timing(6)} />
      {spread(6).map((angle) => (
        <Crystal key={angle} angle={angle} radius={45} scale={1.4} />
      ))}
      {spread(6, 30).map((angle) => (
        <Crystal key={angle} angle={angle} radius={44} scale={0.8} />
      ))}
      {GLINTS.map(({ angle, radius }, index) => {
        const [x, y] = polar(angle, radius);
        return <path key={angle} d={starPath(x, y, 2.8, 0.6, 4)} fill="#FFFFFF" stroke="#38BDF8" strokeWidth={0.3} className="af-twinkle" style={timing(2.2 + (index % 3) * 0.5, index * 0.4)} />;
      })}
    </g>
  );
}

// ── Storm Arc ──

const BOLT = "M0 0 L-2.2 -3.2 L1.4 -4.6 L-1.8 -8.8 L1.2 -9.8 L0 -14";

/** A dark storm band with six lightning bolts that strike out of turn, each in two quick flashes. */
export function StormArc(_props: FrameProps) {
  return (
    <g>
      <circle cx={CENTER} cy={CENTER} r={43.6} fill="none" stroke="#1E3A8A" strokeWidth={4.6} />
      <circle cx={CENTER} cy={CENTER} r={41.6} fill="none" stroke="#60A5FA" strokeWidth={0.8} />
      {spread(6).map((angle, index) => {
        const [x, y] = polar(angle, 43.5);
        return (
          <g key={angle} transform={`translate(${x} ${y}) rotate(${angle})`}>
            <g className="af-flash" style={timing(2.6 + index * 0.55, index * 0.7)}>
              <path d={BOLT} fill="none" stroke="#38BDF8" strokeOpacity={0.45} strokeWidth={3.4} strokeLinejoin="round" />
              <path d={BOLT} fill="none" stroke="#FEF08A" strokeWidth={1.3} strokeLinejoin="miter" />
              <circle cy={-14} r={1.1} fill="#FFFFFF" />
            </g>
          </g>
        );
      })}
    </g>
  );
}

// ── Tidal Waves ──

const WAVE_NEAR = wavyRingPath(44.6, 2.5, 12);
const WAVE_FAR = wavyRingPath(46.8, 2, 9, 40);
const WAVE_FOAM = wavyRingPath(42.4, 1.5, 15, 10);
const DROPLET_ANGLES = [40, 160, 280];

/** Three rings of rolling water in different depths, with droplets bobbing at the surface. */
export function TidalWaves(_props: FrameProps) {
  return (
    <g>
      <circle cx={CENTER} cy={CENTER} r={44.6} fill="none" stroke="#0EA5E9" strokeOpacity={0.22} strokeWidth={7.5} />
      <g className="af-spin" style={timing(18)}>
        <path d={WAVE_NEAR} fill="none" stroke="#38BDF8" strokeWidth={1.7} />
      </g>
      <g className="af-spin-rev" style={timing(12)}>
        <path d={WAVE_FAR} fill="none" stroke="#22D3EE" strokeWidth={1.4} />
      </g>
      <g className="af-spin" style={timing(24)}>
        <path d={WAVE_FOAM} fill="none" stroke="#FFFFFF" strokeOpacity={0.8} strokeWidth={0.6} />
      </g>
      {DROPLET_ANGLES.map((angle, index) => {
        const [x, y] = polar(angle, 49.4);
        return (
          <g key={angle} className="af-float" style={timing(2.8 + index * 0.6, index * 0.5)}>
            <circle cx={x} cy={y} r={1.7} fill="#7DD3FC" stroke="#E0F2FE" strokeWidth={0.4} />
          </g>
        );
      })}
    </g>
  );
}

// ── Bubble Float ──

const BUBBLE_TINTS = ["#7DD3FC", "#F9A8D4", "#86EFAC", "#C4B5FD"];
const BUBBLES = [
  { angle: 8, radius: 45.5, size: 3.6 },
  { angle: 38, radius: 46.8, size: 2.4 },
  { angle: 66, radius: 45, size: 4.4 },
  { angle: 102, radius: 46.5, size: 2.8 },
  { angle: 132, radius: 45.2, size: 3.8 },
  { angle: 162, radius: 47, size: 2.2 },
  { angle: 196, radius: 45.6, size: 4.2 },
  { angle: 228, radius: 46.6, size: 3 },
  { angle: 260, radius: 45.4, size: 3.6 },
  { angle: 292, radius: 47, size: 2.4 },
  { angle: 326, radius: 45.6, size: 4 },
];

/** Soap bubbles of every size drifting up and down round the avatar, each with its own glint. */
export function BubbleFloat(_props: FrameProps) {
  return (
    <g>
      <circle cx={CENTER} cy={CENTER} r={43.6} fill="none" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={0.9} strokeLinecap="round" strokeDasharray="0.1 3.2" />
      {BUBBLES.map(({ angle, radius, size }, index) => {
        const [x, y] = polar(angle, radius);
        const tint = BUBBLE_TINTS[index % BUBBLE_TINTS.length];
        return (
          <g key={angle} className="af-float" style={timing(3.2 + (index % 4) * 0.7, index * 0.35)}>
            <circle cx={x} cy={y} r={size} fill={tint} fillOpacity={0.22} stroke={tint} strokeWidth={0.6} />
            <circle cx={x - size * 0.35} cy={y - size * 0.35} r={size * 0.28} fill="#FFFFFF" fillOpacity={0.85} />
          </g>
        );
      })}
    </g>
  );
}
