import { ARM_END, ARM_START, GRID_UNITS, SPRIG_MIN_FRAME, crossOutlinePath, grooveInset } from "./brainvitaTheme";

/**
 * The holo table's board and its props: a pane of glowing glass cut in the same cross, a lattice of light
 * running through the holes, and a datapad, a few orbs and a slow HUD ring in the corners where the wood
 * table keeps its sack and notepad. Same geometry, same corners, different material.
 */

const CYAN = "#22D3EE";
const CYAN_SOFT = "#A5F3FC";
const MAGENTA = "#E879F9";

/** The centres of the holes along each row and column, so the lattice runs exactly through them. */
const ROW_SPANS = Array.from({ length: GRID_UNITS }, (_, row) => {
  const isArm = row >= ARM_START && row < ARM_END;
  return { at: row + 0.5, from: (isArm ? 0 : ARM_START) + 0.5, to: (isArm ? GRID_UNITS - 1 : ARM_END - 1) + 0.5 };
});

const SKETCH_HOLES = Array.from({ length: GRID_UNITS * GRID_UNITS }, (_, index) => ({ row: Math.floor(index / GRID_UNITS), col: index % GRID_UNITS })).filter(
  ({ row, col }) => (row >= ARM_START && row < ARM_END) || (col >= ARM_START && col < ARM_END),
);

export function HoloSurface({ frame }: { frame: number }) {
  const span = GRID_UNITS + 2 * frame;
  const outer = crossOutlinePath(frame);
  const groove = crossOutlinePath(frame, grooveInset(frame));
  const stripCentre = ARM_START - frame / 2;
  const shoulderCentre = (ARM_START - frame) / 2 + 0.05;
  const mirrorX = GRID_UNITS - shoulderCentre;
  const mirrorY = GRID_UNITS - stripCentre;
  const chevron = (cx: number, cy: number, flipY: number) => (
    <g key={`${cx}-${cy}`} transform={`translate(${cx} ${cy}) scale(1 ${flipY})`} fill="none" stroke={CYAN} strokeWidth="0.03" strokeLinecap="round" strokeLinejoin="round" opacity="0.85">
      <path d="M-0.34 0.1 L0 -0.08 L0.34 0.1" />
      <path d="M-0.24 0.2 L0 0.06 L0.24 0.2" opacity="0.55" />
    </g>
  );
  return (
    <svg
      aria-hidden
      viewBox={`${-frame} ${-frame} ${span} ${span}`}
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      style={{ filter: "drop-shadow(0 16px 22px rgba(0,0,0,0.55))" }}
    >
      <defs>
        <linearGradient id="bh-glass" x1="0.1" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="rgba(40,110,170,0.5)" />
          <stop offset="55%" stopColor="rgba(10,40,78,0.62)" />
          <stop offset="100%" stopColor="rgba(5,20,44,0.74)" />
        </linearGradient>
        <linearGradient id="bh-sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(190,245,255,0.22)" />
          <stop offset="38%" stopColor="rgba(190,245,255,0)" />
        </linearGradient>
        <filter id="bh-glow" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="0.07" />
        </filter>
      </defs>
      <path d={outer} fill="rgba(2,10,24,0.7)" transform="translate(0 0.14)" />
      <path d={outer} fill="url(#bh-glass)" />
      <path d={outer} fill="url(#bh-sheen)" />
      {ROW_SPANS.map(({ at, from, to }) => (
        <g key={at} stroke="rgba(34,211,238,0.22)" strokeWidth="0.02">
          <line x1={from} x2={to} y1={at} y2={at} />
          <line x1={at} x2={at} y1={from} y2={to} />
        </g>
      ))}
      <path d={outer} fill="none" stroke={CYAN} strokeWidth="0.09" opacity="0.55" filter="url(#bh-glow)" />
      <path d={outer} fill="none" stroke={CYAN} strokeWidth="0.035" />
      <path d={groove} fill="none" stroke="rgba(34,211,238,0.4)" strokeWidth="0.018" strokeDasharray="0.12 0.1" />
      {frame >= SPRIG_MIN_FRAME && (
        <>
          {chevron(shoulderCentre, stripCentre, 1)}
          {chevron(mirrorX, stripCentre, 1)}
          {chevron(shoulderCentre, mirrorY, -1)}
          {chevron(mirrorX, mirrorY, -1)}
        </>
      )}
    </svg>
  );
}

function DataPad({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 220 150" className={className}>
      <rect x="4" y="4" width="212" height="142" rx="12" fill="rgba(6,26,54,0.72)" stroke={CYAN} strokeWidth="1.6" />
      <rect x="4" y="4" width="212" height="142" rx="12" fill="none" stroke={CYAN} strokeWidth="6" opacity="0.18" />
      <path d="M16 22 H44 M176 22 H204 M16 130 H44 M176 130 H204" stroke={CYAN_SOFT} strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
      <g transform="translate(22 36) scale(8.2)" stroke={CYAN} fill="none">
        <path d={crossOutlinePath(0.3)} strokeWidth="0.1" />
        {SKETCH_HOLES.map(({ row, col }) => (
          <circle key={`${row}-${col}`} cx={col + 0.5} cy={row + 0.5} r="0.28" strokeWidth="0.07" opacity="0.8" />
        ))}
      </g>
      <g fontFamily="Poppins, 'Noto Sans Telugu', sans-serif" fontWeight="600" fontSize="15" letterSpacing="1.2" fill={CYAN_SOFT}>
        <text x="100" y="62">
          REMOVE ALL
        </text>
        <text x="100" y="84">
          MARBLES.
        </text>
        <text x="100" y="112" fill={MAGENTA}>
          LEAVE ONE.
        </text>
      </g>
    </svg>
  );
}

function Orb({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={`absolute rounded-full motion-safe:animate-pulse ${className}`}
      style={{ background: "radial-gradient(circle at 36% 30%, #fff 0%, #c4f8ff 14%, #22D3EE 42%, #0e7490 78%)", boxShadow: "0 0 18px rgba(34,211,238,0.8)" }}
    />
  );
}

function HudRing({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 100 100" className={`motion-safe:animate-[spin_46s_linear_infinite] ${className}`}>
      <circle cx="50" cy="50" r="44" fill="none" stroke={CYAN} strokeWidth="1" strokeDasharray="30 12" opacity="0.5" />
      <circle cx="50" cy="50" r="34" fill="none" stroke={MAGENTA} strokeWidth="1.2" strokeDasharray="6 8" opacity="0.5" />
      <circle cx="50" cy="50" r="24" fill="none" stroke={CYAN_SOFT} strokeWidth="1" strokeDasharray="44 20" opacity="0.4" />
      <circle cx="50" cy="6" r="2.4" fill={CYAN_SOFT} />
    </svg>
  );
}

/** The holo table's dressing for one board, in the same four corners as the wood table's. */
export function HoloProps() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <Orb className="-left-[8%] -top-[6%] h-[9%] w-[9%]" />
      <Orb className="left-[3%] -top-[12%] h-[6%] w-[6%]" />
      <Orb className="-left-[2%] top-[9%] h-[5%] w-[5%]" />
      <DataPad className="absolute -right-[6%] -top-[15%] w-[40%] rotate-[3deg] drop-shadow-[0_0_14px_rgba(34,211,238,0.35)]" />
      <HudRing className="absolute -bottom-[12%] -left-[12%] w-[34%]" />
      <HudRing className="absolute -bottom-[8%] -right-[10%] w-[24%] opacity-70" />
    </div>
  );
}
