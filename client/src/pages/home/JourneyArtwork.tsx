import { Crown, Orbit } from "lucide-react";

export function JourneyLandscape() {
  return <svg viewBox="0 0 1100 640" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-60" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id="journey-sunset" className="text-journey-gold"><stop stopColor="currentColor" stopOpacity=".15" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></radialGradient>
      <radialGradient id="journey-evening" className="text-journey-violet"><stop stopColor="currentColor" stopOpacity=".15" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></radialGradient>
    </defs>
    <ellipse cx="125" cy="280" rx="370" ry="400" fill="url(#journey-sunset)" />
    <ellipse cx="980" cy="320" rx="460" ry="430" fill="url(#journey-evening)" />
    <g stroke="currentColor" className="text-journey-soft" strokeWidth="1" fill="none" opacity=".16">
      <path d="M-40 580 Q170 430 350 580 T720 540 T1160 440" strokeDasharray="5 10" />
      <path d="M15 550V410M25 550V410M35 550V410M10 408H40M70 550L95 465L116 467L88 552Z" />
      <path d="M510 545l45-85 45 85h-90Zm-14 24h118m-88-52h58m-44-28h29" />
      <path d="M895 533V420H1060V533M910 533V437H1045V533M877 533H1080" />
      <circle cx="415" cy="180" r="3" /><circle cx="705" cy="120" r="3" /><circle cx="990" cy="180" r="3" />
      <path d="M415 180L705 120L990 180" strokeDasharray="2 9" />
    </g>
  </svg>;
}

/** One Nostalgia Pack reward as a small icon: aura, podium title, table theme. Dim until the pack is unlocked. */
export function PackIcon({ index, unlocked }: { index: number; unlocked: boolean }) {
  return <span aria-hidden="true" className={`relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-journey-panel/70 ${unlocked ? "border-journey-gold/60 text-journey-gold" : "border-journey-edge/40 text-journey-soft opacity-70"}`}>
    {index === 0 ? <><span className="absolute h-8 w-8 rounded-full border-2 border-current opacity-80" /><Orbit size={16} strokeWidth={1.4} /></>
      : index === 1 ? <Crown size={20} strokeWidth={1.5} />
        : <span className="flex h-6 w-8 -rotate-6 items-center justify-center rounded-sm border-2 border-[#ab8552] bg-[#29413a] font-script text-[11px] text-[#e1eadd]">abc</span>}
  </span>;
}
