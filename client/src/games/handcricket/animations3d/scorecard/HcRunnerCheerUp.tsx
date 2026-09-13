import { useEffect, useState } from "react";
import type { HcSkin } from "../../hc-skin";
import { HapticsManager } from "../../../../services/HapticsManager";

export function HcRunnerCheerUp({
  skin = "broadcast",
  runnerName = "Champion",
  onComplete,
}: {
  skin?: HcSkin;
  runnerName?: string;
  onComplete?: () => void;
}) {
  const [visible, setVisible] = useState(true);

  // Auto-dismiss after 6 seconds
  useEffect(() => {
    const tDismiss = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 6000);

    // Gentle encouraging haptic pulse
    HapticsManager.trigger("subtle");
    const t2 = setTimeout(() => HapticsManager.trigger("subtle"), 1000);

    return () => {
      clearTimeout(tDismiss);
      clearTimeout(t2);
    };
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div
      onClick={() => {
        setVisible(false);
        onComplete?.();
      }}
      className="pointer-events-auto fixed inset-0 z-[70] flex flex-col items-center justify-center p-4 cursor-pointer select-none bg-black/40 backdrop-blur-sm transition-opacity duration-700"
      style={{ opacity: visible ? 1 : 0 }}
      title="Tap anywhere to dismiss"
    >
      {/* Warm Uplifting Golden Radiance Glow */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 mx-auto animate-pulse pointer-events-none"
        style={{
          background:
            skin === "cricbuzz"
              ? "radial-gradient(circle at center, rgba(0, 179, 138, 0.25) 0%, rgba(0,0,0,0) 65%)"
              : skin === "doordarshan"
              ? "radial-gradient(circle at center, rgba(245, 158, 11, 0.25) 0%, rgba(0,0,0,0) 65%)"
              : skin === "nostalgia"
              ? "radial-gradient(circle at center, rgba(59, 130, 246, 0.2) 0%, rgba(0,0,0,0) 65%)"
              : "radial-gradient(circle at center, rgba(234, 179, 8, 0.25) 0%, rgba(0,0,0,0) 65%)",
        }}
      />

      {/* Cheer-Up Card */}
      <div
        className={`relative max-w-md w-full rounded-2xl p-6 sm:p-8 text-center shadow-2xl border transition-transform duration-500 scale-100 ${
          skin === "cricbuzz"
            ? "bg-[#0E1815]/95 border-[#00B38A]/50 text-white"
            : skin === "doordarshan"
            ? "bg-[#1E150D]/95 border-[#F59E0B]/60 text-[#FEF3C7]"
            : skin === "nostalgia"
            ? "bg-[#FFFDF7]/98 border-[#3B82F6]/60 text-[#1E293B] shadow-blue-500/10"
            : "bg-stone-900/95 border-amber-500/50 text-white shadow-amber-500/10"
        }`}
      >
        {/* Animated Clapping / Salute Icon */}
        <div className="mx-auto mb-4 flex items-center justify-center gap-3 text-4xl sm:text-5xl">
          <span className="animate-bounce" style={{ animationDuration: "1s" }}>
            👏
          </span>
          <span className="animate-pulse" style={{ animationDuration: "1.2s" }}>
            🏏
          </span>
          <span className="animate-bounce" style={{ animationDuration: "1s", animationDelay: "200ms" }}>
            💪
          </span>
        </div>

        {/* Theme-Specific Cheer Headline */}
        <div
          className="text-2xl sm:text-3xl font-black uppercase tracking-tight mb-2"
          style={{
            background:
              skin === "cricbuzz"
                ? "linear-gradient(180deg, #A7F3D0 0%, #34D399 50%, #059669 100%)"
                : skin === "doordarshan"
                ? "linear-gradient(180deg, #FEF08A 0%, #F59E0B 50%, #D97706 100%)"
                : skin === "nostalgia"
                ? "linear-gradient(180deg, #60A5FA 0%, #2563EB 55%, #1D4ED8 100%)"
                : "linear-gradient(180deg, #FEF08A 0%, #EAB308 50%, #CA8A04 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {skin === "doordarshan"
            ? "शानदार खेल!"
            : skin === "nostalgia"
            ? "GREAT GAME, BUDDY!"
            : skin === "cricbuzz"
            ? "VALIANT EFFORT!"
            : "WELL PLAYED, WARRIOR!"}
        </div>

        {/* Motivational cheer message */}
        <p className="text-sm sm:text-base font-bold opacity-95 leading-relaxed mb-4">
          {skin === "nostalgia"
            ? `Tough luck ${runnerName}! You fought hard till the end. Every legend has off days — challenge them to a rematch right now! 🤝`
            : skin === "doordarshan"
            ? `${runnerName}, हार में भी हौसला है! अगली बार जीत आपकी ही होगी। दोबारा मुकाबला कीजिए!`
            : skin === "cricbuzz"
            ? `Incredible rivalry from ${runnerName}! 100% fighting spirit displayed on the pitch. Take the learnings and bounce back in the rematch!`
            : `Tough fight, ${runnerName}! Every true champion faces setbacks — that's how comebacks are written. Hit rematch and take the crown!`}
        </p>

        {/* Fighting Spirit Metric Badge */}
        <div
          className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-wider ${
            skin === "cricbuzz"
              ? "bg-[#00B38A]/20 text-[#34D399] border border-[#00B38A]/40"
              : skin === "doordarshan"
              ? "bg-[#F59E0B]/20 text-[#FDE047] border border-[#F59E0B]/40"
              : skin === "nostalgia"
              ? "bg-blue-100 text-blue-700 border border-blue-300"
              : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
          }`}
        >
          <span>⭐</span>
          <span>FIGHTING SPIRIT: 100%</span>
          <span>🔥</span>
        </div>

        <div className="mt-5 text-[11px] font-semibold opacity-60 uppercase tracking-widest">
          Tap anywhere to continue to scorecard
        </div>
      </div>
    </div>
  );
}
