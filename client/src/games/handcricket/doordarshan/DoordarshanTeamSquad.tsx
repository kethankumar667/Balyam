import { useMemo } from "react";
import type { HcState, HcTeamId, Player } from "@shared/types";
import { HC_COUNTRIES, HC_FRANCHISES, type HcPlayerProfile } from "@shared/hc-rosters";
import { getSocket } from "../../../lib/socket";
import { useHcSquad } from "../useHcSquad";
import { DD, DoordarshanScreen, DdButton, DdChip, DdMeter, DdLabel } from "./doordarshan-kit";

const COUNTRY_LIST = [
  "india", "australia", "england", "newzealand", "southafrica",
  "pakistan", "westindies", "srilanka", "bangladesh", "afghanistan",
  "ireland", "zimbabwe",
] as const;
const FRANCHISE_LIST = ["csk", "mi", "rcb", "kkr", "srh", "dc", "pbks", "rr", "gt", "lsg"] as const;

const ROLE_LABEL: Record<HcPlayerProfile["role"], string> = { batter: "BAT", keeper: "WK", allrounder: "AR", bowler: "BWL" };

export function DoordarshanTeamPicker({ state, selfId, players }: { state: HcState; selfId: string; players: Player[] }) {
  const oppId = state.playerOrder.find((id) => id !== selfId)!;
  const oppPick = state.teamSelections[oppId]?.teamId ?? null;
  const oppName = players.find((p) => p.id === oppId)?.name ?? "Opponent";
  const isIpl = state.options.category === "ipl";
  const list = isIpl ? FRANCHISE_LIST : COUNTRY_LIST;

  function pick(teamId: HcTeamId) {
    getSocket().emit("game:move", { type: "selectTeam", data: { teamId } });
  }

  return (
    <DoordarshanScreen className="space-y-3">
      <div className="text-center font-typewriter text-[15px]" style={{ color: DD.ink }}>
        {isIpl ? "Select your franchise" : "Select your side"}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {list.map((id) => {
          const meta = isIpl ? HC_FRANCHISES[id as keyof typeof HC_FRANCHISES] : HC_COUNTRIES[id as keyof typeof HC_COUNTRIES];
          const isOpp = oppPick === id;
          return (
            <button
              key={id}
              onClick={() => pick(id as HcTeamId)}
              className="relative rounded p-3 flex flex-col items-center gap-1 transition hover:brightness-110"
              style={{ background: "rgba(232,198,140,0.05)", border: `1px solid ${DD.line}` }}
            >
              <div className="font-crt text-[20px]" style={{ color: DD.amber }}>{meta.short}</div>
              <span className="font-typewriter text-[10px] text-center leading-tight" style={{ color: DD.inkMid }}>{meta.name}</span>
              {isOpp && (
                <span className="absolute top-1 left-1 font-crt text-[10px] px-1 rounded-sm" style={{ background: DD.teal, color: "#0A0705" }}>
                  {oppName}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </DoordarshanScreen>
  );
}

function SquadCard({
  p, isSelected, isCaptain, isVC, onToggle, onCaptain, onVC, disabled,
}: {
  p: HcPlayerProfile; isSelected: boolean; isCaptain: boolean; isVC: boolean;
  onToggle: () => void; onCaptain: () => void; onVC: () => void; disabled: boolean;
}) {
  return (
    <div
      onClick={() => { if (!disabled || isSelected) onToggle(); }}
      className="relative rounded px-2.5 py-2 cursor-pointer transition"
      style={{
        background: isSelected ? "rgba(217,138,61,0.14)" : "rgba(232,198,140,0.04)",
        border: `1px solid ${isSelected ? DD.amber : DD.line}`,
        opacity: disabled && !isSelected ? 0.4 : 1,
      }}
    >
      <span className="font-crt text-[11px]" style={{ color: DD.teal }}>{ROLE_LABEL[p.role]}</span>
      <div className="font-typewriter text-[11px] mt-0.5 leading-tight truncate" style={{ color: DD.ink }}>{p.name}</div>
      {isSelected && (
        <div className="flex gap-1 mt-1.5">
          <button onClick={(e) => { e.stopPropagation(); onCaptain(); }} className="font-crt text-[11px] px-1.5 rounded-sm" style={{ background: isCaptain ? DD.amber : "rgba(217,138,61,0.12)", color: isCaptain ? "#1A0F04" : DD.amber, border: `1px solid ${DD.amber}` }}>C</button>
          <button onClick={(e) => { e.stopPropagation(); onVC(); }} className="font-crt text-[11px] px-1.5 rounded-sm" style={{ background: isVC ? DD.teal : "rgba(74,140,130,0.12)", color: isVC ? "#0A0705" : DD.teal, border: `1px solid ${DD.teal}` }}>VC</button>
        </div>
      )}
    </div>
  );
}

export function DoordarshanSquadPicker({ state, selfId, onChangeTeam }: { state: HcState; selfId: string; onChangeTeam: () => void }) {
  const m = useHcSquad(state, selfId);
  const oppId = state.playerOrder.find((id) => id !== selfId)!;
  const oppSelection = state.teamSelections[oppId];

  if (!m) return <DoordarshanScreen className="text-center text-sm">Roster unavailable.</DoordarshanScreen>;

  return (
    <DoordarshanScreen className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-typewriter text-[15px]" style={{ color: DD.ink }}>{m.teamName} — Playing XI</div>
        <DdButton variant="ghost" onClick={onChangeTeam} className="!px-2.5 !py-1 !text-[11px]">Change</DdButton>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="font-crt text-[13px]" style={{ color: DD.inkMid }}>{m.selected.size}/11</span>
        <DdChip tone={m.composition.keepers >= 1 ? "win" : "neutral"}>WK {m.composition.keepers}</DdChip>
        <DdChip tone={m.composition.bowlingOptions >= 4 ? "win" : "neutral"}>BWL {m.composition.bowlingOptions}/4</DdChip>
      </div>
      <DdMeter value={m.selected.size} max={11} label="XI selected" valueText={`${m.selected.size} of 11`} />

      <div>
        <DdLabel className="mb-1.5">PLAYING XI</DdLabel>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(108px, 1fr))" }}>
          {m.xi.map((p) => (
            <SquadCard key={p.id} p={p} isSelected isCaptain={m.captainId === p.id} isVC={m.viceCaptainId === p.id} onToggle={() => m.toggle(p.id)} onCaptain={() => m.setCaptain(p.id)} onVC={() => m.setViceCaptain(p.id)} disabled={false} />
          ))}
        </div>
      </div>

      {m.bench.length > 0 && (
        <div>
          <DdLabel className="mb-1.5">RESERVES</DdLabel>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(108px, 1fr))" }}>
            {m.bench.map((p) => (
              <SquadCard key={p.id} p={p} isSelected={false} isCaptain={false} isVC={false} onToggle={() => m.toggle(p.id)} onCaptain={() => {}} onVC={() => {}} disabled={m.selected.size >= 11} />
            ))}
          </div>
        </div>
      )}

      {m.legendsBench.length > 0 && (
        <div>
          <DdLabel className="mb-1.5">ARCHIVE XI</DdLabel>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(108px, 1fr))" }}>
            {m.legendsBench.map((p) => (
              <SquadCard key={p.id} p={p} isSelected={false} isCaptain={false} isVC={false} onToggle={() => m.toggle(p.id)} onCaptain={() => {}} onVC={() => {}} disabled={m.selected.size >= 11} />
            ))}
          </div>
        </div>
      )}

      <DdButton variant="primary" disabled={!m.canConfirm} onClick={m.confirm} className="w-full">
        {!m.canConfirm
          ? m.selected.size !== 11 ? `Select ${11 - m.selected.size} more` : !m.captainId || !m.viceCaptainId ? "Pick captain & VC" : "Fix squad"
          : "Confirm XI"}
      </DdButton>

      <div className="text-center font-typewriter text-[11px]" style={{ color: DD.inkLo }}>
        {oppSelection?.squadPlayerIds ? "Opponent's XI is set" : oppSelection?.teamId ? "Opponent selecting XI…" : "Opponent selecting a side…"}
      </div>
    </DoordarshanScreen>
  );
}

export function DoordarshanWaiting({ state, selfId, players }: { state: HcState; selfId: string; players: Player[] }) {
  const oppId = state.playerOrder.find((id) => id !== selfId)!;
  const oppSelection = state.teamSelections[oppId];
  const oppName = players.find((p) => p.id === oppId)?.name ?? "Opponent";
  const teamId = state.teamSelections[selfId]?.teamId;
  const meta = useMemo(() => {
    if (!teamId) return null;
    return (HC_COUNTRIES as Record<string, { name: string } | undefined>)[teamId] ?? (HC_FRANCHISES as Record<string, { name: string } | undefined>)[teamId] ?? null;
  }, [teamId]);

  return (
    <DoordarshanScreen className="text-center space-y-2">
      <div className="font-typewriter text-[16px]" style={{ color: DD.ink }}>{meta?.name ?? "Your side"}</div>
      <div className="font-crt text-[13px]" style={{ color: DD.inkMid }}>
        XI SET · {state.teamSelections[selfId]?.squadPlayerIds?.length ?? 0} PLAYERS
      </div>
      <div className="font-typewriter text-[13px]" style={{ color: DD.ink }}>
        Standing by for {oppName}{oppSelection?.teamId ? " to set their XI…" : " to select a side…"}
      </div>
    </DoordarshanScreen>
  );
}
