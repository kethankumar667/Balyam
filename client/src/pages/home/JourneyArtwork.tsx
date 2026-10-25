import { Crown, Orbit, Users } from "lucide-react";

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

export function PackCollectible({ index }: { index: number }) {
  return <span aria-hidden="true" className="relative flex h-[66px] w-full items-center justify-center overflow-hidden rounded-xl border border-journey-gold/35 bg-[radial-gradient(ellipse_at_bottom,rgb(var(--journey-gold)/0.15),transparent_85%)] text-journey-gold">
    {index === 0 ? <><span className="absolute h-11 w-11 rounded-full border-[3px] border-journey-gold shadow-[0_0_15px_rgb(var(--journey-gold)/0.25)]" /><Orbit size={22} strokeWidth={1.3} /></>
      : index === 1 ? <span className="flex h-12 w-10 flex-col items-center justify-center rounded-b-2xl border border-journey-gold bg-journey-gold/10"><Crown size={22} /><Users size={13} /></span>
        : <span className="flex h-11 w-14 -rotate-6 items-center justify-center rounded border-[4px] border-[#ab8552] bg-[#29413a] font-script text-lg text-[#e1eadd]">a b c</span>}
  </span>;
}
