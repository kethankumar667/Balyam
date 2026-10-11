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
    <section aria-label={t("mandali.profile.level", { level: currentLevel })} className="rounded-2xl border border-album-line bg-album-raised p-4">
      <div className="flex items-center gap-3">
        <span
          className="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-full border-[3px] bg-album-page leading-none"
          style={{ borderColor: tier.themeColor }}
        >
          <span className="text-[10px] font-semibold uppercase tracking-wide text-album-ink3">Lv</span>
          <span className="text-xl font-bold tabular-nums text-album-ink">{currentLevel}</span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate text-base font-semibold leading-snug text-album-ink">{levelTitle}</p>
          <p className="m-0 flex items-center gap-1.5 text-[13px] text-album-ink3">
            <span aria-hidden="true" className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: tier.themeColor }} />
            <span className="truncate">
              {tier.name} · {t("mandali.profile.xpTotal", { count: totalLifetimeXP.toLocaleString() })}
            </span>
          </p>
        </div>
      </div>

      <div
        role="progressbar"
        aria-label={t("mandali.profile.levelProgress", { level: currentLevel + 1 })}
        aria-valuemin={0}
        aria-valuemax={nextLevelXP}
        aria-valuenow={currentXP}
        className="mt-4 h-3 overflow-hidden rounded-full bg-album-line"
      >
        <div
          className="h-full w-full origin-left rounded-full transition-transform duration-700 ease-out motion-reduce:transition-none"
          style={{
            transform: `scaleX(${filled ? levelProgressPercent / 100 : 0})`,
            background: `linear-gradient(90deg, ${tier.secondaryColor}, ${tier.themeColor})`,
          }}
        />
      </div>
      <p className="m-0 mt-2 flex items-center justify-between text-[13px] tabular-nums text-album-ink3">
        <span className="font-semibold text-album-ink2">{t("mandali.profile.xpOfNext", { current: currentXP, next: nextLevelXP })}</span>
        <span>{t("mandali.profile.xpToNext", { count: toGo })}</span>
      </p>
    </section>
  );
}

/** A ring that fills to `percent`. Drawn with pathLength so the dash is a plain 0-100. */
function WinRing({ percent, label }: { percent: number; label: string }) {
  return (
    <div role="img" aria-label={`${label} ${percent}%`} className="relative h-[88px] w-[88px] flex-shrink-0">
      <svg viewBox="0 0 88 88" className="h-full w-full" aria-hidden="true">
        <circle cx="44" cy="44" r={RING_RADIUS} fill="none" strokeWidth="8" className="stroke-album-line" />
        <circle
          cx="44"
          cy="44"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${percent} 100`}
          transform="rotate(-90 44 44)"
          className="stroke-album-foilfill"
        />
      </svg>
      <span aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-xl font-bold tabular-nums text-album-ink">{percent}%</span>
        <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-album-ink3">{label}</span>
      </span>
    </div>
  );
}

function Tile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-album-field px-3 py-2.5">
      <p className="m-0 flex items-center gap-1.5 text-xs text-album-ink3">
        {icon}
        {label}
      </p>
      <p className="m-0 mt-1 truncate text-[15px] font-semibold text-album-ink">{value}</p>
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
      <section aria-label={t("mandali.profile.record")} className="rounded-2xl border border-dashed border-album-line bg-album-raised p-4 text-center">
        <Gamepad2 className="mx-auto h-6 w-6 text-album-ink3" aria-hidden="true" />
        <p className="m-0 mt-2 text-[15px] font-semibold text-album-ink">{t("mandali.profile.noMatches")}</p>
        <p className="m-0 mt-1 text-sm leading-relaxed text-album-ink3">{t("mandali.profile.noMatchesBody", { name })}</p>
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
    <section aria-label={t("mandali.profile.record")} className="rounded-2xl border border-album-line bg-album-raised p-4">
      <div className="flex items-center gap-4">
        <WinRing percent={percent} label={t("mandali.profile.winRate")} />
        <dl className="m-0 grid min-w-0 flex-1 gap-1.5">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-2">
              <dt className="flex min-w-0 items-center gap-2 text-sm text-album-ink3">
                <span aria-hidden="true" className={`h-2 w-2 flex-shrink-0 rounded-full ${row.swatch}`} />
                <span className="truncate">{row.label}</span>
              </dt>
              <dd className="m-0 text-[15px] font-semibold tabular-nums text-album-ink">{row.value.toLocaleString()}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div aria-hidden="true" className="mt-4 flex h-2 gap-0.5 overflow-hidden rounded-full bg-album-line">
        {stats.wins > 0 && <span className="bg-album-success" style={{ flexGrow: stats.wins }} />}
        {stats.draws > 0 && <span className="bg-album-ink3" style={{ flexGrow: stats.draws }} />}
        {stats.losses > 0 && <span className="bg-album-danger" style={{ flexGrow: stats.losses }} />}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Tile
          icon={<Flame className="h-3.5 w-3.5 text-album-foil" aria-hidden="true" />}
          label={t("mandali.profile.bestStreak")}
          value={t("mandali.profile.streakGames", { count: stats.bestWinStreak })}
        />
        <Tile icon={<Star className="h-3.5 w-3.5 text-album-foil" aria-hidden="true" />} label={t("mandali.profile.favourite")} value={favourite} />
      </div>
    </section>
  );
}

/** What stands in for the record while it loads: the same footprint, so nothing jumps when it lands. */
export function RecordSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-3 motion-safe:animate-pulse">
      <div className="h-[132px] rounded-2xl bg-album-field" />
      <div className="h-[200px] rounded-2xl bg-album-field" />
    </div>
  );
}

export function RecordUnavailable() {
  const { t } = useTranslation();
  return (
    <p role="status" className="m-0 rounded-2xl bg-album-field px-4 py-3 text-sm leading-relaxed text-album-ink3">
      {t("mandali.profile.unavailable")}
    </p>
  );
}
