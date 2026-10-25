import { Award, CheckCircle2, Flame, Gamepad2, ShieldCheck, Timer, Trophy, Users, Crown, Dices, Layers, Target, type LucideIcon } from "lucide-react";
import type { Achievement } from "@shared/profile/Achievements";

const ICONS: Record<string, LucideIcon> = {
  first_match: Gamepad2, first_win: Trophy, three_streak: Flame, five_streak: Flame,
  ten_wins: Crown, fifty_wins: Award, hundred_wins: Crown, ludo_master: Dices,
  rummy_champ: Layers, cricket_legend: Target, marathon_gamer: Timer,
  recovery_master: ShieldCheck, five_recoveries: ShieldCheck, variety_player: Users,
};
const ACCENTS = {
  progression: "text-[var(--vault-cyan)]",
  skill: "text-[var(--vault-gold)]",
  resilience: "text-[var(--vault-violet)]",
  social: "text-[var(--vault-green)]",
};

export function VaultBadge({ achievement, large = false }: { achievement: Achievement; large?: boolean }) {
  const Icon = ICONS[achievement.id] ?? (achievement.category === "skill" ? Trophy : Award);
  return <span aria-hidden="true" className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-current bg-[var(--vault-inset)] ${large ? "h-24 w-24" : "h-16 w-16"} ${ACCENTS[achievement.category]}`}>
    <span className="absolute inset-1 rounded-xl border border-current opacity-20" />
    <span className="absolute -bottom-5 h-12 w-16 rounded-full bg-current opacity-15 blur-xl" />
    <Icon size={large ? 48 : 32} strokeWidth={1.5} />
  </span>;
}

export function VaultAchievementCard({ achievement, onSelect, compact = false }: {
  achievement: Achievement; onSelect: (achievement: Achievement) => void; compact?: boolean;
}) {
  const progress = Math.min(100, Math.max(0, Math.round(achievement.progressPercent)));
  return <button type="button" onClick={() => onSelect(achievement)}
    className={`group flex h-full min-h-[160px] min-w-0 flex-col rounded-2xl border bg-[var(--vault-panel)] p-4 text-left text-[var(--vault-ink)] transition-colors hover:border-[var(--vault-cyan)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vault-gold)] motion-reduce:transition-none ${achievement.unlocked ? "border-[var(--vault-green)]" : "border-[var(--vault-edge)]"}`}>
    <span className="flex min-w-0 items-start gap-3">
      <VaultBadge achievement={achievement} />
      <span className="min-w-0">
        <span className={`mb-1 block text-[9px] font-bold uppercase tracking-widest ${ACCENTS[achievement.category]}`}>{achievement.category === "progression" ? "Journey" : achievement.category === "skill" ? "Mastery" : achievement.category}</span>
        <span className="block text-sm font-bold leading-snug">{achievement.title}</span>
        <span className="mt-1 block text-xs leading-relaxed text-[var(--vault-soft)]">{achievement.description}</span>
      </span>
    </span>
    <span className="mt-auto block pt-4">
      {achievement.unlocked ? <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--vault-green)]"><CheckCircle2 size={14} aria-hidden="true" />Unlocked{compact && achievement.unlockedAt ? ` · ${new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(achievement.unlockedAt)}` : ""}</span>
        : <><span className="mb-2 flex justify-between gap-2 font-mono text-[11px] text-[var(--vault-soft)]"><span>{achievement.currentProgress} / {achievement.targetValue}</span><span>{progress}%</span></span>
          <span className="block h-1.5 overflow-hidden rounded-full bg-[var(--vault-track)]" role="progressbar" aria-label={`${achievement.title} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <span className={`block h-full rounded-full bg-current ${ACCENTS[achievement.category]}`} style={{ width: `${progress}%` }} />
          </span></>}
    </span>
  </button>;
}
