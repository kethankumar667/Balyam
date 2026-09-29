import { logger } from "../lib/logger.js";
import {
  ABNORMAL_SESSIONS_FOR_WATCHLIST,
  ABNORMAL_WINDOW_MS,
} from "./SessionRules.js";
import {
  REASON,
  type ReasonCode,
  type RiskEventRecord,
  type RiskState,
  type RiskStateRecord,
} from "./types.js";

/**
 * Where each account stands: NORMAL, WATCHLIST, RESTRICTED or UNDER_REVIEW.
 *
 * ── What moves an account, and what never does ─────────────────────────
 *   NORMAL -> WATCHLIST          automatic, after repeated abnormal sessions
 *   WATCHLIST -> NORMAL          automatic, when a system-set watch goes quiet
 *   anything -> anything         an operator, with a reason, audited
 *   NORMAL/WATCHLIST -> worse    NEVER automatic
 *
 * A machine may quietly stop paying XP. Holding a person's coins is a human
 * decision, made with the evidence in front of them and reversible the moment
 * they are wrong. Nothing here is a ban and nothing is permanent.
 *
 * ── What each state does (enforced by the callers, listed here once) ────
 *   NORMAL        everything on
 *   WATCHLIST     XP is practice-only; off the leaderboard; no notice sent
 *   RESTRICTED    coin rewards vest longer; transfers off; visible to the player
 *   UNDER_REVIEW  coin rewards and claims paused; transfers off; appealable
 *
 * ── Durability ────────────────────────────────────────────────────────
 * The map answers reads synchronously (a match finishing must not wait on a
 * database); every change is written through to `account_risk` and appended to
 * `risk_events`, and `hydrate` rebuilds the map at boot. Operator changes are
 * awaited so a failed write is an error the operator sees; the automatic rule is
 * write-behind, because it fires inside the match-finish path.
 */

export interface RiskPersistence {
  upsertRiskState(record: RiskStateRecord): Promise<void>;
  appendRiskEvent(event: RiskEventRecord): Promise<void>;
}

/** A watch the system set expires after this long without a fresh abnormal session. */
export const WATCHLIST_QUIET_EXPIRY_MS = 7 * 24 * 60 * 60 * 1_000;

const SYSTEM_ACTOR = "system";

export class RiskService {
  private states = new Map<string, RiskStateRecord>();
  private abnormal = new Map<string, number[]>();
  private store: RiskPersistence | null = null;

  attachStore(store: RiskPersistence | null): void {
    this.store = store;
  }

  /** Rebuilds memory from the durable store at boot. */
  hydrate(states: readonly RiskStateRecord[], recentAbnormalEvents: readonly RiskEventRecord[]): void {
    for (const s of states) this.states.set(s.playerId, { ...s, reasonCodes: [...s.reasonCodes] });
    for (const e of recentAbnormalEvents) {
      if (e.kind !== "ABNORMAL_SESSION") continue;
      const list = this.abnormal.get(e.playerId) ?? [];
      list.push(e.createdAt);
      this.abnormal.set(e.playerId, list);
    }
  }

  getState(playerId: string): RiskState {
    return this.states.get(playerId)?.state ?? "NORMAL";
  }

  getRecord(playerId: string): RiskStateRecord | undefined {
    const r = this.states.get(playerId);
    return r ? { ...r, reasonCodes: [...r.reasonCodes] } : undefined;
  }

  /** Every account that is not NORMAL, for the admin console. */
  listNonNormal(): RiskStateRecord[] {
    return [...this.states.values()]
      .filter((r) => r.state !== "NORMAL")
      .map((r) => ({ ...r, reasonCodes: [...r.reasonCodes] }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Set an account's state. The caller is a person; `reasonCodes` and `actor`
   * are required so the audit trail can always answer "who, and why".
   */
  async setState(
    playerId: string,
    state: RiskState,
    detail: { reasonCodes: string[]; actor: string; note?: string },
    now: number = Date.now(),
  ): Promise<RiskStateRecord> {
    const previous = this.getState(playerId);
    const record: RiskStateRecord = {
      playerId,
      state,
      reasonCodes: [...detail.reasonCodes],
      updatedAt: now,
      updatedBy: detail.actor,
    };
    // Persist first: if the store refuses, memory must not claim a state the
    // database never recorded, and the operator must see the failure.
    if (this.store) {
      await this.store.upsertRiskState(record);
      await this.store.appendRiskEvent({
        playerId,
        kind: "STATE_CHANGED",
        reasonCode: detail.reasonCodes[0] ?? REASON.OPERATOR_SET,
        detail: { from: previous, to: state, actor: detail.actor, note: detail.note ?? null },
        createdAt: now,
      });
    }
    this.states.set(playerId, record);
    return this.getRecord(playerId)!;
  }

  /**
   * One session that could not have been played by a person. Called from the
   * match-finish path, so it is synchronous and never throws. Three inside a day
   * put a NORMAL account on WATCHLIST — and that is as far as a machine goes.
   */
  recordAbnormalSession(playerId: string, code: ReasonCode, at: number, detail: Record<string, unknown> = {}): void {
    const recent = (this.abnormal.get(playerId) ?? []).filter((t) => at - t < ABNORMAL_WINDOW_MS);
    recent.push(at);
    this.abnormal.set(playerId, recent);

    this.writeBehind(
      this.store?.appendRiskEvent({ playerId, kind: "ABNORMAL_SESSION", reasonCode: code, detail, createdAt: at }),
    );

    if (recent.length >= ABNORMAL_SESSIONS_FOR_WATCHLIST && this.getState(playerId) === "NORMAL") {
      const record: RiskStateRecord = {
        playerId,
        state: "WATCHLIST",
        reasonCodes: [REASON.AUTO_ABNORMAL_SESSIONS, code],
        updatedAt: at,
        updatedBy: SYSTEM_ACTOR,
      };
      this.states.set(playerId, record);
      this.writeBehind(this.store?.upsertRiskState(record));
      this.writeBehind(
        this.store?.appendRiskEvent({
          playerId,
          kind: "STATE_CHANGED",
          reasonCode: REASON.AUTO_ABNORMAL_SESSIONS,
          detail: { from: "NORMAL", to: "WATCHLIST", actor: SYSTEM_ACTOR, sessions: recent.length },
          createdAt: at,
        }),
      );
    }
  }

  /**
   * Lets a watch the SYSTEM set lapse once it has been quiet for a week, so a
   * false positive heals without anyone noticing it was there. An operator's
   * decision is never expired by a timer.
   */
  expireStaleWatchlist(now: number = Date.now()): number {
    let cleared = 0;
    for (const record of [...this.states.values()]) {
      if (record.state !== "WATCHLIST" || record.updatedBy !== SYSTEM_ACTOR) continue;
      const lastAbnormal = Math.max(0, ...(this.abnormal.get(record.playerId) ?? []));
      if (now - Math.max(record.updatedAt, lastAbnormal) < WATCHLIST_QUIET_EXPIRY_MS) continue;
      const lapsed: RiskStateRecord = {
        playerId: record.playerId,
        state: "NORMAL",
        reasonCodes: ["WATCHLIST_QUIET_EXPIRY"],
        updatedAt: now,
        updatedBy: SYSTEM_ACTOR,
      };
      this.states.set(record.playerId, lapsed);
      this.writeBehind(this.store?.upsertRiskState(lapsed));
      this.writeBehind(
        this.store?.appendRiskEvent({
          playerId: record.playerId,
          kind: "STATE_CHANGED",
          reasonCode: "WATCHLIST_QUIET_EXPIRY",
          detail: { from: "WATCHLIST", to: "NORMAL", actor: SYSTEM_ACTOR },
          createdAt: now,
        }),
      );
      cleared += 1;
    }
    return cleared;
  }

  /** Test seam and account erasure. */
  forget(playerId: string): void {
    this.states.delete(playerId);
    this.abnormal.delete(playerId);
  }

  reset(): void {
    this.states.clear();
    this.abnormal.clear();
  }

  private writeBehind(pending: Promise<void> | undefined): void {
    pending?.catch((err) => {
      logger.error({ message: `Risk write failed: ${err instanceof Error ? err.message : String(err)}`, module: "RISK" });
    });
  }
}

export const riskService = new RiskService();
