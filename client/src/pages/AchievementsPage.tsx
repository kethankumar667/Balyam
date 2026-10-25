import { useId, useMemo, useRef, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { ArrowRight, CheckCircle2, Flame, Search, Target, Trophy, Award } from "lucide-react";
import type { Achievement } from "@shared/profile/Achievements";
import type { ProfileFamilyOutletContext } from "../components/layout/ProfileFamilyLayout";
import MemberLockedGate from "../components/auth/MemberLockedGate";
import ThemedSelect from "../components/ThemedSelect";
import { AchievementRevealModal } from "../features/profile/AchievementRevealModal";
import { ProfileEmptyState, ProfileErrorState, ProfilePanelSkeleton } from "../features/profile/ProfilePrimitives";
import { TrophyVaultArtwork } from "../features/profile/TrophyVaultArtwork";
import { VaultAchievementCard } from "../features/profile/VaultAchievementCard";

const CATEGORIES = [
  { value: "all", label: "All" }, { value: "progression", label: "Journey" },
  { value: "skill", label: "Mastery" }, { value: "resilience", label: "Resilience" }, { value: "social", label: "Social" },
] as const;
const CONTROL = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[var(--vault-edge)] bg-[var(--vault-panel)] px-4 text-xs font-bold text-[var(--vault-ink)] hover:border-[var(--vault-cyan)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vault-gold)]";

export default function AchievementsPage() {
  const { profile, stats, achievements, resources, isMember, retryProfileData } = useOutletContext<ProfileFamilyOutletContext>();
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("progress");
  const [limit, setLimit] = useState(12);
  const [activeAchievement, setActiveAchievement] = useState<Achievement | null>(null);
  const collectionRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const ready = resources.achievements.status === "ready";
  const unlocked = achievements.filter(a => a.unlocked);
  const percent = achievements.length ? Math.round(unlocked.length / achievements.length * 100) : 0;
  const recent = [...unlocked].sort((a, b) => (b.unlockedAt ?? 0) - (a.unlockedAt ?? 0)).slice(0, 3);
  const closest = [...achievements].filter(a => !a.unlocked && a.progressPercent > 0).sort((a, b) => b.progressPercent - a.progressPercent).slice(0, 3);
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return achievements.filter(a => (category === "all" || a.category === category)
      && (status === "all" || a.unlocked === (status === "unlocked"))
      && (!term || `${a.title} ${a.description}`.toLocaleLowerCase().includes(term)))
      .sort((a, b) => sort === "name" ? a.title.localeCompare(b.title)
        : sort === "recent" ? (b.unlockedAt ?? 0) - (a.unlockedAt ?? 0)
          : b.progressPercent - a.progressPercent);
  }, [achievements, category, status, query, sort]);
  const milestones = [...new Set([5, 10, 15, 20, achievements.length].filter(n => n > 0 && n <= achievements.length))].sort((a, b) => a - b);
  const nextMilestone = milestones.find(n => n > unlocked.length);

  function clearFilters() { setCategory("all"); setStatus("all"); setQuery(""); setLimit(12); }
  function viewCollection(nextStatus: string) {
    clearFilters(); setStatus(nextStatus);
    collectionRef.current?.scrollIntoView({ behavior: "instant", block: "start" });
    searchRef.current?.focus({ preventScroll: true });
  }
  if (!isMember) return <MemberLockedGate feature="profile" />;
  if (!profile) return null;

  return <div className="trophy-vault space-y-5 text-[var(--vault-ink)]">
    <section aria-labelledby={`${id}-title`} className="relative isolate overflow-hidden rounded-3xl border border-[var(--vault-edge)] bg-[var(--vault-canvas)]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_55%_45%,var(--vault-glow),transparent_65%)]" />
      <div className="relative grid items-center gap-2 p-5 sm:p-7 lg:grid-cols-[1fr_1.1fr_.8fr]">
        <div className="relative z-10">
          <p className="text-[10px] font-bold uppercase tracking-[.24em] text-[var(--vault-gold)]">Your personal</p>
          <h1 id={`${id}-title`} className="mt-2 font-display text-4xl uppercase leading-none tracking-wide text-[var(--vault-gold)] sm:text-5xl">Trophy vault</h1>
          <p className="mt-4 text-sm font-semibold">Play. Progress. Collect. Relive.</p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--vault-soft)]">Every achievement is a memory.</p>
          {ready && <div className="mt-5 grid grid-cols-2 gap-2">
            <div role="group" aria-label="Unlocked" className="rounded-xl border border-[var(--vault-edge)] bg-[var(--vault-panel)] p-3">
              <Trophy size={19} className="mb-2 text-[var(--vault-gold)]" aria-hidden="true" />
              <p className="font-mono text-xl font-bold">{unlocked.length}</p><p className="mt-1 text-[10px] text-[var(--vault-soft)]">Unlocked</p>
            </div>
            <div className="rounded-xl border border-[var(--vault-edge)] bg-[var(--vault-panel)] p-3">
              <Flame size={19} className="mb-2 text-[var(--vault-gold)]" aria-hidden="true" />
              <p className="font-mono text-xl font-bold">{resources.stats.status === "ready" && stats && !stats.demo ? stats.bestWinStreak : "—"}</p><p className="mt-1 text-[10px] text-[var(--vault-soft)]">Best win streak</p>
            </div>
          </div>}
        </div>
        <div className="mx-auto h-[210px] w-full max-w-[380px] sm:h-[270px] lg:h-[300px]"><TrophyVaultArtwork /></div>
        {ready ? <div className="flex flex-col items-center pb-3">
          <div className="relative h-40 w-40 sm:h-44 sm:w-44">
            <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90" aria-hidden="true">
              <circle cx="80" cy="80" r="67" stroke="var(--vault-track)" strokeWidth="10" fill="none" />
              <circle cx="80" cy="80" r="67" stroke="var(--vault-cyan)" strokeWidth="10" fill="none" pathLength="100" strokeDasharray={`${percent} 100`} strokeLinecap="round" />
            </svg>
            <div role="progressbar" aria-label="Vault completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={`${unlocked.length} of ${achievements.length} achievements unlocked`}
              className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-3xl font-bold">{percent}%</span>
              <span className="mt-1 font-mono text-sm">{unlocked.length} / {achievements.length}</span>
              <span className="mt-1 text-[10px] text-[var(--vault-soft)]">Achievements unlocked</span>
            </div>
          </div>
          <p className="mt-2 font-script text-xl text-[var(--vault-gold)]">Small steps. Big memories.</p>
        </div> : <p className="text-center text-sm text-[var(--vault-soft)]">Your collection, one game at a time.</p>}
      </div>
    </section>

    {resources.achievements.status === "loading" && <ProfilePanelSkeleton rows={6} />}
    {resources.achievements.status === "error" && <ProfileErrorState title="Trophy vault unavailable" description="Your achievement progress could not be loaded right now." onRetry={retryProfileData} />}
    {ready && <>
      {[{ title: "Recently unlocked", subtitle: "Your latest achievements. Keep going!", items: recent, icon: Trophy, status: "unlocked", empty: "Your first trophy is waiting. Complete a challenge to start your collection." },
        { title: "Almost yours", subtitle: "Your closest challenges. Every step counts.", items: closest, icon: Target, status: "locked", empty: achievements.length > 0 && unlocked.length === achievements.length ? "Every achievement unlocked. Enjoy your collection." : "Play a match to make progress toward your next achievement." }].map(section => (
        <section key={section.title} aria-label={section.title} className="rounded-2xl border border-[var(--vault-edge)] bg-[var(--vault-section)] p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><h2 className="flex items-center gap-2 text-base font-bold"><section.icon size={21} className="text-[var(--vault-gold)]" aria-hidden="true" />{section.title}</h2><p className="mt-1 text-xs text-[var(--vault-soft)]">{section.subtitle}</p></div>
            <button type="button" className={CONTROL} onClick={() => viewCollection(section.status)} aria-label={`View all ${section.title.toLowerCase()}`}>View all</button>
          </div>
          {section.items.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{section.items.map(a => <VaultAchievementCard key={a.id} achievement={a} onSelect={setActiveAchievement} compact />)}</div>
            : <p className="py-4 text-sm leading-relaxed text-[var(--vault-soft)]">{section.empty}</p>}
        </section>
      ))}

      {achievements.length > 0 && <section aria-label="Collection milestones" className="rounded-2xl border border-[var(--vault-edge)] bg-[var(--vault-section)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="flex items-center gap-2 font-bold"><Award className="text-[var(--vault-gold)]" size={21} aria-hidden="true" />Collection milestones</h2><p className="mt-1 text-xs text-[var(--vault-soft)]">A trail of your unlocked achievements.</p></div>
          <p className="text-xs font-semibold text-[var(--vault-gold)]">{nextMilestone ? `${nextMilestone - unlocked.length} more to ${nextMilestone} unlocked` : "Collection complete"}</p>
        </div>
        <ol className="mt-6 grid gap-2" style={{ gridTemplateColumns: `repeat(${milestones.length}, minmax(0, 1fr))` }}>
          {milestones.map(n => <li key={n} className="relative text-center">
            <span aria-hidden="true" className="absolute inset-x-0 top-4 h-px bg-[var(--vault-edge)]" />
            <span className={`relative mx-auto flex h-9 w-9 items-center justify-center rounded-full border bg-[var(--vault-panel)] ${n <= unlocked.length ? "border-[var(--vault-green)] text-[var(--vault-green)]" : "border-[var(--vault-edge)] text-[var(--vault-soft)]"}`}>{n <= unlocked.length ? <CheckCircle2 size={18} aria-hidden="true" /> : <Trophy size={16} aria-hidden="true" />}</span>
            <span className="mt-2 block font-mono text-xs font-bold">{n}</span><span className="sr-only">{n <= unlocked.length ? " unlocked milestone reached" : " unlocked milestone not reached"}</span>
          </li>)}
        </ol>
        <p className="mt-4 text-[11px] text-[var(--vault-soft)]">Collection markers only; no additional reward is granted.</p>
      </section>}

      <section ref={collectionRef} aria-label="Achievement collection" className="scroll-mt-24 rounded-2xl border border-[var(--vault-edge)] bg-[var(--vault-section)] p-4 sm:p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold"><Trophy size={23} className="text-[var(--vault-gold)]" aria-hidden="true" />Achievement collection</h2>
        <p className="mt-1 text-xs text-[var(--vault-soft)]">Explore your challenges across every game.</p>
        <div className="my-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.6fr_1fr_1fr]">
          <label className="text-xs font-semibold">Search achievements
            <span className="relative mt-1 block"><Search size={16} className="pointer-events-none absolute left-3 top-4 text-[var(--vault-soft)]" aria-hidden="true" />
              <input ref={searchRef} type="search" value={query} onChange={e => { setQuery(e.target.value); setLimit(12); }} placeholder="Find your next challenge…"
                className="min-h-[48px] w-full rounded-xl border border-[var(--vault-edge)] bg-[var(--vault-panel)] pl-9 pr-3 text-sm text-[var(--vault-ink)] placeholder:text-[var(--vault-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vault-gold)]" />
            </span>
          </label>
          <label className="text-xs font-semibold">Status<ThemedSelect ariaLabel="Achievement status" value={status} onChange={value => { setStatus(value); setLimit(12); }} options={[{ value: "all", label: "All status" }, { value: "unlocked", label: "Unlocked" }, { value: "locked", label: "In progress" }]} /></label>
          <label className="text-xs font-semibold">Sort by<ThemedSelect ariaLabel="Sort achievements" value={sort} onChange={value => { setSort(value); setLimit(12); }} options={[{ value: "progress", label: "Highest progress" }, { value: "recent", label: "Latest unlock" }, { value: "name", label: "Name: A–Z" }]} /></label>
        </div>
        <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Achievement categories">
          {CATEGORIES.map(c => <button key={c.value} type="button" aria-pressed={category === c.value} onClick={() => { setCategory(c.value); setLimit(12); }}
            className={`${CONTROL} ${category === c.value ? "!border-[var(--vault-cyan)] !text-[var(--vault-cyan)]" : ""}`}>{c.label} ({c.value === "all" ? achievements.length : achievements.filter(a => a.category === c.value).length})</button>)}
        </div>
        {achievements.length === 0 ? <ProfileEmptyState icon={Trophy} title="Your collection starts here" description="Play a game and complete a challenge to earn your first achievement." />
          : filtered.length ? <>
            <p role="status" className="mb-3 text-xs text-[var(--vault-soft)]">Showing {Math.min(limit, filtered.length)} of {filtered.length} achievements</p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{filtered.slice(0, limit).map(a => <VaultAchievementCard key={a.id} achievement={a} onSelect={setActiveAchievement} />)}</div>
            {limit < filtered.length && <div className="mt-5 text-center"><button type="button" className={CONTROL} onClick={() => setLimit(n => n + 12)}>Load more achievements</button></div>}
          </> : <ProfileEmptyState icon={Search} title="No achievements match" description="Try another search or clear your filters." actionLabel="Clear filters" onAction={clearFilters} />}
      </section>
    </>}
    <div className="flex justify-end"><Link to="/profile/matches" className={CONTROL}>Battle archive <ArrowRight size={16} aria-hidden="true" /></Link></div>
    <AchievementRevealModal achievement={activeAchievement} isOpen={activeAchievement !== null} onClose={() => setActiveAchievement(null)} />
  </div>;
}
