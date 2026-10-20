import { CENTER, polar, spread, timing, type FrameProps } from "./frameGeometry";

/**
 * Five frames drawn from festivals and the playground: a garland, a row of lamps, a floor pattern, a peacock
 * and a cricket ball. Each is a different shape, not a different colour of the same ring.
 */

// ── Marigold Garland ──

const GARLAND_FLOWERS = 14;
const PETAL_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

/** A string of orange and gold marigolds with leaves between, swaying a little as if hung up for a festival. */
export function MarigoldGarland(_props: FrameProps) {
  const angles = spread(GARLAND_FLOWERS);
  const half = 360 / GARLAND_FLOWERS / 2;
  return (
    <g className="af-sway" style={timing(7)}>
      <circle cx={CENTER} cy={CENTER} r={44.5} fill="none" stroke="#166534" strokeWidth={1.4} />
      {angles.map((angle) => {
        const [x, y] = polar(angle + half, 44.5);
        return <ellipse key={`leaf-${angle}`} rx={3.4} ry={1.5} fill="#16A34A" transform={`translate(${x} ${y}) rotate(${angle + half})`} />;
      })}
      {angles.map((angle, index) => {
        const [x, y] = polar(angle, 44.5);
        const petal = index % 2 === 0 ? "#F97316" : "#F59E0B";
        return (
          <g key={`flower-${angle}`} transform={`translate(${x} ${y})`}>
            {PETAL_ANGLES.map((petalAngle) => (
              <ellipse key={petalAngle} cy={-2.5} rx={1.7} ry={2.7} fill={petal} stroke="#B45309" strokeWidth={0.25} transform={`rotate(${petalAngle})`} />
            ))}
            <circle r={1.5} fill="#92400E" />
          </g>
        );
      })}
    </g>
  );
}

// ── Diya Glow ──

const DIYA_COUNT = 8;

/** Eight little clay lamps around a warm glow, each flame flickering on its own beat. */
export function DiyaGlow({ uid }: FrameProps) {
  return (
    <g>
      <defs>
        <radialGradient id={`${uid}-diya`} cx="50%" cy="50%" r="50%">
          <stop offset="78%" stopColor="#FDBA74" stopOpacity="0" />
          <stop offset="90%" stopColor="#FB923C" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={CENTER} cy={CENTER} r={50} fill={`url(#${uid}-diya)`} className="af-pulse" style={timing(3)} />
      <circle cx={CENTER} cy={CENTER} r={43.4} fill="none" stroke="#F59E0B" strokeWidth={1.2} />
      {spread(DIYA_COUNT).map((angle, index) => {
        const [x, y] = polar(angle, 44.6);
        return (
          <g key={angle} transform={`translate(${x} ${y}) rotate(${angle})`}>
            <path d="M-3.6 0.2 Q0 5 3.6 0.2 Z" fill="#B45309" stroke="#78350F" strokeWidth={0.4} />
            <g className="af-flicker" style={timing(1.1 + (index % 3) * 0.25, index * 0.17)}>
              <path d="M0 -8 C3 -4.6 2.4 -1.4 0 -0.4 C-2.4 -1.4 -3 -4.6 0 -8 Z" fill="#FB923C" />
              <path d="M0 -5.2 C1.4 -3.4 1.2 -1.6 0 -0.9 C-1.2 -1.6 -1.4 -3.4 0 -5.2 Z" fill="#FEF08A" />
            </g>
          </g>
        );
      })}
    </g>
  );
}

// ── Rangoli Mandala ──

const RANGOLI_COLORS = ["#EC4899", "#F59E0B", "#14B8A6", "#8B5CF6"];
const RANGOLI_PETALS = 16;

/** A flat floor-pattern ring: diamonds turning one way, dots the other, in the colours of coloured powder. */
export function RangoliMandala(_props: FrameProps) {
  const angles = spread(RANGOLI_PETALS);
  return (
    <g>
      <circle cx={CENTER} cy={CENTER} r={48.4} fill="none" stroke="#FDE68A" strokeWidth={0.9} strokeDasharray="1.2 2.4" strokeLinecap="round" />
      <g className="af-spin" style={timing(46)}>
        {angles.map((angle, index) => {
          const [x, y] = polar(angle, 45);
          return <path key={angle} d="M0 -4.4 L2.2 0 L0 4.4 L-2.2 0 Z" fill={RANGOLI_COLORS[index % RANGOLI_COLORS.length]} stroke="#FFFBEB" strokeWidth={0.4} transform={`translate(${x} ${y}) rotate(${angle})`} />;
        })}
      </g>
      <g className="af-spin-rev" style={timing(30)}>
        {angles.map((angle, index) => {
          const [x, y] = polar(angle + 360 / RANGOLI_PETALS / 2, 41.8);
          return <circle key={angle} cx={x} cy={y} r={1.25} fill={RANGOLI_COLORS[(index + 2) % RANGOLI_COLORS.length]} />;
        })}
      </g>
    </g>
  );
}

// ── Peacock Plume ──

const PLUME_ANGLES = [-72, -52, -32, -12, 12, 32, 52, 72];

/** A fan of peacock feathers above the avatar, each with its blue-and-gold eye, rocking gently. */
export function PeacockPlume({ uid }: FrameProps) {
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-feather`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#065F46" />
          <stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>
      </defs>
      <circle cx={CENTER} cy={CENTER} r={43.6} fill="none" stroke="#0D9488" strokeWidth={1.6} />
      {PLUME_ANGLES.map((angle, index) => {
        const [x, y] = polar(angle, 39);
        return (
          <g key={angle} transform={`translate(${x} ${y}) rotate(${angle})`}>
            <g className="af-sway-base" style={timing(3.6 + (index % 3) * 0.5, index * 0.3)}>
              <path d="M0 0 C-5.4 -7 -5.6 -17 0 -25 C5.6 -17 5.4 -7 0 0 Z" fill={`url(#${uid}-feather)`} stroke="#064E3B" strokeWidth={0.35} />
              <path d="M0 0 L0 -21" stroke="#FDE68A" strokeWidth={0.45} />
              <circle cy={-18.4} r={4} fill="#F59E0B" />
              <circle cy={-18.4} r={2.8} fill="#1D4ED8" />
              <circle cy={-18.4} r={1.5} fill="#10B981" />
              <circle cy={-18.4} r={0.7} fill="#0F172A" />
            </g>
          </g>
        );
      })}
    </g>
  );
}

// ── Cricket Seam ──

/** A red leather ball's seam: two rows of white stitches round a red band, turning as if in flight. */
export function CricketSeam(_props: FrameProps) {
  return (
    <g>
      <g className="af-spin" style={timing(15)}>
        <circle cx={CENTER} cy={CENTER} r={44.6} fill="none" stroke="#B91C1C" strokeWidth={7.6} />
        <circle cx={CENTER} cy={CENTER} r={41.1} fill="none" stroke="#7F1D1D" strokeWidth={1} />
        <circle cx={CENTER} cy={CENTER} r={48.1} fill="none" stroke="#7F1D1D" strokeWidth={0.8} />
        <circle cx={CENTER} cy={CENTER} r={43.1} fill="none" stroke="#FEF2F2" strokeWidth={1.1} strokeDasharray="1.3 3" strokeLinecap="round" />
        <circle cx={CENTER} cy={CENTER} r={46.1} fill="none" stroke="#FEF2F2" strokeWidth={1.1} strokeDasharray="1.3 3" strokeDashoffset={1.5} strokeLinecap="round" />
      </g>
      <path d="M22 22 A40 40 0 0 1 50 10.5" fill="none" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={2.2} strokeLinecap="round" />
    </g>
  );
}
