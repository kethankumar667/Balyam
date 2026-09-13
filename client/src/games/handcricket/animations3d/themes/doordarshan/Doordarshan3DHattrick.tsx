import { Hc3DImpactSparksCanvas } from "../../Hc3DImpactSparksCanvas";

export function Doordarshan3DHattrick({
  bowler,
  message,
}: {
  bowler: string;
  message?: string;
}) {
  return (
    <div className="relative flex flex-col items-center justify-center text-center select-none">
      <div className="text-4xl mb-2 flex items-center gap-3">
        <span>🎯</span>
        <span>🎯</span>
        <span>🎯</span>
      </div>

      <Hc3DImpactSparksCanvas skin="doordarshan" mode="sparks" intensity={1.8} />

      <div
        className="font-black tracking-tight leading-none uppercase font-mono"
        style={{
          fontSize: "clamp(52px, 16vw, 130px)",
          color: "#FEF08A",
          textShadow: "4px 4px 0 #EA580C, 8px 8px 0 #991B1B, 12px 12px 0 #000000",
        }}
      >
        हैट्रिक! (HAT-TRICK!)
      </div>

      <div className="mt-4 inline-flex items-center gap-3 border-2 border-[#FEF08A] bg-[#0A0705]/95 px-6 py-3 shadow-2xl">
        <div className="text-left font-mono">
          <div className="text-base sm:text-lg font-black text-[#FEF08A] uppercase tracking-wider">
            {bowler} — हैट्रिक का कमाल!
          </div>
          <div className="text-xs font-bold text-amber-200">
            {message ?? "तीन गेंदों में तीन विकेट!"}
          </div>
        </div>
      </div>
    </div>
  );
}
