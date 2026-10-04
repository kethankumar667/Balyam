import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ShieldAlert, Search, RefreshCw, Users } from "lucide-react";
import AdminLayout from "../../../components/admin/admin-layout";
import PageHeader from "../../../components/admin/page-header";
import StatCard from "../../../components/admin/stat-card";
import {
  operationalFetch,
  operationalPost,
  operationalPut,
  OperationalAuthError,
} from "../../../lib/operationalApi";

/**
 * Risk & Rewards: who is on a watch, who looks fed by others, and the two levers
 * the server gives an operator — set an account's state, withdraw a pending reward.
 *
 * Everything here is a view over `/api/admin/risk` (see
 * server/src/admin/RiskAdminController.ts), and the rules stay where they live:
 * the server requires a written note to restrict an account, takes the actor from
 * the verified credential, and records every change. This page adds no rule of its
 * own and invents no data — an empty list means nothing is flagged.
 *
 * The collusion list is a report for a person to read. Acting on a row is a
 * separate, deliberate step: look the account up, read the numbers, set a state.
 */

type RiskState = "NORMAL" | "WATCHLIST" | "RESTRICTED" | "UNDER_REVIEW";
const STATES: RiskState[] = ["NORMAL", "WATCHLIST", "RESTRICTED", "UNDER_REVIEW"];

interface RiskRecord {
  playerId: string;
  state: RiskState;
  reasonCodes: string[];
  updatedAt: number;
  updatedBy: string;
}

interface CollusionFinding {
  beneficiaryId: string;
  matches: number;
  summary: string;
  feeders: Array<{ playerId: string; matches: number; beneficiaryWins: number; concentration: number }>;
}

interface Reward {
  rewardId: string;
  rewardType: string;
  amount: number;
  status: "PENDING" | "RELEASING" | "RELEASED" | "VOIDED";
  vestingUntil: number;
  description: string;
}

interface Detail {
  playerId: string;
  state: RiskState;
  record: RiskRecord | null;
  events: Array<{ kind: string; reasonCode: string; createdAt: number }>;
  rewards: Reward[];
  trust: { tier: number; reasons: Array<{ label: string; met: boolean; detail: string }> };
}

function errorMessage(err: unknown): string {
  if (err instanceof OperationalAuthError) return "Not authorized for the operational API.";
  if (err instanceof Error) return err.message;
  return "Request failed.";
}

const field =
  "min-h-[44px] w-full rounded-xl border border-[var(--chrome-border)] bg-[var(--chrome-control)] px-3 text-sm text-[var(--chrome-ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500";
const button =
  "min-h-[44px] rounded-xl border border-[var(--chrome-border)] bg-[var(--chrome-control)] px-4 text-xs font-bold text-[var(--chrome-ink)] hover:bg-[var(--chrome-control-hi)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-50";
const primary =
  "min-h-[44px] rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 px-4 text-xs font-black text-zinc-950 hover:from-amber-400 hover:to-yellow-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-50";

export default function AdminRiskPage() {
  const [accounts, setAccounts] = useState<RiskRecord[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [findings, setFindings] = useState<CollusionFinding[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [nextState, setNextState] = useState<RiskState>("WATCHLIST");
  const [note, setNote] = useState("");
  const [acting, setActing] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [overview, collusion] = await Promise.all([
        operationalFetch<{ accounts: RiskRecord[]; counts: Record<string, number> }>("/api/admin/risk"),
        operationalFetch<{ findings: CollusionFinding[] }>("/api/admin/risk/collusion"),
      ]);
      setAccounts(overview.accounts);
      setCounts(overview.counts);
      setFindings(collusion.findings);
      setLoadError(null);
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const lookUp = useCallback(async (playerId: string) => {
    const id = playerId.trim();
    if (!id) return;
    setLookupError(null);
    try {
      const result = await operationalFetch<Detail>(`/api/admin/risk/${encodeURIComponent(id)}`);
      setDetail(result);
      setQuery(id);
      setNextState(result.state === "NORMAL" ? "WATCHLIST" : "NORMAL");
      setNote("");
    } catch (err) {
      setDetail(null);
      setLookupError(errorMessage(err));
    }
  }, []);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    void lookUp(query);
  };

  const noteRequired = nextState !== "NORMAL";
  const canApply = !acting && detail !== null && (!noteRequired || note.trim().length > 0);

  const applyState = async () => {
    if (!detail || !canApply) return;
    setActing(true);
    setActionMessage(null);
    try {
      await operationalPut(`/api/admin/risk/${encodeURIComponent(detail.playerId)}`, {
        state: nextState,
        note: note.trim() || undefined,
      });
      await Promise.all([lookUp(detail.playerId), load()]);
      setActionMessage(`Set ${detail.playerId} to ${nextState}.`);
    } catch (err) {
      setActionMessage(`Not changed: ${errorMessage(err)}`);
    } finally {
      setActing(false);
    }
  };

  const voidReward = async (rewardId: string) => {
    const reason = window.prompt("Why is this reward being withdrawn? (required)");
    if (!reason || !reason.trim() || !detail) return;
    setActing(true);
    setActionMessage(null);
    try {
      await operationalPost(`/api/admin/risk/rewards/${encodeURIComponent(rewardId)}/void`, { reason: reason.trim() });
      await lookUp(detail.playerId);
      setActionMessage("Reward withdrawn.");
    } catch (err) {
      setActionMessage(`Not withdrawn: ${errorMessage(err)}`);
    } finally {
      setActing(false);
    }
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Risk & Rewards"
        description="Accounts on a watch, accounts that look fed by others, and the levers to change a state or withdraw a pending reward. Every change is attributed and reversible except a withdrawn reward."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Risk & Rewards" }]}
        actions={
          <button type="button" onClick={() => void load()} disabled={loading} className={primary}>
            <span className="inline-flex items-center gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
              {loading ? "Refreshing..." : "Refresh"}
            </span>
          </button>
        }
      />

      {loadError && (
        <div role="alert" className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-bold text-rose-600 dark:text-rose-400">
          Risk data unavailable: {loadError}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard title="On watchlist" value={accounts ? String(counts.WATCHLIST ?? 0) : "—"} icon={<ShieldAlert className="h-5 w-5 text-amber-500" />} subtitle="Practice XP only, off the leaderboard" />
        <StatCard title="Restricted" value={accounts ? String(counts.RESTRICTED ?? 0) : "—"} icon={<ShieldAlert className="h-5 w-5 text-rose-500" />} subtitle="Slower rewards, cannot send coins" />
        <StatCard title="Under review" value={accounts ? String(counts.UNDER_REVIEW ?? 0) : "—"} icon={<ShieldAlert className="h-5 w-5 text-rose-500" />} subtitle="Rewards held, cannot send coins" />
      </div>

      <section aria-labelledby="lookup-heading" className="mb-8 rounded-2xl border border-[var(--chrome-border)] bg-[var(--chrome-panel)] p-4">
        <h2 id="lookup-heading" className="mb-3 text-sm font-black text-[var(--chrome-ink)]">Look up an account</h2>
        <form onSubmit={onSearch} className="flex flex-col gap-2 sm:flex-row">
          <label className="flex-1">
            <span className="sr-only">Player id</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Player id" className={field} />
          </label>
          <button type="submit" className={primary}>
            <span className="inline-flex items-center gap-1.5"><Search className="h-3.5 w-3.5" aria-hidden="true" />Look up</span>
          </button>
        </form>
        {lookupError && <p role="alert" className="mt-3 text-xs font-bold text-rose-600 dark:text-rose-400">{lookupError}</p>}

        {detail && (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-mono font-bold text-[var(--chrome-ink)]">{detail.playerId}</span>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 font-bold text-amber-700 dark:text-amber-300">{detail.state}</span>
              <span className="text-[var(--chrome-ink-soft)]">Trust tier {detail.trust.tier} of 4</span>
              {detail.record && <span className="text-[var(--chrome-ink-soft)]">set by {detail.record.updatedBy}</span>}
            </div>

            <ul className="space-y-1 text-xs text-[var(--chrome-ink-soft)]">
              {detail.trust.reasons.map((r) => (
                <li key={r.label}>{r.met ? "Met" : "Not yet"} — {r.label} ({r.detail})</li>
              ))}
            </ul>

            <div className="rounded-xl border border-[var(--chrome-border)] p-3">
              <h3 className="mb-2 text-xs font-black text-[var(--chrome-ink)]">Change state</h3>
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="sm:w-48">
                  <span className="sr-only">New state</span>
                  <select value={nextState} onChange={(e) => setNextState(e.target.value as RiskState)} className={field}>
                    {STATES.map((s) => (<option key={s} value={s}>{s}</option>))}
                  </select>
                </label>
                <label className="flex-1">
                  <span className="sr-only">Note</span>
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={200}
                    placeholder={noteRequired ? "Why (required)" : "Note (optional)"}
                    className={field}
                  />
                </label>
                <button type="button" onClick={() => void applyState()} disabled={!canApply} className={primary}>Apply</button>
              </div>
              {actionMessage && <p role="status" className="mt-2 text-xs font-bold text-[var(--chrome-ink)]">{actionMessage}</p>}
            </div>

            <div>
              <h3 className="mb-2 text-xs font-black text-[var(--chrome-ink)]">Recent rewards</h3>
              {detail.rewards.length === 0 ? (
                <p className="text-xs text-[var(--chrome-ink-soft)]">No rewards on record.</p>
              ) : (
                <ul className="space-y-2">
                  {detail.rewards.map((r) => (
                    <li key={r.rewardId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--chrome-border)] p-2.5 text-xs">
                      <span className="text-[var(--chrome-ink)]">{r.amount} coins — {r.description || r.rewardType} — <strong>{r.status}</strong></span>
                      {r.status === "PENDING" && (
                        <button type="button" onClick={() => void voidReward(r.rewardId)} disabled={acting} className={button}>Withdraw</button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-xs font-black text-[var(--chrome-ink)]">Recent events</h3>
              {detail.events.length === 0 ? (
                <p className="text-xs text-[var(--chrome-ink-soft)]">No events on record.</p>
              ) : (
                <ul className="space-y-1 text-xs text-[var(--chrome-ink-soft)]">
                  {detail.events.map((e, i) => (
                    <li key={`${e.createdAt}-${i}`}>{new Date(e.createdAt).toLocaleString()} — {e.kind} ({e.reasonCode})</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="flagged-heading" className="mb-8">
        <h2 id="flagged-heading" className="mb-3 text-sm font-black text-[var(--chrome-ink)]">Flagged accounts</h2>
        {accounts === null ? (
          <p className="text-xs text-[var(--chrome-ink-soft)]">{loading ? "Loading…" : "Not loaded."}</p>
        ) : accounts.length === 0 ? (
          <p className="text-xs text-[var(--chrome-ink-soft)]">No account is on a watch or restricted.</p>
        ) : (
          <ul className="space-y-2">
            {accounts.map((a) => (
              <li key={a.playerId}>
                <button type="button" onClick={() => void lookUp(a.playerId)} className={`${button} flex w-full items-center justify-between gap-3 text-left`}>
                  <span className="font-mono">{a.playerId}</span>
                  <span>{a.state} · {a.reasonCodes.join(", ")} · {new Date(a.updatedAt).toLocaleDateString()}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="collusion-heading">
        <h2 id="collusion-heading" className="mb-1 flex items-center gap-2 text-sm font-black text-[var(--chrome-ink)]">
          <Users className="h-4 w-4 text-amber-500" aria-hidden="true" />Looks fed by other accounts
        </h2>
        <p className="mb-3 text-xs text-[var(--chrome-ink-soft)]">
          A report, not a verdict. Friends who play each other a lot are normal; this lists only lopsided, concentrated pairs over the last week.
        </p>
        {findings === null ? (
          <p className="text-xs text-[var(--chrome-ink-soft)]">{loading ? "Loading…" : "Not loaded."}</p>
        ) : findings.length === 0 ? (
          <p className="text-xs text-[var(--chrome-ink-soft)]">Nothing looks one-sided right now.</p>
        ) : (
          <ul className="space-y-3">
            {findings.map((f) => (
              <li key={f.beneficiaryId} className="rounded-xl border border-[var(--chrome-border)] bg-[var(--chrome-panel)] p-3 text-xs">
                <p className="text-[var(--chrome-ink)]">{f.summary}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={() => void lookUp(f.beneficiaryId)} className={button}>Open {f.beneficiaryId}</button>
                  {f.feeders.map((x) => (
                    <button key={x.playerId} type="button" onClick={() => void lookUp(x.playerId)} className={button}>
                      Open {x.playerId} ({x.matches} games, {Math.round(x.concentration * 100)}% against it)
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminLayout>
  );
}
