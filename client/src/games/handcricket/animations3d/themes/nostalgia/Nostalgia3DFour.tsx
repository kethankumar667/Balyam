import { Hc3DImpactSparksCanvas } from "../../Hc3DImpactSparksCanvas";

export function Nostalgia3DFour({
  batter,
  message,
}: {
  batter: string;
  message?: string;
}) {
  return (
    <div className="relative flex flex-col items-center justify-center text-center select-none font-mono">
      <div className="text-3xl mb-2 flex items-center gap-2">
        <span>🏏</span>
        <span>⚡</span>
        <span>🏃‍♂️</span>
      </div>

      <Hc3DImpactSparksCanvas skin="nostalgia" mode="sparks" intensity={1} />

      <div
        className="font-black tracking-tight leading-none uppercase"
        style={{
          fontSize: "clamp(72px, 20vw, 160px)",
          color: "#2563EB",
          textShadow: "4px 4px 0 #DBEAFE, 8px 8px 0 #1E40AF",
          transform: "rotate(1deg)",
        }}
      >
        FOUR! ⚡
      </div>

      <div className="mt-3 inline-flex items-center gap-3 border-2 border-blue-500 bg-[#FFFDF5] px-6 py-2.5 shadow-xl rounded-md">
        <span className="text-sm sm:text-base font-black text-blue-900 uppercase tracking-wider">
          {batter}
        </span>
        <span className="text-blue-400">•</span>
        <span className="text-xs sm:text-sm font-bold text-blue-700">
          {message ?? "Shot racing across the notebook margin!"}
        </span>
      </div>
    </div>
  );
}
