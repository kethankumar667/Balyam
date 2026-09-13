import { Hc3DImpactSparksCanvas } from "../../Hc3DImpactSparksCanvas";

export function Nostalgia3DHattrick({
  bowler,
  message,
}: {
  bowler: string;
  message?: string;
}) {
  return (
    <div className="relative flex flex-col items-center justify-center text-center select-none font-mono">
      <div className="text-4xl mb-2 flex items-center gap-3">
        <span>💀</span>
        <span>💀</span>
        <span>💀</span>
      </div>

      <Hc3DImpactSparksCanvas skin="nostalgia" mode="sparks" intensity={1.8} />

      <div
        className="font-black tracking-tight leading-none uppercase"
        style={{
          fontSize: "clamp(54px, 16vw, 130px)",
          color: "#DC2626",
          textShadow: "4px 4px 0 #FEE2E2, 8px 8px 0 #991B1B",
          transform: "rotate(-2deg)",
        }}
      >
        HAT-TRICK! 💀
      </div>

      <div className="mt-4 inline-flex items-center gap-3 border-2 border-red-500 bg-[#FFFDF5] p-4 shadow-xl rounded-md">
        <div className="text-left font-mono">
          <div className="text-base sm:text-lg font-black text-red-900 uppercase tracking-wider">
            {bowler} — CLASSROOM LEGEND!
          </div>
          <div className="text-xs font-bold text-red-700">
            {message ?? "3 wickets in a row stamped on the notebook!"}
          </div>
        </div>
      </div>
    </div>
  );
}
