import { useEffect, useState } from "react";

const DOTS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

export function Dice({
  value,
  rolling,
  highlight,
}: {
  value: number | null;
  rolling: boolean;
  highlight: boolean;
}) {
  // display = 0 means "no current roll" (blank face)
  const [display, setDisplay] = useState<number>(value ?? 0);

  useEffect(() => {
    if (rolling) {
      const id = setInterval(() => {
        setDisplay(1 + Math.floor(Math.random() * 6));
      }, 80);
      return () => clearInterval(id);
    }
    setDisplay(value ?? 0);
  }, [rolling, value]);

  const blank = display === 0;

  return (
    <div
      className={`relative h-16 w-16 rounded-2xl border-2 ${
        highlight ? "border-amber-300 ring-2 ring-amber-300/60" : "border-slate-300"
      } ${rolling ? "dice-physics-roll" : ""} ${blank ? "bg-slate-200" : "bg-white"}`}
      style={{
        transition: "transform 0.3s, box-shadow 0.3s",
        background: blank
          ? "linear-gradient(145deg, #e2e8f0 0%, #cbd5e1 100%)"
          : "linear-gradient(145deg, #ffffff 0%, #f1f5f9 62%, #cbd5e1 100%)",
        boxShadow: highlight
          ? "0 0 28px rgba(251,191,36,0.55), inset -7px -8px 0 rgba(15,23,42,0.14), inset 5px 5px 0 rgba(255,255,255,0.8)"
          : "0 10px 18px rgba(0,0,0,0.38), inset -7px -8px 0 rgba(15,23,42,0.14), inset 5px 5px 0 rgba(255,255,255,0.8)",
      }}
    >
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
                    className="h-2.5 w-2.5 rounded-full bg-slate-950"
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
