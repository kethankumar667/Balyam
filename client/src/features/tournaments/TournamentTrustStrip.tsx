import React from "react";
import { ShieldCheck, Trophy, Users, Sparkles } from "lucide-react";

export const TournamentTrustStrip: React.FC = () => {
  const values = [
    {
      icon: ShieldCheck,
      iconColor: "text-emerald-500 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10 border-emerald-500/20",
      title: "Fair Play Certified",
      description: "Server-authoritative bracket execution, deterministic timers, and automated anti-cheat seeding.",
    },
    {
      icon: Trophy,
      iconColor: "text-amber-500 dark:text-amber-400",
      bgColor: "bg-amber-500/10 border-amber-500/20",
      title: "Exciting Rewards",
      description: "Earn massive seasonal XP boosts, championship crown badges, and exclusive profile titles.",
    },
    {
      icon: Users,
      iconColor: "text-sky-500 dark:text-sky-400",
      bgColor: "bg-sky-500/10 border-sky-500/20",
      title: "For Everyone",
      description: "Zero entry fees, seamless guest participation, and balanced matchmaking brackets for all skill tiers.",
    },
    {
      icon: Sparkles,
      iconColor: "text-purple-500 dark:text-purple-400",
      bgColor: "bg-purple-500/10 border-purple-500/20",
      title: "BHALYAM Arena",
      description: "Relive nostalgic living-room multiplayer memories with fast, real-time knockout brackets.",
    },
  ];

  return (
    <section className="pt-6 pb-2 border-t border-[var(--auth-card-edge)] dark:border-stone-800/80">
      <div className="text-center max-w-xl mx-auto mb-6 space-y-1">
        <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-amber-500 dark:text-amber-400">
          CHAMPIONSHIP STANDARDS
        </span>
        <h3 className="text-lg sm:text-xl font-black text-[var(--auth-ink)] dark:text-stone-100 tracking-tight">
          Built for Fair, Fast & Nostalgic Competition
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {values.map((v) => {
          const Icon = v.icon;
          return (
            <div
              key={v.title}
              className="bg-[var(--auth-card)] dark:bg-stone-900/60 border border-[var(--auth-card-edge)] dark:border-stone-800/80 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border ${v.bgColor} ${v.iconColor}`}
                >
                  <Icon size={20} aria-hidden="true" />
                </div>
                <h4 className="text-sm font-black text-[var(--auth-ink)] dark:text-stone-100 tracking-tight">
                  {v.title}
                </h4>
                <p className="text-xs text-[var(--auth-ink-soft)] dark:text-stone-400 leading-relaxed font-sans">
                  {v.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
