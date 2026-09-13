import { useState } from "react";
import type { HcCountry, HcFranchise, HcState, Player } from "@shared/types";
import { HC_COUNTRIES, HC_FRANCHISES, type HcPlayerProfile } from "@shared/hc-rosters";
import { getSocket } from "../../../lib/socket";
import { useHcSquad } from "../useHcSquad";
import {
  CricbuzzButton,
  CricbuzzCard,
  CricbuzzChip,
  CricbuzzTeamBadge,
  IconBat,
} from "./cricbuzz-kit";

const COUNTRIES: HcCountry[] = [
  "india", "australia", "england", "southafrica", "newzealand",
  "pakistan", "westindies", "srilanka", "bangladesh", "afghanistan",
];

const FRANCHISES: HcFranchise[] = [
  "csk", "mi", "rcb", "kkr", "srh", "dc", "pbks", "rr", "gt", "lsg",
];

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    batter: "bg-[#E3F2FD] text-[#1565C0] border-[#90CAF9] dark:bg-[#13283E] dark:text-[#64B5F6]",
    bowler: "bg-[#E8F5E9] text-[#2E7D32] border-[#A5D6A7] dark:bg-[#10261E] dark:text-[#81C784]",
    keeper: "bg-[#F3E5F5] text-[#7B1FA2] border-[#CE93D8] dark:bg-[#28152D] dark:text-[#BA68C8]",
    allrounder: "bg-[#FFF8E1] text-[#F57F17] border-[#FFE082] dark:bg-[#2E2512] dark:text-[#FFD54F]",
  };

  const labels: Record<string, string> = {
    batter: "BAT",
    bowler: "BOWL",
    keeper: "WK",
    allrounder: "AR",
  };

  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-extrabold border uppercase tracking-wider ${styles[role] ?? styles.batter}`}>
      {labels[role] ?? "BAT"}
    </span>
  );
}

export function CricbuzzTeamPicker({
  state,
  selfId,
  players,
}: {
  state: HcState;
  selfId: string;
  players: Player[];
}) {
  const [tab, setTab] = useState<"international" | "franchise">("international");
  const [submitting, setSubmitting] = useState(false);

  const opponentId = state.playerOrder.find((id) => id !== selfId);
  const oppSelection = opponentId ? state.teamSelections[opponentId]?.teamId : null;

  function selectTeam(teamId: string) {
    if (submitting) return;
    setSubmitting(true);
    getSocket().emit("game:move", { type: "selectTeam", data: { teamId } });
  }

  return (
    <div className="space-y-4">
      {/* Cricbuzz Subheader Tabs */}
      <div className="flex border-b border-[#E3E6E8] bg-white px-3 dark:border-[#2C3533] dark:bg-[#1B2220] rounded-t-lg">
        <button
          type="button"
          onClick={() => setTab("international")}
          className={`px-4 py-3 text-[13px] font-bold uppercase tracking-wider transition-colors border-b-2 ${
            tab === "international"
              ? "border-[#009270] text-[#009270] dark:text-[#00B38A]"
              : "border-transparent text-[#666666] hover:text-[#222222] dark:text-[#9E9E9E]"
          }`}
        >
          ICC International Teams
        </button>
        <button
          type="button"
          onClick={() => setTab("franchise")}
          className={`px-4 py-3 text-[13px] font-bold uppercase tracking-wider transition-colors border-b-2 ${
            tab === "franchise"
              ? "border-[#009270] text-[#009270] dark:text-[#00B38A]"
              : "border-transparent text-[#666666] hover:text-[#222222] dark:text-[#9E9E9E]"
          }`}
        >
          T20 Franchise League
        </button>
      </div>

      {/* Team Cards Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tab === "international"
          ? COUNTRIES.map((id) => {
              const meta = HC_COUNTRIES[id];
              const isOpponent = oppSelection === id;
              return (
                <CricbuzzCard
                  key={id}
                  onClick={!isOpponent && !submitting ? () => selectTeam(id) : undefined}
                  className={`p-4 transition ${isOpponent ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CricbuzzTeamBadge short={meta.short} color="#009270" size="lg" />
                      <div>
                        <h3 className="font-bold text-[15px] text-[#222222] dark:text-white leading-tight">
                          {meta.name}
                        </h3>
                        <p className="text-[12px] text-[#666666] dark:text-[#A0A5A8] mt-0.5">
                          Official ICC Member
                        </p>
                      </div>
                    </div>
                    {isOpponent ? (
                      <CricbuzzChip tone="red" size="sm">Taken</CricbuzzChip>
                    ) : (
                      <CricbuzzButton size="sm" variant="outline">
                        Select
                      </CricbuzzButton>
                    )}
                  </div>
                </CricbuzzCard>
              );
            })
          : FRANCHISES.map((id) => {
              const meta = HC_FRANCHISES[id];
              const isOpponent = oppSelection === id;
              return (
                <CricbuzzCard
                  key={id}
                  onClick={!isOpponent && !submitting ? () => selectTeam(id) : undefined}
                  className={`p-4 transition ${isOpponent ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CricbuzzTeamBadge short={meta.short} color={meta.color} size="lg" />
                      <div>
                        <h3 className="font-bold text-[15px] text-[#222222] dark:text-white leading-tight">
                          {meta.name}
                        </h3>
                        <p className="text-[12px] text-[#666666] dark:text-[#A0A5A8] mt-0.5">
                          Indian T20 League
                        </p>
                      </div>
                    </div>
                    {isOpponent ? (
                      <CricbuzzChip tone="red" size="sm">Taken</CricbuzzChip>
                    ) : (
                      <CricbuzzButton size="sm" variant="outline">
                        Select
                      </CricbuzzButton>
                    )}
                  </div>
                </CricbuzzCard>
              );
            })}
      </div>
    </div>
  );
}

export function CricbuzzSquadPicker({
  state,
  selfId,
  onChangeTeam,
}: {
  state: HcState;
  selfId: string;
  onChangeTeam: () => void;
}) {
  const squad = useHcSquad(state, selfId);
  if (!squad || !squad.ok) return null;

  const s = squad;

  return (
    <div className="space-y-4">
      {/* Header Info Banner */}
      <CricbuzzCard className="p-4 flex flex-wrap items-center justify-between gap-3 border-l-4 border-l-[#009270]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[18px] font-black uppercase text-[#222222] dark:text-white">
              {s.teamName} — Playing XI
            </h2>
            <CricbuzzChip tone="green">{s.xi.length}/11 Selected</CricbuzzChip>
          </div>
          <p className="text-[12px] text-[#666666] dark:text-[#A0A5A8] mt-1">
            Tap a player to toggle in/out of the Playing XI. Make sure you have at least 1 WK, 3 BAT, and 3 BOWL.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <CricbuzzButton size="sm" variant="outline" onClick={onChangeTeam}>
            Change Team
          </CricbuzzButton>
          <CricbuzzButton
            size="sm"
            onClick={s.confirm}
            disabled={!s.canConfirm}
          >
            Confirm Playing XI
          </CricbuzzButton>
        </div>
      </CricbuzzCard>

      {/* Composition Validation Bar */}
      {!s.composition.isValid && (
        <div className="rounded-md bg-[#FFEBEE] p-3 text-[12px] font-bold text-[#C62828] border border-[#FFCDD2] dark:bg-[#2D1618] dark:text-[#EF5350] dark:border-[#B71C1C]">
          ⚠️ {s.composition.problems.join(" • ")}
        </div>
      )}

      {/* Playing XI Table */}
      <CricbuzzCard className="overflow-hidden">
        <div className="bg-[#035A46] px-4 py-2.5 text-[12px] font-bold uppercase tracking-wider text-white">
          Active Playing XI ({s.xi.length})
        </div>

        <div className="divide-y divide-[#E3E6E8] dark:divide-[#2C3533]">
          {s.xi.map((player, idx) => {
            const isCaptain = s.captainId === player.id;
            const isViceCaptain = s.viceCaptainId === player.id;
            const style = s.styleMap.get(player.name.toLowerCase());

            return (
              <div
                key={player.id}
                className="flex items-center justify-between p-3 hover:bg-[#F5F7F8] dark:hover:bg-[#151B19] transition"
              >
                <div className="flex items-center gap-3">
                  <span className="w-5 text-center font-mono text-[12px] font-bold text-[#888888]">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[14px] text-[#222222] dark:text-white">
                        {player.name}
                      </span>
                      {isCaptain && (
                        <span className="rounded bg-[#009270] px-1 py-0.2 text-[10px] font-extrabold text-white">
                          C
                        </span>
                      )}
                      {isViceCaptain && (
                        <span className="rounded bg-[#035A46] px-1 py-0.2 text-[10px] font-extrabold text-white">
                          VC
                        </span>
                      )}
                      <RoleBadge role={player.role} />
                    </div>
                    {style && (
                      <p className="text-[11px] text-[#777777] dark:text-[#888888]">
                        {style.battingStyle} {style.bowlingStyle ? `• ${style.bowlingStyle}` : ""}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => s.setCaptain(player.id)}
                    className={`rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                      isCaptain
                        ? "bg-[#009270] text-white"
                        : "bg-[#ECEEF2] text-[#555555] hover:bg-[#D0D4D9] dark:bg-[#2C3533] dark:text-[#CCCCCC]"
                    }`}
                  >
                    Captain
                  </button>
                  <button
                    type="button"
                    onClick={() => s.toggle(player.id)}
                    className="rounded bg-[#FFEBEE] px-2 py-1 text-[10px] font-bold text-[#C62828] hover:bg-[#FFCDD2] transition"
                  >
                    Bench
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </CricbuzzCard>

      {/* Bench Players Section */}
      {s.bench.length > 0 && (
        <CricbuzzCard className="overflow-hidden">
          <div className="bg-[#F5F7F8] px-4 py-2 text-[12px] font-bold uppercase tracking-wider text-[#666666] dark:bg-[#151B19] dark:text-[#A0A5A8] border-b border-[#E3E6E8] dark:border-[#2C3533]">
            Bench Reserves ({s.bench.length})
          </div>
          <div className="divide-y divide-[#E3E6E8] dark:divide-[#2C3533]">
            {s.bench.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-3 opacity-75 hover:opacity-100 hover:bg-[#F5F7F8] dark:hover:bg-[#151B19] transition"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[13px] text-[#333333] dark:text-[#DDDDDD]">
                    {player.name}
                  </span>
                  <RoleBadge role={player.role} />
                </div>
                <button
                  type="button"
                  onClick={() => s.toggle(player.id)}
                  className="rounded bg-[#E8F5E9] px-2.5 py-1 text-[11px] font-bold text-[#00796B] hover:bg-[#009270] hover:text-white transition"
                >
                  + Add to XI
                </button>
              </div>
            ))}
          </div>
        </CricbuzzCard>
      )}
    </div>
  );
}

export function CricbuzzWaiting({
  state,
  selfId,
  players,
}: {
  state: HcState;
  selfId: string;
  players: Player[];
}) {
  const opponentId = state.playerOrder.find((id) => id !== selfId);
  const oppName = opponentId ? players.find((p) => p.id === opponentId)?.name ?? "Opponent" : "Opponent";

  return (
    <div className="mx-auto max-w-lg space-y-4 pt-4">
      <CricbuzzCard className="overflow-hidden border-t-4 border-t-[#009270] p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#E8F5E9] text-[#009270] dark:bg-[#10261E] dark:text-[#00B38A] shadow-xs">
          <IconBat size={24} />
        </div>

        <h2 className="text-[18px] font-black uppercase text-[#222222] dark:text-white">
          Playing XI Locked & Ready!
        </h2>
        <p className="mt-1 text-[13px] text-[#666666] dark:text-[#A0A5A8]">
          Waiting for {oppName} to finalize their Playing XI before the toss.
        </p>

        <div className="mt-5 flex items-center justify-center gap-2 rounded-md bg-[#F5F7F8] p-3 text-[12px] font-semibold text-[#555555] dark:bg-[#151B19] dark:text-[#A0A5A8]">
          <span className="h-2 w-2 animate-ping rounded-full bg-[#009270]" />
          <span>Match referee setting up the toss...</span>
        </div>
      </CricbuzzCard>
    </div>
  );
}
