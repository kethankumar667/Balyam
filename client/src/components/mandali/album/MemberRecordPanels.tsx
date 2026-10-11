import { useEffect, useState, type ReactNode } from "react";
import { Flame, Gamepad2, Star } from "lucide-react";
import type { PlayerStats } from "@shared/profile/PlayerStats";
import type { MiniclipXPProgression } from "@shared/progression/MiniclipProgression";
import { useTranslation } from "../../../hooks/useTranslation";
import { gameLabel } from "./games";

/**
 * The game-record half of a member's profile: a level with its XP bar, then played / won / win rate.
 *
 * Every number is the player's real one (the same totals the leaderboards use). A member who has not
 * finished a match gets a plain "No matches yet", never zeros dressed up as a record, and a record
 * that could not be loaded says so rather than showing nothing. Album tokens only, so both themes flip
 * fully; the tier colour is the one accent and is used for the XP fill and the level ring.
 */

const RING_RADIUS = 38;

/** Level title, tier and XP on one tight strip: the bar is the point, everything else is a caption. */
export function LevelPanel({ progression }: { progression: MiniclipXPProgression }) {
  const { t } = useTranslation();
  const { currentLevel, levelTitle, tier, currentXP, nextLevelXP, levelProgressPercent, totalLifetimeXP } = progression;
  const toGo = Math.max(0, nextLevelXP - currentXP);

  // The bar fills in from empty on arrival: the one authored moment of this panel.
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setFilled(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <section aria-label={t("mandali.profile.level", { level: currentLevel })} className="rounded-2xl border border-album-line bg-album-raised px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="m-0 flex min-w-0 items-center gap-1.5 text-sm text-album-ink3">
          <span aria-hidden="true" className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: tier.themeColor }} />
          <span className="truncate">
            <span className="font-semibold text-album-ink">{levelTitle}</span> · {tier.name} · {t("mandali.profile.xpTotal", { count: totalLifetimeXP.toLocaleString() })}
          </span>
        </p>
        <span className="flex-shrink-0 text-xs font-semibold tabular-nums text-album-ink2">
          {t("mandali.profile.xpOfNext", { current: currentXP, next: nextLevelXP })}
        </span>
      </div>

      <div
        role="progressbar"
        aria-label={t("mandali.profile.levelProgress", { level: currentLevel + 1 })}
        aria-valuemin={0}
        aria-valuemax={nextLevelXP}
        aria-valuenow={currentXP}
        className="mt-2 h-2 overflow-hidden rounded-full bg-album-line"
      >
        <div
          className="h-full w-full origin-left rounded-full transition-transform duration-700 ease-out motion-reduce:transition-none"
          style={{
            transform: `scaleX(${filled ? levelProgressPercent / 100 : 0})`,
            background: `linear-gradient(90deg, ${tier.secondaryColor}, ${tier.themeColor})`,
          }}
        />
      </div>
      <p className="m-0 mt-1 text-right text-xs tabular-nums text-album-ink3">{t("mandali.profile.xpToNext", { count: toGo })}</p>
    </section>
  );
}

/** A ring that fills to `percent`. Drawn with pathLength so the dash is a plain 0-100. */
function WinRing({ percent, label }: { percent: number; label: string }) {
  return (
    <div role="img" aria-label={`${label} ${percent}%`} className="relative h-16 w-16 flex-shrink-0">
      <svg viewBox="0 0 88 88" className="h-full w-full" aria-hidden="true">
        <circle cx="44" cy="44" r={RING_RADIUS} fill="none" strokeWidth="9" className="stroke-album-line" />
        <circle
          cx="44"
          cy="44"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${percent} 100`}
          transform="rotate(-90 44 44)"
          className="stroke-album-foilfill"
        />
      </svg>
      <span aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-[15px] font-bold tabular-nums text-album-ink">{percent}%</span>
        <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-album-ink3">{label}</span>
      </span>
    </div>
  );
}

function Tile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl bg-album-field px-2.5 py-1.5">
      {icon}
      <div className="min-w-0">
        <p className="m-0 truncate text-[11px] leading-tight text-album-ink3">{label}</p>
        <p className="m-0 truncate text-sm font-semibold leading-tight text-album-ink">{value}</p>
      </div>
    </div>
  );
}

function winPercent(stats: PlayerStats): number {
  const reported = Number.isFinite(stats.winRate) ? stats.winRate : stats.totalMatches > 0 ? (stats.wins / stats.totalMatches) * 100 : 0;
  return Math.min(100, Math.max(0, Math.round(reported)));
}

export function RecordPanel({ stats, name }: { stats: PlayerStats; name: string }) {
  const { t } = useTranslation();

  if (stats.totalMatches <= 0) {
    return (
      <section aria-label={t("mandali.profile.record")} className="flex items-center gap-3 rounded-2xl border border-dashed border-album-line bg-album-raised px-3 py-2.5">
        <Gamepad2 className="h-6 w-6 flex-shrink-0 text-album-ink3" aria-hidden="true" />
        <div className="min-w-0">
          <p className="m-0 text-sm font-semibold text-album-ink">{t("mandali.profile.noMatches")}</p>
          <p className="m-0 text-xs leading-snug text-album-ink3">{t("mandali.profile.noMatchesBody", { name })}</p>
        </div>
      </section>
    );
  }

  const percent = winPercent(stats);
  const favourite = stats.favoriteGame !== "none" ? gameLabel(stats.favoriteGame) : t("mandali.profile.noFavourite");
  const rows: Array<{ label: string; value: number; swatch: string }> = [
    { label: t("mandali.profile.played"), value: stats.totalMatches, swatch: "bg-album-foilfill" },
    { label: t("mandali.profile.won"), value: stats.wins, swatch: "bg-album-success" },
    { label: t("mandali.profile.lost"), value: stats.losses, swatch: "bg-album-danger" },
    { label: t("mandali.profile.drawn"), value: stats.draws, swatch: "bg-album-ink3" },
  ];

  return (
    <section aria-label={t("mandali.profile.record")} className="rounded-2xl border border-album-line bg-album-raised p-3">
      <div className="flex items-center gap-3">
        <WinRing percent={percent} label={t("mandali.profile.winRate")} />
        <dl className="m-0 grid min-w-0 flex-1 grid-cols-4 gap-1.5">
          {rows.map((row) => (
            <div key={row.label} className="min-w-0 rounded-lg bg-album-field px-1.5 py-1 text-center">
              <dd className="m-0 text-base font-bold leading-tight tabular-nums text-album-ink">{row.value.toLocaleString()}</dd>
              <dt className="flex items-center justify-center gap-1 text-[10px] leading-tight text-album-ink3">
                <span aria-hidden="true" className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${row.swatch}`} />
                <span className="truncate">{row.label}</span>
              </dt>
            </div>
          ))}
        </dl>
      </div>

      <div aria-hidden="true" className="mt-2.5 flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-album-line">
        {stats.wins > 0 && <span className="bg-album-success" style={{ flexGrow: stats.wins }} />}
        {stats.draws > 0 && <span className="bg-album-ink3" style={{ flexGrow: stats.draws }} />}
        {stats.losses > 0 && <span className="bg-album-danger" style={{ flexGrow: stats.losses }} />}
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <Tile
          icon={<Flame className="h-4 w-4 flex-shrink-0 text-album-foil" aria-hidden="true" />}
          label={t("mandali.profile.bestStreak")}
          value={t("mandali.profile.streakGames", { count: stats.bestWinStreak })}
        />
        <Tile icon={<Star className="h-4 w-4 flex-shrink-0 text-album-foil" aria-hidden="true" />} label={t("mandali.profile.favourite")} value={favourite} />
      </div>
    </section>
  );
}

/** What stands in for the record while it loads: the same footprint, so nothing jumps when it lands. */
export function RecordSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-2 motion-safe:animate-pulse">
      <div className="h-[66px] rounded-2xl bg-album-field" />
      <div className="h-[150px] rounded-2xl bg-album-field" />
    </div>
  );
}

export function RecordUnavailable() {
  const { t } = useTranslation();
  return (
    <p role="status" className="m-0 rounded-2xl bg-album-field px-3 py-2.5 text-sm leading-relaxed text-album-ink3">
      {t("mandali.profile.unavailable")}
    </p>
  );
}
