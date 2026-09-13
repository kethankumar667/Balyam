import { Hc3DImpactSparksCanvas } from "../../Hc3DImpactSparksCanvas";

export function Doordarshan3DBowled({
  batter,
  bowler,
  isYorker,
  message,
}: {
  batter: string;
  bowler: string;
  isYorker?: boolean;
  message?: string;
}) {
  const headline = isYorker ? "मिस्त्री यॉर्कर! (BOWLED)" : "क्लीन बोल्ड! (OUT)";

  return (
    <div className="relative flex flex-col items-center justify-center text-center select-none">
      <div className="text-5xl mb-2 animate-bounce">🎯</div>

      <Hc3DImpactSparksCanvas skin="doordarshan" mode="splinters" intensity={1.5} />

      <div
        className="font-black tracking-tight leading-none uppercase font-mono"
        style={{
          fontSize: "clamp(48px, 14vw, 110px)",
          color: "#FCA5A5",
          textShadow: "4px 4px 0 #DC2626, 8px 8px 0 #7F1D1D, 12px 12px 0 #000000",
        }}
      >
        {headline}
      </div>

      <div className="mt-3 inline-flex items-center gap-3 border-2 border-rose-400 bg-[#0A0705]/95 px-6 py-2.5 shadow-2xl">
        <span className="text-sm sm:text-base font-black text-rose-300 uppercase tracking-wider font-mono">
          {batter} बोल्ड {bowler}
        </span>
        <span className="text-white/40">•</span>
        <span className="text-xs sm:text-sm font-bold text-white/90">
          {message ?? "गिल्लियां उड़ गईं!"}
        </span>
      </div>
    </div>
  );
}
