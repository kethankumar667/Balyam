import type { HcBall, HcState, Player } from "@shared/types";
import { HC_MAX_OVERS_PER_BOWLER } from "@shared/types";
import { getSocket } from "../../../lib/socket";
import { resolveTeamProfiles } from "../useHcSquad";
import { oversFromBalls, strikeRate, economy, currentPartnership, fallOfWickets } from "../hc-stats";
import {
  DD, DoordarshanScreen, DdStat, DdLabel, DdChip, DdMeter,
  ddSideFor, DdAvatar, IconFlame,
} from "./doordarshan-kit";

function nameOf(players: Player[], id: string): string {
  return players.find((p) => p.id === id)?.name ?? "Player";
}

function ballGlyph(b: HcBall): { text: string; tone: "neutral" | "amber" | "loss" } {
  if (b.wicket) return { text: "W", tone: "loss" };
  if (b.runs === 0) return { text: "•", tone: "neutral" };
  if (b.isBoundary) return { text: String(b.runs), tone: "amber" };
  return { text: String(b.runs), tone: "neutral" };
}

export function DoordarshanInnings({
  state, selfId, players, compact, registerCardRef,
}: {
  state: HcState; selfId: string; players: Player[]; compact: boolean;
  registerCardRef?: (playerId: string) => (el: HTMLElement | null) => void;
}) {
  const innings = state.phase === "innings1" ? state.innings1 : state.innings2;
  if (!innings) return null;

  const isBatting = innings.battingPlayerId === selfId;
  const isBowling = innings.bowlingPlayerId === selfId;
  const battingProfiles = resolveTeamProfiles(state, innings.battingPlayerId);
  const bowlingProfiles = resolveTeamProfiles(state, innings.bowlingPlayerId);
  const battingXiIds = state.teamSelections[innings.battingPlayerId]?.squadPlayerIds ?? [];
  const bowlingXiIds = state.teamSelections[innings.bowlingPlayerId]?.squadPlayerIds ?? [];

  const strikerId = battingXiIds[innings.strikerIdx];
  const nonStrikerId = battingXiIds[innings.nonStrikerIdx];
  const strikerName = strikerId ? battingProfiles.get(strikerId)?.name ?? "Batter" : "—";
  const nonStrikerName = nonStrikerId ? battingProfiles.get(nonStrikerId)?.name ?? "Batter" : "—";
  const strikerStats = strikerId ? innings.batterStats[strikerId] : undefined;
  const nonStrikerStats = nonStrikerId ? innings.batterStats[nonStrikerId] : undefined;

  const bowlerId = innings.currentBowlerId;
  const bowlerName = bowlerId ? bowlingProfiles.get(bowlerId)?.name ?? "Bowler" : "—";
  const bowlerStats = bowlerId ? innings.bowlerStats[bowlerId] : undefined;

  const target = state.phase === "innings2" && state.innings1 ? state.innings1.runs + 1 : null;
  const needRuns = target != null ? Math.max(0, target - innings.runs) : null;
  const ballsLeft = innings.overs * 6 - innings.balls;

  const currentOver = Math.floor(innings.balls / 6) + 1;
  const isPowerplayOver = (innings.restrictedBallsByOver[currentOver]?.length ?? 0) > 0;
  const partnership = currentPartnership(innings);
  const recent = innings.history.slice(-12);

  return (
    <div className={compact ? "space-y-3" : "grid gap-4 lg:grid-cols-[1fr_320px]"}>
      <div className="space-y-3 min-w-0">
        {/* The analog scorebug. */}
        <DoordarshanScreen glow>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <DdStat
              label={`${nameOf(players, innings.battingPlayerId).toUpperCase()} BATTING`}
              value={`${innings.runs}-${innings.wickets}`}
              sub={`OV ${oversFromBalls(innings.balls)} / ${innings.overs}`}
              size="xl"
            />
            {target != null ? (
              <DdStat label="NEED" value={`${needRuns} / ${ballsLeft}B`} sub={`TARGET ${target}`} size="lg" accent={DD.amber} align="right" />
            ) : (
              <DdStat label="OVER" value={`${currentOver}`} size="lg" align="right" />
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {isPowerplayOver && (
              <DdChip tone="amber"><IconFlame size={11} /> POWERPLAY</DdChip>
            )}
            <DdChip>{partnership.runs} STAND ({partnership.balls}B)</DdChip>
          </div>
        </DoordarshanScreen>

        <div className="grid grid-cols-2 gap-2.5">
          <DoordarshanScreen dense>
            <DdLabel className="mb-1.5">AT THE CREASE</DdLabel>
            <div className="space-y-1.5">
              <PlayerLine name={strikerName} id={strikerId} runs={strikerStats?.runs ?? 0} balls={strikerStats?.balls ?? 0} sideIdx={isBatting ? 0 : 1} onCard={registerCardRef} striker />
              <PlayerLine name={nonStrikerName} id={nonStrikerId} runs={nonStrikerStats?.runs ?? 0} balls={nonStrikerStats?.balls ?? 0} sideIdx={isBatting ? 0 : 1} onCard={registerCardRef} />
            </div>
          </DoordarshanScreen>
          <DoordarshanScreen dense>
            <DdLabel className="mb-1.5">BOWLING</DdLabel>
            {bowlerId ? (
              <div className="flex items-center gap-2" ref={registerCardRef?.(innings.bowlingPlayerId)}>
                <DdAvatar name={bowlerName} side={ddSideFor(isBowling ? 0 : 1)} size={28} />
                <div className="min-w-0">
                  <div className="font-typewriter text-[12px] truncate" style={{ color: DD.ink }}>{bowlerName}</div>
                  <div className="font-crt text-[13px]" style={{ color: DD.inkLo }}>
                    {oversFromBalls(bowlerStats?.balls ?? 0)}-{bowlerStats?.runs ?? 0}-{bowlerStats?.wickets ?? 0}
                    {" "}ECON {economy(bowlerStats?.runs ?? 0, bowlerStats?.balls ?? 0)?.toFixed(1) ?? "—"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="font-typewriter text-[12px]" style={{ color: DD.inkLo }}>Selecting bowler…</div>
            )}
          </DoordarshanScreen>
        </div>

        {recent.length > 0 && (
          <DoordarshanScreen dense>
            <DdLabel className="mb-1.5">THIS OVER</DdLabel>
            <div className="flex flex-wrap gap-1.5">
              {recent.map((b, i) => {
                const g = ballGlyph(b);
                return <DdChip key={i} tone={g.tone}>{g.text}</DdChip>;
              })}
            </div>
          </DoordarshanScreen>
        )}

        {bowlerId == null && isBowling ? (
          <BowlerPicker innings={innings} bowlingProfiles={bowlingProfiles} bowlingXiIds={bowlingXiIds} format={state.options.format} />
        ) : innings.needsNextBatterPick && isBatting ? (
          <NextBatterPicker innings={innings} battingProfiles={battingProfiles} battingXiIds={battingXiIds} nonStrikerId={nonStrikerId} />
        ) : bowlerId != null ? (
          <HandPickRow state={state} innings={innings} selfId={selfId} isBatting={isBatting} isBowling={isBowling} isRestricted={!!innings.restrictedBallsByOver[currentOver]?.includes((innings.balls % 6) + 1)} />
        ) : null}
      </div>

      {!compact && (
        <RightRail innings={innings} target={target} battingProfiles={battingProfiles} bowlingProfiles={bowlingProfiles} />
      )}
    </div>
  );
}

/**
 * The stats rail Broadcast's HcProInnings already carries (run rate, fall of
 * wickets, every bowler's figures) — Doordarshan originally shipped with
 * only a single "score progress" meter here, which left a large empty gap
 * below it on any real viewport and read as unfinished next to Broadcast's
 * equivalent screen. Same underlying data (hc-stats.ts), themed to match.
 */
function RightRail({
  innings, target, battingProfiles, bowlingProfiles,
}: {
  innings: NonNullable<HcState["innings1"]>;
  target: number | null;
  battingProfiles: Map<string, { id: string; name: string }>;
  bowlingProfiles: Map<string, { id: string; name: string }>;
}) {
  const runRate = economy(innings.runs, innings.balls);
  const fow = fallOfWickets(innings);
  const bowlersUsed = Object.entries(innings.bowlerStats).filter(([, s]) => s.balls > 0);

  return (
    <div className="space-y-3">
      <DoordarshanScreen dense>
        <DdLabel className="mb-1.5">RUN RATE</DdLabel>
        <div className="flex items-end justify-between gap-3">
          <DdStat label="CURRENT" value={runRate?.toFixed(2) ?? "—"} size="md" />
          {target != null && (
            <DdStat
              label="REQUIRED"
              value={
                innings.overs * 6 - innings.balls > 0
                  ? (Math.max(0, target - innings.runs) / ((innings.overs * 6 - innings.balls) / 6)).toFixed(2)
                  : "—"
              }
              size="md"
              accent={DD.amber}
              align="right"
            />
          )}
        </div>
        <div className="mt-2">
          <DdMeter value={innings.runs} max={Math.max(innings.runs, target ?? innings.runs + 1)} label="Score progress" valueText={`${innings.runs} runs`} />
        </div>
      </DoordarshanScreen>

      <DoordarshanScreen dense>
        <DdLabel className="mb-1.5">FALL OF WICKETS</DdLabel>
        {fow.length === 0 ? (
          <div className="font-typewriter text-[12px]" style={{ color: DD.inkLo }}>No wickets down.</div>
        ) : (
          <div className="space-y-1">
            {fow.map((w, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <span className="font-crt text-[14px]" style={{ color: DD.amber }}>{w.wicket}-{w.score}</span>
                <span className="font-typewriter min-w-0 flex-1 truncate text-right text-[11px]" style={{ color: DD.inkMid }}>
                  {battingProfiles.get(w.batterId)?.name ?? "Batter"} ({w.over})
                </span>
              </div>
            ))}
          </div>
        )}
      </DoordarshanScreen>

      <DoordarshanScreen dense>
        <DdLabel className="mb-1.5">BOWLING FIGURES</DdLabel>
        {bowlersUsed.length === 0 ? (
          <div className="font-typewriter text-[12px]" style={{ color: DD.inkLo }}>No overs bowled yet.</div>
        ) : (
          <div className="space-y-1">
            {bowlersUsed.map(([id, s]) => (
              <div key={id} className="flex items-center justify-between gap-2">
                <span className="font-typewriter min-w-0 flex-1 truncate text-[11px]" style={{ color: DD.ink }}>
                  {bowlingProfiles.get(id)?.name ?? "Bowler"}
                  {id === innings.currentBowlerId ? " *" : ""}
                </span>
                <span className="font-crt shrink-0 text-[13px]" style={{ color: DD.inkMid }}>
                  {oversFromBalls(s.balls)}-{s.runs}-{s.wickets}
                </span>
              </div>
            ))}
          </div>
        )}
      </DoordarshanScreen>
    </div>
  );
}

function PlayerLine({
  name, id, runs, balls, sideIdx, onCard, striker,
}: {
  name: string; id: string | undefined; runs: number; balls: number; sideIdx: number;
  onCard?: (playerId: string) => (el: HTMLElement | null) => void; striker?: boolean;
}) {
  return (
    <div className="flex items-center gap-2" ref={id ? onCard?.(id) : undefined}>
      <DdAvatar name={name} side={ddSideFor(sideIdx)} size={26} />
      <div className="min-w-0 flex-1">
        <div className="font-typewriter text-[12px] truncate" style={{ color: DD.ink }}>{name}{striker ? " *" : ""}</div>
        <div className="font-crt text-[13px]" style={{ color: DD.inkLo }}>
          {runs}({balls}) SR {strikeRate(runs, balls)?.toFixed(0) ?? "—"}
        </div>
      </div>
    </div>
  );
}

function BowlerPicker({
  innings, bowlingProfiles, bowlingXiIds, format,
}: {
  innings: NonNullable<HcState["innings1"]>;
  bowlingProfiles: Map<string, { id: string; name: string }>;
  bowlingXiIds: string[];
  format: HcState["options"]["format"];
}) {
  const cap = HC_MAX_OVERS_PER_BOWLER[format];
  function pick(playerId: string) {
    getSocket().emit("game:move", { type: "selectBowler", data: { playerId } });
  }
  return (
    <DoordarshanScreen className="space-y-2">
      <div className="font-typewriter text-[14px]" style={{ color: DD.ink }}>Select your bowler</div>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(116px, 1fr))" }}>
        {bowlingXiIds.map((id) => {
          if (id === innings.lastBowlerId) return null;
          const p = bowlingProfiles.get(id);
          const overs = (innings.bowlerStats[id]?.balls ?? 0) / 6;
          const maxed = cap != null && overs >= cap;
          return (
            <button key={id} onClick={() => !maxed && pick(id)} disabled={maxed} className="rounded px-2.5 py-2 text-left transition disabled:opacity-40" style={{ background: "rgba(232,198,140,0.04)", border: `1px solid ${DD.line}` }}>
              <div className="font-typewriter text-[12px] truncate" style={{ color: DD.ink }}>{p?.name ?? id}</div>
              <div className="font-crt text-[11px]" style={{ color: DD.inkLo }}>
                {oversFromBalls(innings.bowlerStats[id]?.balls ?? 0)} OV{cap != null ? ` / ${cap} MAX` : ""}
              </div>
            </button>
          );
        })}
      </div>
    </DoordarshanScreen>
  );
}

function NextBatterPicker({
  innings, battingProfiles, battingXiIds, nonStrikerId,
}: {
  innings: NonNullable<HcState["innings1"]>;
  battingProfiles: Map<string, { id: string; name: string }>;
  battingXiIds: string[];
  nonStrikerId: string | undefined;
}) {
  const eligible = battingXiIds.filter((id) => id !== nonStrikerId && !innings.batterStats[id]?.isOut);
  function pick(profileId: string) {
    getSocket().emit("game:move", { type: "selectNextBatter", data: { profileId } });
  }
  return (
    <DoordarshanScreen className="space-y-2">
      <div className="font-typewriter text-[14px]" style={{ color: DD.ink }}>Next man in</div>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(116px, 1fr))" }}>
        {eligible.map((id) => (
          <button key={id} onClick={() => pick(id)} className="rounded px-2.5 py-2 text-left transition" style={{ background: "rgba(232,198,140,0.04)", border: `1px solid ${DD.line}` }}>
            <div className="font-typewriter text-[12px] truncate" style={{ color: DD.ink }}>{battingProfiles.get(id)?.name ?? id}</div>
          </button>
        ))}
      </div>
    </DoordarshanScreen>
  );
}

function HandPickRow({
  state, innings, selfId, isBatting, isBowling, isRestricted,
}: {
  state: HcState; innings: NonNullable<HcState["innings1"]>; selfId: string;
  isBatting: boolean; isBowling: boolean; isRestricted: boolean;
}) {
  const myPick = state.pendingPicks[selfId];
  const oppId = isBatting ? innings.bowlingPlayerId : innings.battingPlayerId;
  const oppLockedIn = state.pendingPicks[oppId] != null;
  const canPlay = isBatting || isBowling;
  const options = isBowling && isRestricted ? [1, 2, 3] : [1, 2, 3, 4, 5, 6];

  function pick(n: number) {
    getSocket().emit("game:move", { type: "pick", data: { pick: n } });
  }

  if (!canPlay) {
    return <DoordarshanScreen className="text-center font-typewriter text-[12px]" style={{ color: DD.inkLo }}>Off air this over.</DoordarshanScreen>;
  }

  return (
    <DoordarshanScreen className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="font-typewriter text-[14px]" style={{ color: DD.ink }}>{isBatting ? "Your shot" : "Your delivery"}</span>
        {isRestricted && isBowling && <DdChip tone="amber">POWERPLAY: 1-3 ONLY</DdChip>}
      </div>
      {myPick == null ? (
        <div className="flex flex-wrap gap-2">
          {options.map((n) => (
            <button key={n} onClick={() => pick(n)} className="w-11 h-11 rounded font-crt text-[20px] transition hover:brightness-125 active:scale-95" style={{ background: DD.screen, border: `1px solid ${DD.line}`, color: DD.ink }}>
              {n}
            </button>
          ))}
        </div>
      ) : (
        <div className="font-typewriter text-[12px]" style={{ color: DD.inkMid }}>{oppLockedIn ? "Rolling tape…" : "Standing by for the other end…"}</div>
      )}
    </DoordarshanScreen>
  );
}
