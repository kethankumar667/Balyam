import { Hc3DImpactSparksCanvas } from "../../Hc3DImpactSparksCanvas";

export function Doordarshan3DFour({
  batter,
  message,
}: {
  batter: string;
  message?: string;
}) {
  return (
    <div className="relative flex flex-col items-center justify-center text-center select-none">
      <Hc3DImpactSparksCanvas skin="doordarshan" mode="sparks" intensity={1} />

      <div
        className="font-black tracking-tight leading-none uppercase font-mono"
        style={{
          fontSize: "clamp(68px, 20vw, 160px)",
          color: "#FEF08A",
          textShadow: "4px 4px 0 #D97706, 8px 8px 0 #78350F, 12px 12px 0 #000000",
        }}
      >
        चौका! (FOUR!)
      </div>

      <div className="mt-3 inline-flex items-center gap-3 border-2 border-[#FEF08A] bg-[#0A0705]/95 px-6 py-2.5 shadow-2xl">
        <span className="text-sm sm:text-base font-black text-[#FEF08A] uppercase tracking-wider font-mono">
          {batter}
        </span>
        <span className="text-amber-400">•</span>
        <span className="text-xs sm:text-sm font-bold text-amber-200">
          {message ?? "खूबसूरत चौका सीमा रेखा की ओर!"}
        </span>
      </div>
    </div>
  );
}
