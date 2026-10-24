import { useId, type ReactNode } from "react";

interface SafetyEmblemProps {
  children: ReactNode;
}

export default function SafetyEmblem({ children }: SafetyEmblemProps) {
  const id = useId().replace(/:/g, "");
  return (
    <div aria-hidden="true" className="safety-emblem relative mx-auto h-[112px] w-40">
      <svg viewBox="0 0 160 112" fill="none" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id={`${id}-shield`} x1="55" y1="15" x2="110" y2="95" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--safety-shield-hi)" />
            <stop offset="1" stopColor="var(--safety-shield-lo)" />
          </linearGradient>
        </defs>
        <circle cx="80" cy="54" r="45" stroke="var(--safety-orbit)" />
        <circle cx="80" cy="54" r="52" stroke="var(--safety-orbit)" strokeDasharray="2 7" />
        <path d="M5 69h20l10-10h10m70 0h10l10-10h20M22 29h14l10 10m68 39 12 12h20" stroke="var(--safety-orbit)" />
        <g fill="var(--safety-accent)">
          <circle cx="5" cy="69" r="2.5" /><circle cx="155" cy="49" r="2.5" /><circle cx="146" cy="90" r="2.5" />
        </g>
        <path d="M80 12c-11 8-23 11-33 12v29c0 22 13 37 33 47 20-10 33-25 33-47V24c-10-1-22-4-33-12Z"
          fill={`url(#${id}-shield)`} stroke="var(--safety-shield-edge)" strokeWidth="1.5" />
        <path d="M80 21c-9 6-17 9-25 10v22c0 17 9 29 25 38 16-9 25-21 25-38V31c-8-1-16-4-25-10Z"
          stroke="var(--safety-shield-edge)" strokeOpacity=".4" />
      </svg>
      <div className="safety-emblem-symbol absolute left-1/2 top-[33px] grid h-10 w-10 -translate-x-1/2 place-items-center">
        {children}
      </div>
    </div>
  );
}
