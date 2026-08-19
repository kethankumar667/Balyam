export const MOTION_TOKENS = {
  // Transitions
  springBouncy: "transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
  springGentle: "transition-all duration-200 ease-out",
  cardHover: "hover:-translate-y-1 hover:shadow-xl transition-all duration-250 ease-out",
  buttonPress: "active:scale-95 transition-transform duration-100",
  interactiveGlow: "hover:border-amber-500/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] transition-all duration-200",

  // Keyframe CSS classes
  pulseAura: "animate-[pulse_3s_cubic-bezier(0.4,0,0.6,1)_infinite]",
  shimmer: "animate-[shimmer_2s_infinite]",
  spinSlow: "animate-[spin_12s_linear_infinite]",
} as const;
