import { useEffect, useRef, useState, type CSSProperties } from "react";

// Pacing lives in shared/ludo-pacing.ts so the whole feel budget is tunable
// in one place; re-exported here because callers already import it from Dice.
export { DICE_ROLL_MS } from "@shared/ludo-pacing";

/** Grid position map for standard dice pip patterns (3x3 grid) */
const FACE_DOTS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 2], [2, 0]],
  3: [[0, 2], [1, 1], [2, 0]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

/**
 * Standard Euler rotations (in degrees) to bring each face (1-6) to the front view.
 * Face 1: Front (0, 0)
 * Face 2: Right (0, -90)
 * Face 3: Top (-90, 0)
 * Face 4: Bottom (90, 0)
 * Face 5: Left (0, 90)
 * Face 6: Back (0, 180)
 */
const FACE_ROTATIONS: Record<number, { rx: number; ry: number }> = {
  1: { rx: 0, ry: 0 },
  2: { rx: 0, ry: -90 },
  3: { rx: -90, ry: 0 },
  4: { rx: 90, ry: 0 },
  5: { rx: 0, ry: 90 },
  6: { rx: 0, ry: 180 },
};

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
  /** CSS size (both axes) - defaults to 4rem (64px). */
  size?: string;
  /** When set, the dice itself is the roll control. */
  onClick?: () => void;
}) {
  const [throwId, setThrowId] = useState(0);
  const [currentVal, setCurrentVal] = useState<number>(value && value >= 1 && value <= 6 ? value : 1);
  const prevRolling = useRef(rolling);

  // Extra multi-revolution spin added during throw for physics variety
  const spinExtra = useRef({
    extraX: 720,
    extraY: 1080,
    extraZ: 360,
    arcY: -22,
  });

  useEffect(() => {
    if (rolling && !prevRolling.current) {
      // New throw started — seed randomized multi-revolution 3D trajectory
      const multiX = (2 + Math.floor(Math.random() * 2)) * 360;
      const multiY = (3 + Math.floor(Math.random() * 2)) * 360;
      const multiZ = (Math.random() > 0.5 ? 1 : -1) * (180 + Math.floor(Math.random() * 180));
      spinExtra.current = {
        extraX: multiX,
        extraY: multiY,
        extraZ: multiZ,
        arcY: -18 - Math.random() * 10,
      };
      setThrowId((id) => id + 1);
    }
    prevRolling.current = rolling;
  }, [rolling]);

  useEffect(() => {
    if (value && value >= 1 && value <= 6) {
      setCurrentVal(value);
    }
  }, [value]);

  const targetFace = currentVal in FACE_ROTATIONS ? currentVal : 1;
  const baseRot = FACE_ROTATIONS[targetFace];
  const blank = value == null || value === 0;

  // Resting 3D isometric angle so cube depth/faces are visible
  const idleIsoTilt = blank
    ? { rx: -16, ry: 24, rz: 0 }
    : { rx: baseRot.rx - 10, ry: baseRot.ry + 14, rz: 0 };

  const finalRotX = rolling ? baseRot.rx + spinExtra.current.extraX : idleIsoTilt.rx;
  const finalRotY = rolling ? baseRot.ry + spinExtra.current.extraY : idleIsoTilt.ry;
  const finalRotZ = rolling ? spinExtra.current.extraZ : idleIsoTilt.rz;

  return (
    <div
      className={`dice-3d-scene relative select-none flex items-center justify-center ${
        onClick ? "cursor-pointer active:scale-95 transition-transform" : ""
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
      style={{
        width: size,
        height: size,
        perspective: "520px",
      }}
    >
      {/* Turn glow halo */}
      {highlight && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-2.5 z-0 rounded-full bg-amber-400/50 blur-lg animate-pulse"
        />
      )}

      {/* Dynamic ground contact shadow underneath 3D cube */}
      <div
        className={`pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full bg-black/40 blur-[5px] transition-all duration-300 ${
          rolling ? "scale-75 opacity-20 translate-y-3" : "scale-100 opacity-60 translate-y-1.5"
        }`}
        style={{
          width: "72%",
          height: "22%",
        }}
      />

      {/* The 3D Cube Object */}
      <div
        key={throwId}
        className={`dice-3d-cube relative w-full h-full ${
          rolling ? "dice-3d-rolling" : "dice-3d-idle"
        }`}
        style={
          {
            transformStyle: "preserve-3d",
            willChange: "transform",
            "--dice-rx": `${finalRotX}deg`,
            "--dice-ry": `${finalRotY}deg`,
            "--dice-rz": `${finalRotZ}deg`,
            "--dice-arc": `${spinExtra.current.arcY}px`,
            transform: rolling
              ? undefined
              : `rotateX(${idleIsoTilt.rx}deg) rotateY(${idleIsoTilt.ry}deg) rotateZ(${idleIsoTilt.rz}deg)`,
            transition: rolling ? undefined : "transform 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.15)",
          } as CSSProperties
        }
      >
        {/* Six faces of the cube */}
        <DiceFace faceNum={1} wooden={wooden} transform="rotateY(0deg) translateZ(calc(var(--face-depth, 28px)))" />
        <DiceFace faceNum={6} wooden={wooden} transform="rotateY(180deg) translateZ(calc(var(--face-depth, 28px)))" />
        <DiceFace faceNum={2} wooden={wooden} transform="rotateY(90deg) translateZ(calc(var(--face-depth, 28px)))" />
        <DiceFace faceNum={5} wooden={wooden} transform="rotateY(-90deg) translateZ(calc(var(--face-depth, 28px)))" />
        <DiceFace faceNum={3} wooden={wooden} transform="rotateX(90deg) translateZ(calc(var(--face-depth, 28px)))" />
        <DiceFace faceNum={4} wooden={wooden} transform="rotateX(-90deg) translateZ(calc(var(--face-depth, 28px)))" />
      </div>
    </div>
  );
}

/** Individual 3D face of the dice */
function DiceFace({
  faceNum,
  wooden,
  transform,
}: {
  faceNum: number;
  wooden: boolean;
  transform: string;
}) {
  const isOne = faceNum === 1;

  return (
    <div
      className="dice-face absolute inset-0 rounded-[22%] flex items-center justify-center overflow-hidden border"
      style={{
        transform,
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        background: wooden
          ? "linear-gradient(135deg, #D49862 0%, #A46934 60%, #6E411B 100%)"
          : "linear-gradient(135deg, #FFFFFF 0%, #FAF5EE 55%, #EBE1D0 100%)",
        borderColor: wooden ? "#502F13" : "#DCD0BD",
        boxShadow: wooden
          ? "inset 2px 2px 3px rgba(255,225,185,0.45), inset -2px -2px 3px rgba(0,0,0,0.5), 0 0 2px rgba(0,0,0,0.3)"
          : "inset 2px 2px 3px rgba(255,255,255,0.95), inset -2px -2px 3px rgba(100,75,50,0.22), 0 0 2px rgba(0,0,0,0.15)",
      }}
    >
      {/* 3x3 Grid for pips */}
      <div className="grid grid-cols-3 grid-rows-3 w-full h-full p-[14%] gap-[6%]">
        {Array.from({ length: 9 }).map((_, i) => {
          const r = Math.floor(i / 3);
          const c = i % 3;
          const hasDot = FACE_DOTS[faceNum]?.some(([dr, dc]) => dr === r && dc === c);

          return (
            <div key={i} className="flex items-center justify-center">
              {hasDot && (
                <div
                  className={`rounded-full ${
                    isOne && !wooden
                      ? "w-[88%] h-[88%] bg-gradient-to-br from-[#EF4444] to-[#B91C1C]"
                      : wooden
                      ? "w-[75%] h-[75%] bg-gradient-to-br from-[#FFF5DE] to-[#DEC698]"
                      : "w-[75%] h-[75%] bg-gradient-to-br from-[#334155] to-[#0F172A]"
                  }`}
                  style={{
                    boxShadow: isOne && !wooden
                      ? "inset 0 1.5px 2px rgba(255,255,255,0.6), inset 0 -1.5px 2px rgba(120,0,0,0.7), 0 1px 1px rgba(0,0,0,0.3)"
                      : wooden
                      ? "inset 0 1px 2px rgba(0,0,0,0.4), 0 1px 1px rgba(255,255,255,0.4)"
                      : "inset 0 1.5px 2px rgba(0,0,0,0.9), inset 0 -1px 1px rgba(255,255,255,0.25), 0 1px 1px rgba(255,255,255,0.75)",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
