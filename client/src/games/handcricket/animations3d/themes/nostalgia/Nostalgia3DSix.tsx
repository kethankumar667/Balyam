import { Hc3DImpactSparksCanvas } from "../../Hc3DImpactSparksCanvas";

export function Nostalgia3DSix({
  batter,
  message,
}: {
  batter: string;
  message?: string;
}) {
  return (
    <div className="relative flex flex-col items-center justify-center text-center select-none font-mono">
      <div className="text-4xl mb-2 animate-bounce">🚀💥</div>

      <Hc3DImpactSparksCanvas skin="nostalgia" mode="sparks" intensity={1.5} />

      <div
        className="font-black tracking-tight leading-none uppercase"
        style={{
          fontSize: "clamp(76px, 22vw, 180px)",
          color: "#EA580C",
          textShadow: "4px 4px 0 #FED7AA, 8px 8px 0 #9A3412",
          transform: "rotate(-2deg)",
        }}
      >
        SIX! 💥
      </div>

      <div className="mt-3 inline-flex items-center gap-3 border-2 border-orange-500 bg-[#FFFDF5] px-6 py-2.5 shadow-xl rounded-md">
        <span className="text-sm sm:text-base font-black text-orange-900 uppercase tracking-wider">
          {batter}
        </span>
        <span className="text-orange-400">•</span>
        <span className="text-xs sm:text-sm font-bold text-orange-700">
          {message ?? "Ball shot right through the classroom window!"}
        </span>
      </div>
    </div>
  );
}
