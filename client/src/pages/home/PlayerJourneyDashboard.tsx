import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { RevealOnScroll } from "../../components/RevealOnScroll";
import { formatTimeAgo } from "../../lib/formatTimeAgo";
import { useTheme } from "../../lib/useTheme";
import { type PlayerSnapshot } from "../../hooks/usePlayerSnapshot";
import { BHALYAM_GAMES, type BhalyamGameSlug } from "../../components/bhalyam/data";
import { TILE_ART_BY_GAME } from "./gameArt";
import { WhatsappGlyph } from "./icons";

/*
 * `LiveLoungePulse` (four platform-wide activity tiles, a rotating
 * "community feed" ticker, and a "Weekly Leaderboard" that named the real
 * signed-in user at a fixed fake rank) was removed rather than wired.
 *
 * Unlike the cards above, nothing here had a real source to wire to: there is
 * no online-presence counter, no cross-player activity feed, and no weekly
 * XP leaderboard service anywhere in `server/src`. Every number — "548
 * Players Online", "68 Active Live Rooms", "23 School Gangs Active", "145
 * Matches Won Today" — was a hardcoded literal animated with `<CountUp>` to
 * read as live telemetry it was not. See TRUST-REMEDIATION-REPORT.md.
 */

export function PlayerJourneyDashboard({
  onSelect,
  snapshot,
}: {
  onSelect: (slug: BhalyamGameSlug) => void;
  snapshot: PlayerSnapshot;
}) {
  const [theme] = useTheme();
  const isDark = theme === "dark";

  const handleShareWhatsAppReferral = () => {
    const text = encodeURIComponent(
      "🎮 Hey gang! Come join my room on BHALYAM to unlock our nostalgic 90s childhood games together: " + window.location.origin
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  // Real numbers, computed once and shared by Card 1 and Card 2 below.
  // `matches` is limit=1 from usePlayerSnapshot, so [0] IS "last played".
  const lastMatch = snapshot.matches[0];
  const lastGameCard = lastMatch ? BHALYAM_GAMES.find((g) => g.slug === lastMatch.game) : undefined;
  const lastGameStats = lastMatch ? snapshot.stats?.perGame[lastMatch.game] : undefined;
  const overallStreak = snapshot.stats?.currentWinStreak ?? 0;

  const xp = snapshot.profile?.experiencePoints ?? 0;
  const level = snapshot.profile?.level ?? 1;
  const xpIntoLevel = xp % 100;
  // Closest to completion first — the most motivating "next" target, and the
  // one most likely to already be in progress.
  const nextAchievement = [...snapshot.achievements]
    .filter((a) => !a.unlocked)
    .sort((a, b) => b.progressPercent - a.progressPercent)[0];

  return (
    <RevealOnScroll as="section" amount={0.1} className="mt-6 mb-8">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className={`bhalyam-display text-[22px] sm:text-[28px] leading-tight ${
            isDark ? "text-white" : "text-[#1D2C4A]"
          }`}>
            Continue Your Journey
          </h2>
          <p className={`text-[13px] sm:text-[14px] font-medium ${
            isDark ? "text-slate-400" : "text-[#6D5C4D]"
          }`}>
            Pick up where you left off and track real progress toward your next achievement
          </p>
        </div>
      </div>

      {!snapshot.ready ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 items-stretch animate-pulse" aria-busy="true" aria-label="Loading player progress">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`rounded-3xl border p-5 sm:p-6 min-h-[220px] flex flex-col justify-between ${
                isDark ? "bg-[#131926]/50 border-white/5" : "bg-[#FFFDF7]/50 border-[#ECD9BA]/60"
              }`}
            >
              <div className="space-y-3">
                <div className="h-5 w-28 bg-black/10 dark:bg-white/10 rounded-full" />
                <div className="h-16 w-full bg-black/5 dark:bg-white/5 rounded-2xl" />
              </div>
              <div className="h-10 w-full bg-black/10 dark:bg-white/10 rounded-2xl" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 items-stretch">

          {/* Card 1: Jump back into the real last-played game, or an honest
              first-game prompt when there is no match history yet. */}
          <article className={`rounded-3xl border p-5 sm:p-6 shadow-sm flex flex-col justify-between transition-colors ${
            isDark ? "bg-[#131926] border-white/10" : "bg-[#FFFDF7] border-[#ECD9BA]"
          }`}>
            {lastMatch && lastGameCard ? (
              <>
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border ${
                      isDark
                        ? "bg-amber-950/60 text-amber-300 border-amber-700/50"
                        : "bg-amber-100 text-amber-900 border-amber-300"
                    }`}>
                      ▶ Jump Back In
                    </span>
                    <span className={`text-[12px] font-semibold ${
                      isDark ? "text-slate-400" : "text-sand-600"
                    }`}>
                      Last played {formatTimeAgo(lastMatch.finishedAt)}
                    </span>
                  </div>

                  <div className={`flex items-center gap-3.5 my-3 p-3 rounded-2xl border ${
                    isDark ? "bg-white/5 border-white/10" : "bg-[#FAF2DF] border-[#ECD9BA]"
                  }`}>
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-amber-200 border-2 border-amber-400 p-1 flex-shrink-0 flex items-center justify-center shadow-inner">
                      <picture className="w-full h-full flex items-center justify-center">
                        <source type="image/avif" srcSet={TILE_ART_BY_GAME[lastGameCard.slug].replace(/\.(png|jpg|jpeg)$/i, '.avif')} />
                        <source type="image/webp" srcSet={TILE_ART_BY_GAME[lastGameCard.slug].replace(/\.(png|jpg|jpeg)$/i, '.webp')} />
                        <img
                          src={TILE_ART_BY_GAME[lastGameCard.slug]}
                          alt={lastGameCard.title}
                          width={64}
                          height={64}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-contain"
                        />
                      </picture>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className={`font-display font-black text-[20px] leading-tight truncate ${
                        isDark ? "text-white" : "text-[#1D2C4A]"
                      }`}>
                        {lastGameCard.title}
                      </h3>
                      <div className={`flex items-center gap-2 text-[12px] font-bold mt-0.5 ${
                        isDark ? "text-slate-300" : "text-[#6D5C4D]"
                      }`}>
                        {lastGameStats && (
                          <>
                            <span className={isDark ? "text-emerald-400 font-bold" : "text-emerald-700 font-bold"}>
                              🏆 {lastGameStats.wins} Win{lastGameStats.wins === 1 ? "" : "s"}
                            </span>
                            <span>•</span>
                          </>
                        )}
                        <span>Lvl {level}</span>
                        {overallStreak > 0 && (
                          <>
                            <span>•</span>
                            <span className={isDark ? "text-chest-300 font-extrabold" : "text-chest-700 font-extrabold"}>
                              🔥 {overallStreak}x Streak
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelect(lastGameCard.slug)}
                  className="w-full mt-3 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:brightness-110 text-white font-black text-[14px] uppercase tracking-wider shadow-md active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer min-h-[44px] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#131926]"
                >
                  <span>Resume {lastGameCard.title}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-6 gap-3 flex-1">
                <span className="text-3xl" aria-hidden>🎮</span>
                <p className={`text-[14px] font-bold ${isDark ? "text-white" : "text-[#1D2C4A]"}`}>
                  Play your first game to start your history
                </p>
                <p className={`text-[12px] font-medium ${isDark ? "text-slate-400" : "text-[#6D5C4D]"}`}>
                  Your last-played game will appear here so you can jump straight back in.
                </p>
                <Link
                  to="/games"
                  className="mt-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:brightness-110 text-white font-black text-[13px] uppercase tracking-wider shadow-md transition inline-flex items-center gap-2 min-h-[44px] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#131926]"
                >
                  <span>Browse Games</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </article>

          {/* Card 2: Real level progress and the real closest-to-unlocking
              achievement. */}
          <article className={`rounded-3xl border p-5 sm:p-6 shadow-sm flex flex-col justify-between transition-colors ${
            isDark ? "bg-[#131926] border-white/10" : "bg-[#FFFDF7] border-[#ECD9BA]"
          }`}>
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className={`font-display font-black text-[18px] ${
                  isDark ? "text-white" : "text-[#1D2C4A]"
                }`}>
                  🏆 Level {level} Progress
                </span>
                <span className={`text-[12px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                  isDark
                    ? "bg-amber-950/60 text-amber-300 border-amber-700/50"
                    : "bg-amber-100 text-amber-900 border-amber-300"
                }`}>
                  {xpIntoLevel}% Complete
                </span>
              </div>

              {/* XP Bar */}
              <div
                role="progressbar"
                aria-valuenow={xpIntoLevel}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Level ${level} experience progress`}
                className={`w-full h-2.5 rounded-full overflow-hidden mb-3 ${
                  isDark ? "bg-slate-800" : "bg-[#ECD9BA]"
                }`}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                  style={{ width: `${xpIntoLevel}%` }}
                />
              </div>

              {/* Next real achievement, closest to completion */}
              {nextAchievement ? (
                <div className={`p-2.5 rounded-xl border ${
                  isDark ? "bg-white/5 border-white/10" : "bg-[#FAF2DF] border-[#ECD9BA]"
                }`}>
                  <div className={`text-xs font-black uppercase tracking-wider ${
                    isDark ? "text-chest-300" : "text-chest-700"
                  }`}>
                    🎯 Next Achievement
                  </div>
                  <div className={`text-[13px] font-bold mt-0.5 ${
                    isDark ? "text-white" : "text-[#1D2C4A]"
                  }`}>
                    {nextAchievement.title}
                  </div>
                  <div className={`text-[11px] font-semibold ${
                    isDark ? "text-slate-300" : "text-[#7A6B5C]"
                  }`}>
                    {nextAchievement.currentProgress} / {nextAchievement.targetValue} — {nextAchievement.description}
                  </div>
                </div>
              ) : (
                <p className={`text-[12px] font-semibold ${isDark ? "text-slate-400" : "text-[#6D5C4D]"}`}>
                  {snapshot.ready
                    ? "Every achievement unlocked so far. Play a match to find the next one."
                    : "Play matches to start unlocking achievements."}
                </p>
              )}
            </div>
          </article>

          {/* Card 3: Invite Friends — real WhatsApp share action */}
          <article className={`rounded-3xl border p-5 sm:p-6 shadow-sm flex flex-col justify-between relative overflow-hidden transition-colors ${
            isDark
              ? "bg-[#0E1526] border-amber-500/30"
              : "bg-gradient-to-br from-[#FFFDF7] to-[#FDF4E3] border-amber-300/80"
          }`}>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl" aria-hidden>👥</span>
                <h3 className={`font-display font-black text-[18px] ${
                  isDark ? "text-white" : "text-[#1D2C4A]"
                }`}>
                  Invite Friends, Unlock Perks
                </h3>
              </div>
              <p className={`text-[13px] font-medium mb-3 ${
                isDark ? "text-slate-300" : "text-[#6D5C4D]"
              }`}>
                Bring 3 friends to BHALYAM and instantly unlock exclusive nostalgia rewards:
              </p>

              <ul className={`space-y-2 mb-4 text-[13px] font-bold ${
                isDark ? "text-slate-200" : "text-[#2A221B]"
              }`}>
                <li className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black ${
                    isDark ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/30" : "bg-emerald-100 text-emerald-800"
                  }`}>
                    ✓
                  </span>
                  <span>Exclusive Gold Avatar Frame</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black ${
                    isDark ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/30" : "bg-emerald-100 text-emerald-800"
                  }`}>
                    ✓
                  </span>
                  <span>Nostalgia "Gang Leader" Chat Badge</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black ${
                    isDark ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/30" : "bg-emerald-100 text-emerald-800"
                  }`}>
                    ✓
                  </span>
                  <span>Retro 90s School Slate Board Theme</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={handleShareWhatsAppReferral}
              className="w-full mt-3 py-3 px-4 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-[#0B2E20] font-black text-[14px] uppercase tracking-wider shadow-[0_4px_14px_rgba(37,211,102,0.35)] active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer min-h-[44px] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0E1526]"
            >
              <WhatsappGlyph className="w-4 h-4 text-[#0B2E20]" />
              <span>Invite on WhatsApp</span>
            </button>
          </article>

        </div>
      )}
    </RevealOnScroll>
  );
}
