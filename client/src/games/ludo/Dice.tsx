import { useEffect, useRef, useState, type CSSProperties } from "react";

const DOTS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

/**
 * Single source of truth for the throw's wall-clock length. useLudoBoard's
 * `rolling` window (the optimistic-click timer AND the server-roundtrip
 * timer) must match this exactly, or the CSS tumble below gets its class
 * yanked mid-animation and snaps instead of settling.
 */
export const DICE_ROLL_MS = 640;

export function Dice({
  value,
  rolling,
  highlight,
  wooden = false,
  size = "4rem",
  onClick,
}: {
  value: number | null;
  rolling: boolean;
  highlight: boolean;
  wooden?: boolean;
  /** CSS size (both axes) - defaults to the original fixed 64px tray size. */
  size?: string;
  /** When set, the dice itself is the roll control - tap/click/Enter/Space fires it. Omitted -> non-interactive (e.g. opponents' view, SnL's separate button flow). */
  onClick?: () => void;
}) {
  // display = 0 means "no current roll" (blank face)
  const [display, setDisplay] = useState<number>(value ?? 0);
  const [throwId, setThrowId] = useState(0);
  const tumble = useRef({ rx: 380, ry: 340, rz: 6, arc: -12 });

  useEffect(() => {
    if (!rolling) {
      setDisplay(value ?? 0);
      return;
    }
    // A real throw never tumbles the same way twice - fresh axis spin, wobble,
    // and arc height per roll so consecutive throws feel like separate events
    // rather than the same canned animation replaying.
    tumble.current = {
      rx: 320 + Math.random() * 160,
      ry: 280 + Math.random() * 180,
      rz: (Math.random() - 0.5) * 26,
      arc: -8 - Math.random() * 12,
    };
    setThrowId((id) => id + 1);
    // Decelerating flicker: fast cycling at first, slowing as the die "loses
    // energy" and settles - mirrors how a thrown die actually comes to rest
    // instead of flickering at one flat rate until it's abruptly cut off.
    const delays = [0, 55, 65, 80, 100, 125, 160, 210, 270];
    const timers = delays.map((d) =>
      setTimeout(() => setDisplay(1 + Math.floor(Math.random() * 6)), d),
    );
    return () => timers.forEach(clearTimeout);
  }, [rolling, value]);

  const blank = display === 0;
  const t = tumble.current;

  return (
    <div
      key={throwId}
      className={`relative z-0 rounded-2xl border-2 ${
        highlight ? "border-amber-300" : "border-slate-300"
      } ${rolling ? "dice-physics-roll" : ""} ${blank ? "bg-slate-200" : "bg-white"} ${
        onClick ? "cursor-pointer active:scale-95" : ""
      }`}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? "Roll dice" : undefined}
      title={onClick ? "Tap to roll" : undefined}
      style={
        {
          width: size,
          height: size,
          transition: "transform 0.3s, box-shadow 0.3s",
          background: wooden
            ? "linear-gradient(145deg, #C8915B 0%, #8B5A2B 62%, #5C3A1E 100%)"
            : blank
            ? "linear-gradient(145deg, #e2e8f0 0%, #cbd5e1 100%)"
            : "linear-gradient(145deg, #ffffff 0%, #f1f5f9 62%, #cbd5e1 100%)",
          boxShadow: highlight
            ? "0 0 28px rgba(251,191,36,0.55), inset -7px -8px 0 rgba(15,23,42,0.14), inset 5px 5px 0 rgba(255,255,255,0.8)"
            : "0 10px 18px rgba(0,0,0,0.38), inset -7px -8px 0 rgba(15,23,42,0.14), inset 5px 5px 0 rgba(255,255,255,0.8)",
          "--dice-rx": `${t.rx}deg`,
          "--dice-ry": `${t.ry}deg`,
          "--dice-rz": `${t.rz}deg`,
          "--dice-arc": `${t.arc}px`,
        } as CSSProperties
      }
    >
      {highlight && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-2 z-[-1] rounded-3xl bg-amber-400/70 blur-md animate-pulse"
        />
      )}
      {blank ? (
        <div className="absolute inset-0 flex items-center justify-center text-3xl text-slate-400 font-bold">
          —
        </div>
      ) : (
        <div className="absolute inset-1 grid grid-cols-3 grid-rows-3 gap-0.5 p-1">
          {Array.from({ length: 9 }).map((_, i) => {
            const r = Math.floor(i / 3);
            const c = i % 3;
            const dot = DOTS[display]?.some(([dr, dc]) => dr === r && dc === c);
            return (
              <div key={i} className="flex items-center justify-center">
                {dot && (
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${wooden ? "bg-[#FFF3DC]" : "bg-slate-950"}`}
                    style={{ boxShadow: "inset 0 1px 1px rgba(255,255,255,0.5), 0 1px 1px rgba(0,0,0,0.35)" }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
