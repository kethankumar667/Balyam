import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ChatMessage,
  HcBall,
  HcBatterStats,
  HcBowlerStats,
  HcCountry,
  HcFranchise,
  HcInnings,
  HcState,
  HcTeamId,
  Player,
} from "@shared/types";
import {
  HC_COUNTRIES,
  HC_FRANCHISES,
  evaluateSquadComposition,
  getRosterFor,
  type HcPlayerProfile,
} from "@shared/hc-rosters";
import { HC_MAX_OVERS_PER_BOWLER } from "@shared/types";
import { getSocket } from "../../lib/socket";
import InlineRoomRail from "../../components/InlineRoomRail";

const HAND_FACES = ["", "☝️", "✌️", "🤟", "🖖", "🖐️", "✊"];
const COUNTRY_LIST: HcCountry[] = [
  "india", "australia", "england", "newzealand", "southafrica",
  "pakistan", "westindies", "srilanka", "bangladesh", "afghanistan",
];
const FRANCHISE_LIST: HcFranchise[] = [
  "csk", "mi", "rcb", "kkr", "srh", "dc", "pbks", "rr", "gt", "lsg",
];

const ROLE_ORDER: Record<HcPlayerProfile["role"], number> = {
  batter: 0, keeper: 1, allrounder: 2, bowler: 3,
};

function teamLabel(state: HcState, playerId: string, players: Player[]): {
  flag: string;
  short: string;
  name: string;
  playerName: string;
  color?: string;
} {
  const teamId = state.teamSelections[playerId]?.teamId;
  const playerName = players.find((p) => p.id === playerId)?.name ?? "?";
  if (!teamId) return { flag: "❓", short: "?", name: "Choosing…", playerName };
  const country = (HC_COUNTRIES as Record<string, typeof HC_COUNTRIES.india | undefined>)[teamId];
  if (country) {
    return { flag: country.flag, short: country.short, name: country.name, playerName };
  }
  const franchise = (HC_FRANCHISES as Record<string, typeof HC_FRANCHISES.csk | undefined>)[teamId];
  if (franchise) {
    return {
      flag: "🏟️",
      short: franchise.short,
      name: franchise.name,
      playerName,
      color: franchise.color,
    };
  }
  return { flag: "🏳️", short: String(teamId).slice(0, 3).toUpperCase(), name: String(teamId), playerName };
}

export default function HandCricketBoard({
  state,
  players,
  selfId,
  messages,
  roomCode,
  roomPhase,
}: {
  state: HcState;
  players: Player[];
  selfId: string | null;
  messages: ChatMessage[];
  roomCode: string;
  roomPhase: string;
}) {
  if (!selfId) return null;

  return (
    <div
      className="rounded-2xl p-3 sm:p-4 space-y-3"
      style={{
        background: "radial-gradient(ellipse at 50% 30%, #14532d 0%, #052e16 80%)",
        border: "2px solid #166534",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      <MatchHeader state={state} players={players} selfId={selfId} />

      <InlineRoomRail
        code={roomCode}
        game="handcricket"
        phase={roomPhase}
        players={players}
        selfId={selfId}
        messages={messages}
      />

      {state.phase === "teamSelect" && (
        <TeamSelectPhase state={state} selfId={selfId} players={players} />
      )}

      {state.phase === "toss" && (
        <TossPhase state={state} selfId={selfId} players={players} />
      )}

      {state.phase === "tossChoice" && (
        <TossChoicePhase state={state} selfId={selfId} players={players} />
      )}

      {(state.phase === "innings1" || state.phase === "innings2") && (
        <InningsPhase state={state} selfId={selfId} players={players} />
      )}

      {state.phase === "finished" && (
        <MatchSummary state={state} players={players} selfId={selfId} />
      )}

      <HcCelebrationLayer state={state} players={players} selfId={selfId} />
    </div>
  );
}

function MatchHeader({
  state,
  players,
  selfId,
}: {
  state: HcState;
  players: Player[];
  selfId: string;
}) {
  const [p0, p1] = state.playerOrder;
  const t0 = teamLabel(state, p0, players);
  const t1 = teamLabel(state, p1, players);
  const formatLabel =
    state.options.format === "test" ? "Test · 30 overs"
    : state.options.format === "odi" ? "ODI · 15 overs"
    : "T20 · 10 overs";
  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-extrabold tracking-[0.2em] text-emerald-200 uppercase">🏏 Hand Cricket</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-700/60 text-amber-100 font-bold">
          {formatLabel}
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-700/60 text-cyan-100 font-bold">
          {state.options.category === "international" ? "International" : "IPL"}
        </span>
      </div>
      <div className="flex items-center gap-2 text-sm font-bold">
        <TeamChip flag={t0.flag} short={t0.short} playerName={t0.playerName} isSelf={p0 === selfId} />
        <span className="text-emerald-300 text-xs">vs</span>
        <TeamChip flag={t1.flag} short={t1.short} playerName={t1.playerName} isSelf={p1 === selfId} />
      </div>
    </div>
  );
}

function TeamChip({
  flag,
  short,
  playerName,
  isSelf,
}: {
  flag: string;
  short: string;
  playerName: string;
  isSelf: boolean;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
      style={{
        background: isSelf ? "rgba(252,211,77,0.25)" : "rgba(0,0,0,0.3)",
        border: `1px solid ${isSelf ? "#fbbf24" : "rgba(255,255,255,0.15)"}`,
        color: "#ecfdf5",
      }}
    >
      <span>{flag}</span>
      <span>{short}</span>
      <span className="opacity-70">({playerName})</span>
    </span>
  );
}

function TeamSelectPhase({
  state,
  selfId,
  players,
}: {
  state: HcState;
  selfId: string;
  players: Player[];
}) {
  const mySelection = state.teamSelections[selfId];
  // `forceTeamPicker` is local-only. Clicking "Change team" inside the squad
  // picker can't actually clear the server state (selectTeam expects a teamId
  // and re-emitting the same one wouldn't navigate anywhere). So we override
  // the view client-side and reset the override the instant the user picks a
  // team — letting the normal flow resume.
  const [forceTeamPicker, setForceTeamPicker] = useState(false);
  const prevTeamIdRef = useRef<string | null | undefined>(mySelection?.teamId);
  useEffect(() => {
    const prev = prevTeamIdRef.current;
    const next = mySelection?.teamId ?? null;
    if (forceTeamPicker && next && next !== prev) {
      setForceTeamPicker(false);
    }
    prevTeamIdRef.current = next;
  }, [mySelection?.teamId, forceTeamPicker]);

  // Two-step flow: pick team first, then pick squad.
  if (!mySelection?.teamId || forceTeamPicker) {
    return <TeamPicker state={state} selfId={selfId} players={players} />;
  }
  if (mySelection.squadPlayerIds == null) {
    return (
      <SquadPicker
        state={state}
        selfId={selfId}
        players={players}
        onChangeTeam={() => setForceTeamPicker(true)}
      />
    );
  }
  return <WaitingForOpponentSquad state={state} selfId={selfId} players={players} />;
}

function TeamPicker({
  state,
  selfId,
  players,
}: {
  state: HcState;
  selfId: string;
  players: Player[];
}) {
  const oppId = state.playerOrder.find((id) => id !== selfId)!;
  const oppPick = state.teamSelections[oppId]?.teamId ?? null;
  const oppName = players.find((p) => p.id === oppId)?.name ?? "Opponent";
  const isIpl = state.options.category === "ipl";

  function pick(teamId: HcTeamId) {
    getSocket().emit("game:move", { type: "selectTeam", data: { teamId } });
  }

  if (isIpl) {
    return (
      <div className="bg-emerald-950/50 rounded-lg p-4 space-y-3">
        <div className="text-center text-emerald-100 font-bold">
          Pick your IPL franchise (2026 season)
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {FRANCHISE_LIST.map((id) => {
            const f = HC_FRANCHISES[id];
            const isOpp = oppPick === id;
            return (
              <button
                key={id}
                onClick={() => pick(id)}
                className="relative rounded-lg p-3 border-2 transition flex flex-col items-center gap-1 border-slate-700 bg-slate-900/40 hover:scale-105"
                style={{
                  borderColor: oppPick === id ? "#06b6d4" : undefined,
                }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-extrabold"
                  style={{ background: f.color, color: "#fff", boxShadow: "0 2px 4px rgba(0,0,0,0.4)" }}
                >
                  {f.short}
                </div>
                <span className="text-xs font-bold text-slate-100 text-center leading-tight">
                  {f.name}
                </span>
                {isOpp && (
                  <span className="absolute top-1 left-1 text-[9px] bg-cyan-600 text-white rounded px-1 font-extrabold truncate max-w-[80%]">
                    {oppName}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="text-center text-xs text-emerald-300/80">
          Same franchise? No problem — we'll show it as{" "}
          <span className="text-amber-300">CSK(Kethan) vs CSK(Monica)</span>.
        </div>
      </div>
    );
  }

  // International country picker.
  return (
    <div className="bg-emerald-950/50 rounded-lg p-4 space-y-3">
      <div className="text-center text-emerald-100 font-bold">
        Pick the country you'll represent
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {COUNTRY_LIST.map((id) => {
          const profile = HC_COUNTRIES[id];
          const hasRoster = profile.squads[state.options.format].length > 0;
          const isOpp = oppPick === id;
          return (
            <button
              key={id}
              onClick={() => hasRoster && pick(id)}
              disabled={!hasRoster}
              className={`relative rounded-lg p-3 border-2 transition flex flex-col items-center gap-1 ${
                hasRoster
                  ? "border-slate-700 bg-slate-900/40 hover:border-emerald-400 hover:scale-105"
                  : "border-slate-800 bg-slate-900/20 opacity-50 cursor-not-allowed"
              }`}
            >
              <span className="text-3xl">{profile.flag}</span>
              <span className="text-xs font-bold text-slate-100">{profile.name}</span>
              <span className="text-[10px] text-slate-400">{profile.short}</span>
              {!hasRoster && (
                <span className="text-[9px] text-amber-300 italic">No roster yet</span>
              )}
              {isOpp && (
                <span className="absolute top-1 left-1 text-[9px] bg-cyan-600 text-white rounded px-1 font-extrabold truncate max-w-[60%]">
                  {oppName}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="text-center text-xs text-emerald-300/80">
        Same country? No problem — we'll show it as{" "}
        <span className="text-amber-300">India(Kethan) vs India(Monica)</span>.
      </div>
    </div>
  );
}

function SquadPicker({
  state,
  selfId,
  players,
  onChangeTeam,
}: {
  state: HcState;
  selfId: string;
  players: Player[];
  onChangeTeam: () => void;
}) {
  const mySelection = state.teamSelections[selfId];
  if (!mySelection?.teamId) return null;
  const myTeamId = mySelection.teamId;
  const roster = getRosterFor(myTeamId, state.options.format);
  if (!roster) return <div className="text-rose-300">Roster unavailable.</div>;

  const sortedSquad = useMemo(
    () => roster.squad.slice().sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]),
    [roster],
  );
  const sortedExtras = useMemo(
    () => roster.extras.slice().sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]),
    [roster],
  );
  // For lookup of a profile by id across both pools.
  const profilesById = useMemo(() => {
    const m = new Map<string, HcPlayerProfile>();
    for (const p of sortedSquad) m.set(p.id, p);
    for (const p of sortedExtras) m.set(p.id, p);
    return m;
  }, [sortedSquad, sortedExtras]);

  // Default XI = first 11 squad players in role order. Captain defaults to the
  // roster-tagged captain (if present in the picked XI); VC defaults to the
  // first all-rounder/batter who isn't the captain. Both are user-changeable.
  const [selected, setSelected] = useState<Set<string>>(() => {
    return new Set(sortedSquad.slice(0, 11).map((p) => p.id));
  });
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [viceCaptainId, setViceCaptainId] = useState<string | null>(null);

  // Auto-clear C/VC when the player is dropped from the XI.
  useEffect(() => {
    if (captainId && !selected.has(captainId)) setCaptainId(null);
    if (viceCaptainId && !selected.has(viceCaptainId)) setViceCaptainId(null);
  }, [selected, captainId, viceCaptainId]);

  // Seed captain/VC defaults once the XI is non-empty and nothing is picked yet.
  useEffect(() => {
    if (captainId || viceCaptainId) return;
    if (selected.size === 0) return;
    const inXI = [...selected]
      .map((id) => profilesById.get(id))
      .filter((p): p is HcPlayerProfile => !!p);
    const tagged = inXI.find((p) => p.isCaptain);
    const arOrBat = (p: HcPlayerProfile) => p.role === "allrounder" || p.role === "batter";
    const cap = tagged ?? inXI.find(arOrBat) ?? inXI[0];
    if (!cap) return;
    const vc = inXI.find((p) => p.id !== cap.id && arOrBat(p)) ?? inXI.find((p) => p.id !== cap.id);
    if (!vc) return;
    setCaptainId(cap.id);
    setViceCaptainId(vc.id);
  }, [selected, profilesById, captainId, viceCaptainId]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 11) next.add(id);
      return next;
    });
  }

  function changeTeam() {
    // The "Change team" button takes the player back to the country picker.
    // Driven by a parent-level UI override (see TeamSelectPhase) since
    // selectTeam can't actually clear teamId on the server.
    onChangeTeam();
  }

  function confirm() {
    if (selected.size !== 11) return;
    if (!captainId || !viceCaptainId) return;
    if (captainId === viceCaptainId) return;
    getSocket().emit("game:move", {
      type: "confirmSquad",
      data: {
        playerIds: [...selected],
        captainId,
        viceCaptainId,
      },
    });
  }

  // Derived lists.
  const xiPlayers = useMemo(() => {
    return [...selected]
      .map((id) => profilesById.get(id))
      .filter((p): p is HcPlayerProfile => !!p)
      .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);
  }, [selected, profilesById]);
  const benchPlayers = useMemo(
    () => sortedSquad.filter((p) => !selected.has(p.id)),
    [sortedSquad, selected],
  );
  const legendsBench = useMemo(
    () => sortedExtras.filter((p) => !selected.has(p.id)),
    [sortedExtras, selected],
  );
  const composition = useMemo(
    () => evaluateSquadComposition(xiPlayers),
    [xiPlayers],
  );

  const profile = (HC_COUNTRIES as Record<string, typeof HC_COUNTRIES.india | undefined>)[myTeamId];
  const franchise = (HC_FRANCHISES as Record<string, typeof HC_FRANCHISES.csk | undefined>)[myTeamId];
  const teamDisplay = profile
    ? `${profile.flag} ${profile.name}`
    : franchise
    ? `🏟️ ${franchise.name}`
    : roster.teamName;

  const oppId = state.playerOrder.find((id) => id !== selfId)!;
  const oppSelection = state.teamSelections[oppId];
  const oppName = players.find((p) => p.id === oppId)?.name ?? "Opponent";
  const oppStatus = oppSelection?.squadPlayerIds
    ? "✓ Squad confirmed"
    : oppSelection?.teamId
    ? "Picking squad…"
    : "Picking country…";

  return (
    <div className="bg-emerald-950/50 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-emerald-100 font-bold">
          Pick your XI for <span className="text-amber-300">{teamDisplay}</span>
        </div>
        <button
          onClick={changeTeam}
          className="text-xs px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-200 font-bold"
        >
          ← Change team
        </button>
      </div>

      <div className="bg-slate-900/40 rounded-lg p-2.5 text-center space-y-1">
        <div className="text-xs text-emerald-300/80">
          Selected <span className="font-extrabold text-amber-300 text-base">{selected.size}/11</span> · format:{" "}
          <span className="font-bold uppercase">{state.options.format}</span>
        </div>
        <div className="text-[11px] text-emerald-200/70">
          Tap a player in <span className="text-emerald-300 font-bold">Your XI</span> to drop them to the bench.
          Tap any <span className="text-slate-300 font-bold">Bench</span> or <span className="text-violet-300 font-bold">Legend</span> to swap them in.
        </div>
        <CompositionChecklist composition={composition} />
        <div className="text-[10px] text-emerald-300/70">{oppName}: {oppStatus}</div>
      </div>

      {/* YOUR XI — selected players */}
      <SquadGroup
        title={`🏏 Your XI (${xiPlayers.length}/11)`}
        subtitle="Click any to drop to bench"
        players={xiPlayers}
        selected={selected}
        onToggle={toggle}
        accentColor="#10b981"
      />

      {/* BENCH — unselected squad members */}
      {benchPlayers.length > 0 && (
        <SquadGroup
          title={`🪑 Bench (${benchPlayers.length})`}
          subtitle="Current squad members not in your XI"
          players={benchPlayers}
          selected={selected}
          onToggle={toggle}
          accentColor="#64748b"
          disabledHint={selected.size >= 11}
        />
      )}

      {/* LEGENDS — extras pool */}
      {legendsBench.length > 0 && (
        <SquadGroup
          title={`★ Legends (${legendsBench.length})`}
          subtitle="Popular past players from this team's history"
          players={legendsBench}
          selected={selected}
          onToggle={toggle}
          accentColor="#a855f7"
          disabledHint={selected.size >= 11}
        />
      )}

      {/* Captain + Vice-Captain selectors — required. */}
      <LeadershipPicker
        xi={xiPlayers}
        captainId={captainId}
        viceCaptainId={viceCaptainId}
        onCaptainChange={(id) => {
          setCaptainId(id);
          if (id && viceCaptainId === id) setViceCaptainId(null);
        }}
        onViceCaptainChange={(id) => {
          setViceCaptainId(id);
          if (id && captainId === id) setCaptainId(null);
        }}
      />

      <div className="flex flex-col items-center gap-1 pt-2">
        {(() => {
          const hasLeaders =
            !!captainId && !!viceCaptainId && captainId !== viceCaptainId;
          const ready = composition.isValid && hasLeaders;
          const label = !composition.isValid
            ? selected.size !== 11
              ? `Select ${11 - selected.size} more`
              : "Fix squad composition"
            : !hasLeaders
              ? "Pick Captain & Vice-Captain"
              : "🏏 Confirm Playing XI";
          return (
            <button
              onClick={confirm}
              disabled={!ready}
              className="px-6 py-3 rounded-lg font-extrabold text-base transition uppercase tracking-wider"
              style={{
                background: ready
                  ? "linear-gradient(180deg, #10b981, #047857)"
                  : "linear-gradient(180deg, #475569, #334155)",
                color: ready ? "#ecfdf5" : "#94a3b8",
                boxShadow: ready
                  ? "0 4px 0 #064e3b, 0 8px 16px rgba(0,0,0,0.4)"
                  : "0 2px 0 #1e293b",
                cursor: ready ? "pointer" : "not-allowed",
              }}
            >
              {label}
            </button>
          );
        })()}
      </div>
    </div>
  );
}

function LeadershipPicker({
  xi,
  captainId,
  viceCaptainId,
  onCaptainChange,
  onViceCaptainChange,
}: {
  xi: HcPlayerProfile[];
  captainId: string | null;
  viceCaptainId: string | null;
  onCaptainChange: (id: string | null) => void;
  onViceCaptainChange: (id: string | null) => void;
}) {
  const noPlayers = xi.length === 0;
  return (
    <div
      className="rounded-lg p-3 space-y-2"
      style={{
        background: "rgba(251,191,36,0.08)",
        border: "1px solid rgba(251,191,36,0.35)",
      }}
    >
      <div className="text-center text-xs font-extrabold uppercase tracking-wider text-amber-300">
        ★ Leadership · pick from your XI
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="block text-[11px]">
          <span className="block font-bold text-amber-200 mb-1">
            Captain <span className="text-rose-300">*</span>
          </span>
          <select
            value={captainId ?? ""}
            disabled={noPlayers}
            onChange={(e) => onCaptainChange(e.target.value || null)}
            className="w-full rounded-md px-2 py-2 text-sm font-semibold bg-slate-900/80 text-amber-100 border border-amber-500/40 focus:outline-none focus:border-amber-300 disabled:opacity-50"
          >
            <option value="">Choose Captain</option>
            {xi.map((p) => (
              <option key={p.id} value={p.id} disabled={p.id === viceCaptainId}>
                {p.name} ({p.role.toUpperCase()})
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[11px]">
          <span className="block font-bold text-amber-200 mb-1">
            Vice-Captain <span className="text-rose-300">*</span>
          </span>
          <select
            value={viceCaptainId ?? ""}
            disabled={noPlayers}
            onChange={(e) => onViceCaptainChange(e.target.value || null)}
            className="w-full rounded-md px-2 py-2 text-sm font-semibold bg-slate-900/80 text-amber-100 border border-amber-500/40 focus:outline-none focus:border-amber-300 disabled:opacity-50"
          >
            <option value="">Choose Vice-Captain</option>
            {xi.map((p) => (
              <option key={p.id} value={p.id} disabled={p.id === captainId}>
                {p.name} ({p.role.toUpperCase()})
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

function CompositionChecklist({
  composition,
}: {
  composition: ReturnType<typeof evaluateSquadComposition>;
}) {
  const items = [
    { label: "11 players", ok: composition.total === 11, count: `${composition.total}/11` },
    { label: "Keeper", ok: composition.keepers >= 1, count: `${composition.keepers}` },
    { label: "Bowling options (bowlers + AR)", ok: composition.bowlingOptions >= 4, count: `${composition.bowlingOptions}/4` },
  ];
  return (
    <div className="flex flex-wrap justify-center gap-1.5 pt-1">
      {items.map((item) => (
        <span
          key={item.label}
          className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={{
            background: item.ok ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.18)",
            color: item.ok ? "#a7f3d0" : "#fcd34d",
            border: `1px solid ${item.ok ? "#10b981" : "#f59e0b"}`,
          }}
        >
          {item.ok ? "✓" : "·"} {item.label} <span className="opacity-80">({item.count})</span>
        </span>
      ))}
    </div>
  );
}

function SquadGroup({
  title,
  subtitle,
  players,
  selected,
  onToggle,
  accentColor = "#10b981",
  disabledHint = false,
}: {
  title: string;
  subtitle?: string;
  players: HcPlayerProfile[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  accentColor?: string;
  disabledHint?: boolean;
}) {
  const roleLabel: Record<HcPlayerProfile["role"], string> = {
    batter: "BAT", bowler: "BOWL", allrounder: "AR", keeper: "WK",
  };
  const roleColor: Record<HcPlayerProfile["role"], string> = {
    batter: "#3b82f6", bowler: "#ef4444", allrounder: "#a855f7", keeper: "#f59e0b",
  };
  return (
    <div
      className="space-y-1.5 rounded-lg p-2"
      style={{
        background: `${accentColor}11`,
        border: `1px solid ${accentColor}33`,
      }}
    >
      <div className="flex items-baseline justify-between gap-2 px-1">
        <h4
          className="text-xs uppercase tracking-wider font-extrabold"
          style={{ color: accentColor }}
        >
          {title}
        </h4>
        {subtitle && (
          <span className="text-[10px] text-emerald-300/70 text-right">{subtitle}</span>
        )}
      </div>
      {players.length === 0 ? (
        <div className="text-[11px] italic text-emerald-300/50 px-1 py-2">
          Empty.
        </div>
      ) : (
        <div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 overflow-y-auto"
          style={{ maxHeight: "min(50vh, 28rem)" }}
        >
          {players.map((p) => {
            const isSel = selected.has(p.id);
            const isDisabled = !isSel && disabledHint;
            return (
              <button
                key={p.id}
                onClick={() => onToggle(p.id)}
                disabled={isDisabled}
                title={isDisabled ? "XI is full — drop someone first" : undefined}
                className={`relative text-left rounded-lg p-2 border transition ${
                  isSel
                    ? "scale-[1.02]"
                    : isDisabled
                    ? "opacity-40 cursor-not-allowed"
                    : "hover:scale-[1.02]"
                }`}
                style={{
                  background: isSel ? `${accentColor}33` : "rgba(15,23,42,0.6)",
                  borderColor: isSel ? accentColor : "rgba(255,255,255,0.1)",
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[9px] font-extrabold px-1.5 py-0.5 rounded leading-none"
                    style={{ background: roleColor[p.role], color: "#0f172a" }}
                  >
                    {roleLabel[p.role]}
                  </span>
                  {p.isCaptain && (
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500 text-slate-900">
                      C
                    </span>
                  )}
                  {p.isExtra && (
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-violet-600 text-white">
                      ★
                    </span>
                  )}
                </div>
                <div className="text-xs font-bold text-slate-100 mt-1 leading-tight">
                  {p.name}
                </div>
                {isSel && (
                  <span
                    className="absolute top-1 right-1 text-xs"
                    style={{ color: accentColor }}
                  >
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WaitingForOpponentSquad({
  state,
  selfId,
  players,
}: {
  state: HcState;
  selfId: string;
  players: Player[];
}) {
  const oppId = state.playerOrder.find((id) => id !== selfId)!;
  const oppSelection = state.teamSelections[oppId];
  const oppName = players.find((p) => p.id === oppId)?.name ?? "Opponent";
  const t0 = teamLabel(state, selfId, players);

  function reopen() {
    // Re-emit selectTeam with same team to allow editing squad.
    if (state.teamSelections[selfId]?.teamId) {
      getSocket().emit("game:move", {
        type: "selectTeam",
        data: { teamId: state.teamSelections[selfId]!.teamId },
      });
    }
  }

  return (
    <div className="bg-emerald-950/50 rounded-lg p-4 space-y-3 text-center">
      <div className="text-emerald-200">
        <span className="text-4xl">{t0.flag}</span>
        <div className="text-base font-extrabold mt-1">{t0.name}</div>
        <div className="text-xs text-emerald-300">XI confirmed — {state.teamSelections[selfId]?.squadPlayerIds?.length ?? 0} players</div>
      </div>
      <div className="text-emerald-100">
        Waiting for <span className="font-bold text-amber-300">{oppName}</span>
        {oppSelection?.teamId ? " to confirm their XI…" : " to pick a team…"}
      </div>
      <button
        onClick={reopen}
        className="text-xs px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-200 font-bold"
      >
        ← Edit my XI
      </button>
    </div>
  );
}

function TossPhase({
  state,
  selfId,
  players,
}: {
  state: HcState;
  selfId: string;
  players: Player[];
}) {
  const myPick = state.tossPicks[selfId];
  const oppId = state.playerOrder.find((id) => id !== selfId)!;
  const oppPick = state.tossPicks[oppId];
  const oppLockedIn = oppPick != null;
  const oppName = players.find((p) => p.id === oppId)?.name ?? "Opponent";

  function pick(n: number) {
    if (myPick != null) return;
    getSocket().emit("game:move", { type: "tossPick", data: { pick: n } });
  }

  return (
    <div className="bg-emerald-950/50 rounded-lg p-4 space-y-3">
      <div className="text-center text-emerald-100">
        🎲 <strong>Toss</strong> — both pick 1-6. Sum even = first player wins, odd = second player wins.
      </div>
      <PickRow disabled={myPick != null} onPick={pick} selected={myPick ?? null} />
      <div className="flex justify-center gap-6 text-sm">
        <div className="text-slate-300">
          You: <span className="text-amber-300 font-bold">{myPick ?? "—"}</span>
        </div>
        <div className="text-slate-300">
          {oppName}: <span className="text-amber-300 font-bold">{oppLockedIn ? "✓ ready" : "thinking…"}</span>
        </div>
      </div>
    </div>
  );
}

function TossChoicePhase({
  state,
  selfId,
  players,
}: {
  state: HcState;
  selfId: string;
  players: Player[];
}) {
  const isWinner = state.tossWinnerId === selfId;
  const winnerName = players.find((p) => p.id === state.tossWinnerId)?.name ?? "Winner";

  function choose(choice: "bat" | "bowl") {
    getSocket().emit("game:move", { type: "tossChoice", data: { choice } });
  }

  if (!isWinner) {
    return (
      <div className="bg-emerald-950/50 rounded-lg p-4 text-center text-emerald-100">
        🪙 {winnerName} won the toss (sum {state.tossSum}) — choosing bat or bowl…
      </div>
    );
  }
  return (
    <div className="bg-emerald-950/50 rounded-lg p-4 text-center space-y-3">
      <div className="text-emerald-100">
        🎉 You won the toss (sum {state.tossSum}). What do you want to do?
      </div>
      <div className="flex justify-center gap-3">
        <button
          onClick={() => choose("bat")}
          className="bg-emerald-600 hover:bg-emerald-500 px-6 py-3 rounded-lg font-extrabold text-lg shadow-lg"
        >
          🏏 BAT first
        </button>
        <button
          onClick={() => choose("bowl")}
          className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-lg font-extrabold text-lg shadow-lg"
        >
          ⚾ BOWL first
        </button>
      </div>
    </div>
  );
}

function InningsPhase({
  state,
  selfId,
  players,
}: {
  state: HcState;
  selfId: string;
  players: Player[];
}) {
  const innings = state.phase === "innings1" ? state.innings1! : state.innings2!;
  const myRole = innings.battingPlayerId === selfId ? "batter"
    : innings.bowlingPlayerId === selfId ? "bowler" : null;
  const myPick = state.pendingPicks[selfId];
  const oppId = state.playerOrder.find((id) => id !== selfId)!;
  const oppPickRaw = state.pendingPicks[oppId];
  const oppLockedIn = oppPickRaw != null;

  // Powerplay info for the upcoming ball.
  const upcomingOver = Math.floor(innings.balls / 6) + 1;
  const upcomingBall = (innings.balls % 6) + 1;
  const isPowerplayOver = upcomingOver <= innings.powerplayOvers;
  const restrictedThisOver = innings.restrictedBallsByOver[upcomingOver] ?? [];
  const isRestrictedNow = restrictedThisOver.includes(upcomingBall);
  const bowlerRestricted = myRole === "bowler" && isRestrictedNow;
  const allowedBowlerPicks = bowlerRestricted ? [1, 2, 3] : [1, 2, 3, 4, 5, 6];

  // Reveal last ball briefly when both lock in.
  const [reveal, setReveal] = useState<HcBall | null>(null);
  const lastBallCount = useRef(innings.history.length);
  useEffect(() => {
    if (innings.history.length > lastBallCount.current) {
      const last = innings.history[innings.history.length - 1];
      setReveal(last);
      const t = setTimeout(() => setReveal(null), 1800);
      lastBallCount.current = innings.history.length;
      return () => clearTimeout(t);
    }
    lastBallCount.current = innings.history.length;
  }, [innings.history.length]);

  function pick(n: number) {
    if (myPick != null) return;
    if (innings.currentBowlerId == null) return; // wait for bowler
    getSocket().emit("game:move", { type: "pick", data: { pick: n } });
  }

  const target = state.innings1 && state.phase === "innings2"
    ? state.innings1.runs + 1
    : null;

  const needsBowler = innings.currentBowlerId == null;

  return (
    <div className="space-y-3">
      <Scoreboard
        state={state}
        innings={innings}
        target={target}
        players={players}
      />

      {isPowerplayOver && innings.currentBowlerId != null && (
        <PowerplayBanner
          overNumber={upcomingOver}
          totalPowerplayOvers={innings.powerplayOvers}
          restrictedBalls={restrictedThisOver}
          currentBallInOver={upcomingBall}
          bowlerRestricted={bowlerRestricted}
          myRole={myRole}
        />
      )}

      <CurrentPlayersBar state={state} innings={innings} selfId={selfId} />

      {/* Role badge */}
      {myRole && (
        <div className="text-center">
          <span className={`inline-block px-3 py-1 rounded-full font-bold text-xs ${
            myRole === "batter" ? "bg-emerald-700 text-emerald-50" : "bg-indigo-700 text-indigo-50"
          }`}>
            {myRole === "batter" ? "🏏 You are BATTING" : "⚾ You are BOWLING"}
          </span>
        </div>
      )}

      {needsBowler ? (
        <BowlerPicker state={state} innings={innings} selfId={selfId} players={players} />
      ) : (
        <>
          <RevealStage
            reveal={reveal}
            innings={innings}
            myId={selfId}
            oppLockedIn={oppLockedIn}
            myPick={typeof myPick === "number" && myPick > 0 ? myPick : null}
          />

          <PickRow
            disabled={myPick != null}
            onPick={pick}
            selected={typeof myPick === "number" && myPick > 0 ? myPick : null}
            allowedPicks={myRole === "bowler" ? allowedBowlerPicks : [1, 2, 3, 4, 5, 6]}
            restrictedNote={bowlerRestricted ? "Powerplay — bowler limited to 1, 2 or 3" : null}
          />

          <div className="flex justify-center gap-6 text-xs text-emerald-200/70">
            <div>You: {myPick != null && typeof myPick === "number" && myPick > 0 ? "✓ locked" : "thinking…"}</div>
            <div>Opp: {oppLockedIn ? "✓ locked" : "thinking…"}</div>
          </div>
        </>
      )}

      {target != null && (
        <div className="text-center text-sm text-amber-300">
          Target: <b>{target}</b> · Need {Math.max(0, target - innings.runs)} more from{" "}
          {Math.max(0, innings.overs * 6 - innings.balls)} balls
        </div>
      )}

      {innings.history.length > 0 && (
        <RecentBalls history={innings.history.slice(-12)} />
      )}
    </div>
  );
}

function CurrentPlayersBar({
  state,
  innings,
  selfId,
}: {
  state: HcState;
  innings: HcInnings;
  selfId: string;
}) {
  const battingSelection = state.teamSelections[innings.battingPlayerId];
  const bowlingSelection = state.teamSelections[innings.bowlingPlayerId];
  const battingTeamId = battingSelection?.teamId;
  const bowlingTeamId = bowlingSelection?.teamId;
  const battingRoster = battingTeamId
    ? getRosterFor(battingTeamId, state.options.format)
    : null;
  const bowlingRoster = bowlingTeamId
    ? getRosterFor(bowlingTeamId, state.options.format)
    : null;
  const allBattingPlayers: HcPlayerProfile[] = battingRoster
    ? [...battingRoster.squad, ...battingRoster.extras]
    : [];
  const allBowlingPlayers: HcPlayerProfile[] = bowlingRoster
    ? [...bowlingRoster.squad, ...bowlingRoster.extras]
    : [];
  const lookupBatter = (id: string) => allBattingPlayers.find((p) => p.id === id);
  const lookupBowler = (id: string) => allBowlingPlayers.find((p) => p.id === id);

  const battingSquad = battingSelection?.squadPlayerIds ?? [];
  const strikerId = battingSquad[innings.strikerIdx];
  const nonStrikerId = battingSquad[innings.nonStrikerIdx];
  const striker = strikerId ? lookupBatter(strikerId) : null;
  const nonStriker = nonStrikerId ? lookupBatter(nonStrikerId) : null;
  const strikerStats = strikerId ? innings.batterStats[strikerId] : null;
  const nonStrikerStats = nonStrikerId ? innings.batterStats[nonStrikerId] : null;

  const currentBowlerId = innings.currentBowlerId;
  const currentBowler = currentBowlerId ? lookupBowler(currentBowlerId) : null;
  const bowlerStats = currentBowlerId ? innings.bowlerStats[currentBowlerId] : null;

  const batterStatSub = (stats: typeof strikerStats) =>
    stats
      ? `${stats.runs}${stats.isOut ? "" : "*"} (${stats.balls})${
          stats.fours ? ` · ${stats.fours}×4` : ""
        }${stats.sixes ? ` · ${stats.sixes}×6` : ""}`
      : "Yet to face";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <PlayerCard
        label="🏏 Striker ●"
        name={striker?.name ?? "—"}
        sub={batterStatSub(strikerStats)}
        isMine={innings.battingPlayerId === selfId}
        accent="#10b981"
      />
      <PlayerCard
        label="🏃 Non-striker"
        name={nonStriker?.name ?? "—"}
        sub={batterStatSub(nonStrikerStats)}
        isMine={innings.battingPlayerId === selfId}
        accent="#34d399"
        dimmed
      />
      <PlayerCard
        label="⚾ Bowling"
        name={currentBowler?.name ?? "Waiting…"}
        sub={
          bowlerStats
            ? `${Math.floor(bowlerStats.balls / 6)}.${bowlerStats.balls % 6}-${bowlerStats.wickets}-${bowlerStats.runs}`
            : "Pick a bowler"
        }
        isMine={innings.bowlingPlayerId === selfId}
        accent="#6366f1"
      />
    </div>
  );
}

function PlayerCard({
  label,
  name,
  sub,
  isMine,
  accent,
  dimmed = false,
}: {
  label: string;
  name: string;
  sub: string;
  isMine: boolean;
  accent: string;
  dimmed?: boolean;
}) {
  return (
    <div
      className="rounded-lg px-3 py-2"
      style={{
        background: dimmed ? "rgba(0,0,0,0.28)" : "rgba(0,0,0,0.42)",
        border: `1px solid ${isMine && !dimmed ? accent : "rgba(255,255,255,0.1)"}`,
        boxShadow: isMine && !dimmed ? `0 0 12px ${accent}55` : undefined,
        opacity: dimmed ? 0.78 : 1,
      }}
    >
      <div className="text-[9px] uppercase tracking-wider font-extrabold" style={{ color: accent }}>
        {label}{isMine && <span className="ml-1 text-amber-300">· YOU</span>}
      </div>
      <div className="text-sm font-bold text-emerald-50 leading-tight">{name}</div>
      <div className="text-[11px] text-emerald-200/80 tabular-nums">{sub}</div>
    </div>
  );
}

function BowlerPicker({
  state,
  innings,
  selfId,
  players,
}: {
  state: HcState;
  innings: HcInnings;
  selfId: string;
  players: Player[];
}) {
  const amBowling = innings.bowlingPlayerId === selfId;
  const bowlingSelection = state.teamSelections[innings.bowlingPlayerId];
  const bowlingTeamId = bowlingSelection?.teamId;
  const roster = bowlingTeamId ? getRosterFor(bowlingTeamId, state.options.format) : null;
  const allBowlingPlayers: HcPlayerProfile[] = roster
    ? [...roster.squad, ...roster.extras]
    : [];
  const selectedSquadIds = bowlingSelection?.squadPlayerIds ?? [];
  const candidates = selectedSquadIds
    .map((id) => allBowlingPlayers.find((p) => p.id === id))
    .filter((p): p is HcPlayerProfile => !!p);
  const bowlingName = players.find((p) => p.id === innings.bowlingPlayerId)?.name ?? "Bowler";

  function pickBowler(profileId: string) {
    getSocket().emit("game:move", { type: "selectBowler", data: { playerId: profileId } });
  }

  if (!amBowling) {
    return (
      <div className="bg-indigo-950/50 rounded-lg p-4 text-center text-indigo-100">
        ⚾ Waiting for <span className="font-bold text-amber-300">{bowlingName}</span> to pick the bowler for over{" "}
        {Math.floor(innings.balls / 6) + 1}…
      </div>
    );
  }

  // Only bowlers and all-rounders can bowl.
  const bowlersOnly = candidates
    .filter((p) => p.role === "bowler" || p.role === "allrounder")
    .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);
  const maxOvers = HC_MAX_OVERS_PER_BOWLER[state.options.format];
  const quotaLabel = maxOvers == null ? "no limit" : `${maxOvers} overs max`;

  return (
    <div className="bg-indigo-950/60 rounded-lg p-4 space-y-3">
      <div className="text-center text-indigo-100 font-bold">
        ⚾ Pick your bowler for over {Math.floor(innings.balls / 6) + 1}
      </div>
      {bowlersOnly.length === 0 ? (
        <div className="text-center text-amber-300 text-sm font-bold py-4">
          No bowlers or all-rounders in your XI. (This shouldn't happen if composition rules held.)
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
          {bowlersOnly.map((p) => {
            const stats = innings.bowlerStats[p.id];
            const completedOvers = stats ? Math.floor(stats.balls / 6) : 0;
            const atQuota = maxOvers != null && completedOvers >= maxOvers;
            const remaining = maxOvers != null ? maxOvers - completedOvers : null;
            return (
              <button
                key={p.id}
                onClick={() => !atQuota && pickBowler(p.id)}
                disabled={atQuota}
                title={atQuota ? `Quota reached (${maxOvers} overs)` : undefined}
                className={`text-left rounded-lg p-2 border transition ${
                  atQuota
                    ? "border-slate-800 bg-slate-900/30 opacity-40 cursor-not-allowed"
                    : "border-slate-700 bg-slate-900/60 hover:border-indigo-400 hover:scale-[1.03]"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[9px] font-extrabold px-1.5 py-0.5 rounded leading-none"
                    style={{
                      background: p.role === "bowler" ? "#ef4444" : "#a855f7",
                      color: "#0f172a",
                    }}
                  >
                    {p.role === "bowler" ? "BOWL" : "AR"}
                  </span>
                  {p.isCaptain && (
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500 text-slate-900">C</span>
                  )}
                  {atQuota && (
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-rose-700 text-white ml-auto">
                      MAX
                    </span>
                  )}
                </div>
                <div className="text-xs font-bold text-slate-100 mt-1 leading-tight">{p.name}</div>
                <div className="flex items-center justify-between mt-0.5 gap-2">
                  {stats && (stats.balls > 0 || stats.wickets > 0) ? (
                    <span className="text-[10px] text-emerald-300/80 tabular-nums">
                      {Math.floor(stats.balls / 6)}.{stats.balls % 6}-{stats.wickets}-{stats.runs}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 italic">unused</span>
                  )}
                  {maxOvers != null && (
                    <span
                      className="text-[9px] font-bold tabular-nums px-1.5 rounded"
                      style={{
                        background: atQuota ? "#7f1d1d" : remaining! <= 1 ? "#78350f" : "rgba(0,0,0,0.4)",
                        color: atQuota ? "#fecaca" : remaining! <= 1 ? "#fed7aa" : "#a7f3d0",
                      }}
                    >
                      {completedOvers}/{maxOvers}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
      <div className="text-center text-[11px] text-indigo-300/70">
        Only bowlers and all-rounders can bowl · format quota: {quotaLabel}
      </div>
    </div>
  );
}

function Scoreboard({
  state,
  innings,
  target,
  players,
}: {
  state: HcState;
  innings: HcInnings;
  target: number | null;
  players: Player[];
}) {
  const batterTeam = teamLabel(state, innings.battingPlayerId, players);
  const oversBowled = Math.floor(innings.balls / 6);
  const ballsThisOver = innings.balls % 6;
  return (
    <div
      className="rounded-lg p-3 flex items-center justify-between gap-3"
      style={{
        background: "rgba(0,0,0,0.45)",
        border: "1px solid #16a34a",
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl">{batterTeam.flag}</span>
        <div>
          <div className="text-xs uppercase tracking-wider text-emerald-300 font-bold">
            Innings {innings.number} · {batterTeam.short} ({batterTeam.playerName}) batting
          </div>
          <div className="text-3xl font-extrabold text-emerald-100 leading-none tabular-nums">
            {innings.runs}<span className="text-rose-300">/{innings.wickets}</span>
          </div>
          <div className="text-xs text-emerald-200/80 tabular-nums">
            Overs {oversBowled}.{ballsThisOver} / {innings.overs}
          </div>
        </div>
      </div>
      {target != null && (
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-amber-300 font-bold">Target</div>
          <div className="text-2xl font-extrabold text-amber-200 tabular-nums">{target}</div>
        </div>
      )}
    </div>
  );
}

function RevealStage({
  reveal,
  innings,
  myId,
  oppLockedIn,
  myPick,
}: {
  reveal: HcBall | null;
  innings: HcInnings;
  myId: string;
  oppLockedIn: boolean;
  myPick: number | null;
}) {
  const meIsBatter = innings.battingPlayerId === myId;
  if (reveal) {
    const myShown = meIsBatter ? reveal.batterPick : reveal.bowlerPick;
    const oppShown = meIsBatter ? reveal.bowlerPick : reveal.batterPick;
    return (
      <div className="flex items-center justify-center gap-6 py-3">
        <RevealHand label="You" pick={myShown} side="left" />
        <div className={`text-3xl font-extrabold ${
          reveal.wicket ? "text-rose-400" : reveal.isBoundary ? "text-amber-300" : "text-emerald-300"
        }`}>
          {reveal.wicket ? "WICKET!" : reveal.runs === 4 ? "FOUR!" : reveal.runs === 6 ? "SIX!" : `+${reveal.runs}`}
        </div>
        <RevealHand label="Opp" pick={oppShown} side="right" />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center gap-6 py-3">
      <RevealHand label="You" pick={myPick} side="left" pending={myPick == null} />
      <div className="text-xl text-emerald-300/70">vs</div>
      <RevealHand label="Opp" pick={null} side="right" pending={!oppLockedIn} hidden={oppLockedIn} />
    </div>
  );
}

function RevealHand({
  label,
  pick,
  side,
  pending,
  hidden,
}: {
  label: string;
  pick: number | null;
  side: "left" | "right";
  pending?: boolean;
  hidden?: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`text-5xl ${side === "left" ? "rps-slam-left" : "rps-slam-right"}`}
        key={pick ?? (hidden ? "h" : "p")}
      >
        {pick != null ? HAND_FACES[pick] ?? pick : hidden ? "🤐" : pending ? "❓" : "—"}
      </div>
      <div className="text-xs text-emerald-200 mt-1">{label}{pick != null ? ` · ${pick}` : ""}</div>
    </div>
  );
}

function PickRow({
  disabled,
  onPick,
  selected,
  allowedPicks = [1, 2, 3, 4, 5, 6],
  restrictedNote = null,
}: {
  disabled: boolean;
  onPick: (n: number) => void;
  selected: number | null;
  allowedPicks?: number[];
  restrictedNote?: string | null;
}) {
  return (
    <div className="space-y-2">
      {restrictedNote && (
        <div
          className="text-center text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full mx-auto inline-block"
          style={{
            background: "linear-gradient(90deg, #b45309, #f59e0b, #b45309)",
            color: "#fef3c7",
            border: "1px solid #fbbf24",
            display: "block",
            maxWidth: "fit-content",
            margin: "0 auto",
          }}
        >
          🔥 {restrictedNote}
        </div>
      )}
      <div className="flex flex-wrap justify-center gap-2">
        {[1, 2, 3, 4, 5, 6].map((n) => {
          const isAllowed = allowedPicks.includes(n);
          const isDisabled = disabled || !isAllowed;
          return (
            <button
              key={n}
              onClick={() => isAllowed && onPick(n)}
              disabled={isDisabled}
              title={!isAllowed ? "Restricted during powerplay" : undefined}
              className={`relative w-14 h-16 rounded-lg text-2xl flex flex-col items-center justify-center font-bold transition ${
                selected === n
                  ? "bg-amber-500 text-slate-900 scale-110"
                  : !isAllowed
                  ? "bg-slate-900/50 text-slate-700 cursor-not-allowed opacity-50"
                  : disabled
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-slate-700 hover:bg-slate-600 text-slate-100"
              }`}
            >
              <span className="text-base leading-none">{HAND_FACES[n] ?? n}</span>
              <span className="text-xs mt-1 opacity-80">{n}</span>
              {!isAllowed && (
                <span className="absolute top-0.5 right-1 text-[8px] text-rose-300 font-extrabold">
                  ✕
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PowerplayBanner({
  overNumber,
  totalPowerplayOvers,
  restrictedBalls,
  currentBallInOver,
  bowlerRestricted,
  myRole,
}: {
  overNumber: number;
  totalPowerplayOvers: number;
  restrictedBalls: number[];
  currentBallInOver: number;
  bowlerRestricted: boolean;
  myRole: "batter" | "bowler" | null;
}) {
  return (
    <div
      className="rounded-lg p-2.5"
      style={{
        background: "linear-gradient(135deg, #7c2d12 0%, #b45309 50%, #ea580c 100%)",
        border: "2px solid #fbbf24",
        boxShadow: "0 0 18px rgba(251,191,36,0.35)",
      }}
    >
      <div className="flex items-center justify-between flex-wrap gap-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔥</span>
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-amber-100">
              Powerplay
            </div>
            <div className="text-xs font-bold text-amber-50">
              Over {overNumber} of {totalPowerplayOvers} · 3 random balls restrict the bowler to 1-3
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5, 6].map((b) => {
            const isRestricted = restrictedBalls.includes(b);
            const isCurrent = b === currentBallInOver;
            return (
              <span
                key={b}
                className="w-6 h-6 rounded text-[10px] font-extrabold flex items-center justify-center tabular-nums"
                style={{
                  background: isRestricted
                    ? isCurrent
                      ? "#fbbf24"
                      : "rgba(251,191,36,0.55)"
                    : "rgba(0,0,0,0.35)",
                  color: isRestricted ? "#7c2d12" : "#fed7aa",
                  border: isCurrent ? "2px solid #fef3c7" : "1px solid rgba(0,0,0,0.3)",
                  boxShadow: isCurrent ? "0 0 6px #fbbf24" : undefined,
                }}
                title={
                  isRestricted
                    ? `Ball ${b}: bowler restricted to 1-3`
                    : `Ball ${b}: no restriction`
                }
              >
                {b}
              </span>
            );
          })}
        </div>
      </div>
      {bowlerRestricted && myRole === "bowler" && (
        <div className="text-center mt-1 text-[11px] font-extrabold text-amber-100">
          ⚠ This ball is restricted — you may only pick 1, 2, or 3
        </div>
      )}
      {bowlerRestricted && myRole === "batter" && (
        <div className="text-center mt-1 text-[11px] font-extrabold text-emerald-200">
          ✨ This ball: bowler can only pick 1-3. Pick 4, 5, or 6 to score big risk-free!
        </div>
      )}
    </div>
  );
}

function RecentBalls({ history }: { history: HcBall[] }) {
  return (
    <div className="bg-emerald-950/50 rounded-lg p-2">
      <div className="text-[10px] uppercase tracking-wider text-emerald-200/70 mb-1 px-1">
        This over
      </div>
      <div className="flex flex-wrap gap-1">
        {history.map((b, i) => (
          <span
            key={`${b.overNumber}-${b.ballInOver}-${i}`}
            className="text-xs px-2 py-1 rounded font-bold tabular-nums"
            style={{
              background: b.wicket ? "rgba(127,29,29,0.7)"
                : b.isBoundary ? "rgba(245,158,11,0.7)"
                : b.runs === 0 ? "rgba(51,65,85,0.7)"
                : "rgba(6,95,70,0.7)",
              color: b.wicket ? "#fecaca"
                : b.isBoundary ? "#fef3c7"
                : "#ecfdf5",
            }}
            title={`Over ${b.overNumber}.${b.ballInOver}: batter ${b.batterPick} vs bowler ${b.bowlerPick}`}
          >
            {b.wicket ? "W" : b.runs}
          </span>
        ))}
      </div>
    </div>
  );
}

function MatchSummary({
  state,
  players,
  selfId,
}: {
  state: HcState;
  players: Player[];
  selfId: string;
}) {
  const youWon = state.winnerId === selfId;
  const winnerName = players.find((p) => p.id === state.winnerId)?.name ?? "—";
  const winnerTeam = state.winnerId
    ? teamLabel(state, state.winnerId, players)
    : null;
  return (
    <div className="space-y-3">
      <div
        className="rounded-xl p-4 text-center"
        style={{
          background: state.result === "tie"
            ? "linear-gradient(135deg, #475569, #1e293b)"
            : youWon
            ? "linear-gradient(135deg, #047857, #052e16)"
            : "linear-gradient(135deg, #7f1d1d, #1e293b)",
          border: state.result === "tie"
            ? "2px solid #94a3b8"
            : youWon
            ? "2px solid #10b981"
            : "2px solid #ef4444",
          boxShadow: youWon ? "0 0 30px rgba(16,185,129,0.5)" : undefined,
        }}
      >
        <div className="text-4xl mb-1">
          {state.result === "tie" ? "🤝" : youWon ? "🏆" : "👏"}
        </div>
        <div className="text-xl font-extrabold text-white">
          {state.result === "tie"
            ? "Match tied!"
            : winnerTeam
            ? `${winnerTeam.flag} ${winnerTeam.name} (${winnerName}) win!`
            : "Match over"}
        </div>
        <div className="text-sm text-white/80 mt-1">
          {summarizeMatch(state)}
        </div>
      </div>

      {state.innings1 && (
        <InningsScorecard
          innings={state.innings1}
          state={state}
          players={players}
        />
      )}
      {state.innings2 && (
        <InningsScorecard
          innings={state.innings2}
          state={state}
          players={players}
        />
      )}
    </div>
  );
}

function summarizeMatch(state: HcState): string {
  const i1 = state.innings1;
  const i2 = state.innings2;
  if (!i1 || !i2) return "";
  if (state.result === "tie") {
    return `Both sides finished on ${i1.runs}.`;
  }
  const winnerInnings = i1.runs > i2.runs ? i1 : i2;
  const margin = Math.abs(i1.runs - i2.runs);
  if (winnerInnings.number === 2) {
    return `Won by ${state.maxWickets - winnerInnings.wickets} wicket${
      state.maxWickets - winnerInnings.wickets === 1 ? "" : "s"
    }.`;
  }
  return `Won by ${margin} run${margin === 1 ? "" : "s"}.`;
}

function InningsScorecard({
  innings,
  state,
  players,
}: {
  innings: HcInnings;
  state: HcState;
  players: Player[];
}) {
  const batter = teamLabel(state, innings.battingPlayerId, players);
  const bowler = teamLabel(state, innings.bowlingPlayerId, players);
  const oversBowled = Math.floor(innings.balls / 6);
  const ballsThisOver = innings.balls % 6;
  const fours = innings.history.filter((b) => !b.wicket && b.runs === 4).length;
  const sixes = innings.history.filter((b) => !b.wicket && b.runs === 6).length;
  const dots = innings.history.filter((b) => !b.wicket && b.runs === 0).length;
  const strikeRate = innings.balls > 0 ? ((innings.runs / innings.balls) * 100).toFixed(1) : "0.0";
  const reasonLabel: Record<string, string> = {
    allOut: "All out",
    oversUp: "Overs up",
    chased: "Target chased",
  };

  const battingSelection = state.teamSelections[innings.battingPlayerId];
  const bowlingSelection = state.teamSelections[innings.bowlingPlayerId];
  const battingRoster = battingSelection?.teamId
    ? getRosterFor(battingSelection.teamId, state.options.format)
    : null;
  const bowlingRoster = bowlingSelection?.teamId
    ? getRosterFor(bowlingSelection.teamId, state.options.format)
    : null;
  const battingPool: HcPlayerProfile[] = battingRoster
    ? [...battingRoster.squad, ...battingRoster.extras]
    : [];
  const bowlingPool: HcPlayerProfile[] = bowlingRoster
    ? [...bowlingRoster.squad, ...bowlingRoster.extras]
    : [];
  const nameOfBatter = (id: string) => battingPool.find((p) => p.id === id)?.name ?? id;
  const nameOfBowler = (id: string) => bowlingPool.find((p) => p.id === id)?.name ?? id;

  const battingOrder = battingSelection?.squadPlayerIds ?? [];
  const batterRows = battingOrder
    .map((id) => ({ id, stats: innings.batterStats[id] }))
    .filter((row) => row.stats && (row.stats.balls > 0 || row.stats.isOut));
  const bowlerRows = Object.entries(innings.bowlerStats)
    .map(([id, stats]) => ({ id, stats }))
    .filter((row) => row.stats.balls > 0)
    .sort((a, b) => b.stats.wickets - a.stats.wickets || a.stats.runs - b.stats.runs);

  return (
    <div className="bg-slate-900/70 rounded-lg p-3 border border-emerald-800 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{batter.flag}</span>
          <div>
            <div className="text-xs uppercase tracking-wider text-emerald-300 font-bold">
              Innings {innings.number} · {batter.short} ({batter.playerName})
            </div>
            <div className="text-2xl font-extrabold text-emerald-100 tabular-nums">
              {innings.runs}/{innings.wickets}{" "}
              <span className="text-xs text-emerald-300 font-normal">
                ({oversBowled}.{ballsThisOver} ov)
              </span>
            </div>
          </div>
        </div>
        <div className="text-xs text-emerald-200/70 text-right">
          <div>Bowled by {bowler.short} ({bowler.playerName})</div>
          {innings.endedReason && (
            <div className="text-amber-300 font-bold">
              {reasonLabel[innings.endedReason] ?? innings.endedReason}
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 text-xs">
        <Stat label="4s" value={fours} />
        <Stat label="6s" value={sixes} />
        <Stat label="Dots" value={dots} />
        <Stat label="SR" value={strikeRate} />
      </div>

      {batterRows.length > 0 && (
        <BatterTable rows={batterRows} nameOf={nameOfBatter} nameOfBowler={nameOfBowler} />
      )}
      {bowlerRows.length > 0 && (
        <BowlerTable rows={bowlerRows} nameOf={nameOfBowler} />
      )}
    </div>
  );
}

function BatterTable({
  rows,
  nameOf,
  nameOfBowler,
}: {
  rows: { id: string; stats: HcBatterStats | undefined }[];
  nameOf: (id: string) => string;
  nameOfBowler: (id: string) => string;
}) {
  return (
    <div className="rounded bg-emerald-950/50 p-2">
      <div className="text-[10px] uppercase tracking-wider text-emerald-300 font-extrabold mb-1 px-1">
        🏏 Batting
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-emerald-300/70 text-[10px]">
            <th className="text-left py-0.5">Batter</th>
            <th className="text-right">R</th>
            <th className="text-right">B</th>
            <th className="text-right">4s</th>
            <th className="text-right">6s</th>
            <th className="text-right">SR</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ id, stats }) => {
            if (!stats) return null;
            const sr = stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(0) : "—";
            return (
              <tr key={id} className="text-emerald-100">
                <td className="py-0.5">
                  <div className="font-bold">{nameOf(id)}{!stats.isOut ? "*" : ""}</div>
                  {stats.isOut && stats.dismissedBy && (
                    <div className="text-[10px] text-rose-300/70">b {nameOfBowler(stats.dismissedBy)}</div>
                  )}
                </td>
                <td className="text-right tabular-nums font-bold">{stats.runs}</td>
                <td className="text-right tabular-nums">{stats.balls}</td>
                <td className="text-right tabular-nums">{stats.fours}</td>
                <td className="text-right tabular-nums">{stats.sixes}</td>
                <td className="text-right tabular-nums">{sr}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BowlerTable({
  rows,
  nameOf,
}: {
  rows: { id: string; stats: HcBowlerStats }[];
  nameOf: (id: string) => string;
}) {
  return (
    <div className="rounded bg-indigo-950/50 p-2">
      <div className="text-[10px] uppercase tracking-wider text-indigo-300 font-extrabold mb-1 px-1">
        ⚾ Bowling
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-indigo-300/70 text-[10px]">
            <th className="text-left py-0.5">Bowler</th>
            <th className="text-right">O</th>
            <th className="text-right">R</th>
            <th className="text-right">W</th>
            <th className="text-right">Econ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ id, stats }) => {
            const overs = `${Math.floor(stats.balls / 6)}.${stats.balls % 6}`;
            const econ = stats.balls > 0 ? ((stats.runs / stats.balls) * 6).toFixed(1) : "—";
            return (
              <tr key={id} className="text-emerald-100">
                <td className="py-0.5 font-bold">{nameOf(id)}</td>
                <td className="text-right tabular-nums">{overs}</td>
                <td className="text-right tabular-nums">{stats.runs}</td>
                <td className="text-right tabular-nums font-bold text-amber-300">{stats.wickets}</td>
                <td className="text-right tabular-nums">{econ}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-emerald-950/60 rounded p-1.5 text-center">
      <div className="text-[10px] uppercase text-emerald-300/70 font-bold">{label}</div>
      <div className="text-base text-emerald-100 font-extrabold tabular-nums">{value}</div>
    </div>
  );
}

/* ───────────────────────────── Celebrations ───────────────────────────── */

type HcCelebrationData =
  | { kind: "four"; id: number; batter: string }
  | { kind: "six"; id: number; batter: string }
  | { kind: "wicket"; id: number; batter: string; bowler: string }
  | { kind: "hattrickWickets"; id: number; bowler: string }
  | { kind: "hattrickBoundaries"; id: number; batter: string }
  | { kind: "winner"; id: number; youWon: boolean; winnerName: string; margin: string; isTie: boolean };

function HcCelebrationLayer({
  state,
  players,
  selfId,
}: {
  state: HcState;
  players: Player[];
  selfId: string;
}) {
  const [active, setActive] = useState<HcCelebrationData | null>(null);
  const prevLensRef = useRef({
    i1: state.innings1?.history.length ?? 0,
    i2: state.innings2?.history.length ?? 0,
  });
  const prevPhaseRef = useRef(state.phase);

  const nameOf = (id: string | null | undefined) =>
    players.find((p) => p.id === id)?.name ?? "Player";

  // Ball events
  useEffect(() => {
    const i1Len = state.innings1?.history.length ?? 0;
    const i2Len = state.innings2?.history.length ?? 0;
    const prev = prevLensRef.current;

    let inn: HcInnings | null = null;
    if (i1Len > prev.i1) inn = state.innings1!;
    else if (i2Len > prev.i2) inn = state.innings2!;

    if (inn) {
      const last3 = inn.history.slice(-3);
      const lastBall = last3[last3.length - 1];
      const isBoundaryBall = (b: HcBall) =>
        !b.wicket && (b.runs === 4 || b.runs === 6);
      const allWickets = last3.length === 3 && last3.every((b) => b.wicket);
      const allBoundaries = last3.length === 3 && last3.every(isBoundaryBall);

      const batterName = nameOf(inn.battingPlayerId);
      const bowlerName = nameOf(inn.bowlingPlayerId);
      const stamp = Date.now();

      if (allWickets) {
        setActive({ kind: "hattrickWickets", id: stamp, bowler: bowlerName });
      } else if (allBoundaries) {
        setActive({ kind: "hattrickBoundaries", id: stamp, batter: batterName });
      } else if (lastBall.wicket) {
        setActive({ kind: "wicket", id: stamp, batter: batterName, bowler: bowlerName });
      } else if (lastBall.runs === 6) {
        setActive({ kind: "six", id: stamp, batter: batterName });
      } else if (lastBall.runs === 4) {
        setActive({ kind: "four", id: stamp, batter: batterName });
      }
    }

    prevLensRef.current = { i1: i1Len, i2: i2Len };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.innings1?.history.length, state.innings2?.history.length]);

  // Match-over winner celebration
  useEffect(() => {
    if (prevPhaseRef.current !== "finished" && state.phase === "finished") {
      const isTie = state.result === "tie";
      const youWon = !!state.winnerId && state.winnerId === selfId;
      const winnerName = state.winnerId ? nameOf(state.winnerId) : "—";
      let margin = "";
      const i1 = state.innings1;
      const i2 = state.innings2;
      if (!isTie && i1 && i2) {
        const winnerInn = i1.runs > i2.runs ? i1 : i2;
        const gap = Math.abs(i1.runs - i2.runs);
        if (winnerInn.number === 2) {
          const wktsLeft = state.maxWickets - winnerInn.wickets;
          margin = `by ${wktsLeft} wicket${wktsLeft === 1 ? "" : "s"}`;
        } else {
          margin = `by ${gap} run${gap === 1 ? "" : "s"}`;
        }
      }
      setActive({
        kind: "winner",
        id: Date.now(),
        youWon,
        winnerName,
        margin,
        isTie,
      });
    }
    prevPhaseRef.current = state.phase;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.winnerId, state.result]);

  // Auto-dismiss
  useEffect(() => {
    if (!active) return;
    const ms =
      active.kind === "winner" ? 4800
      : active.kind === "hattrickWickets" || active.kind === "hattrickBoundaries" ? 3200
      : active.kind === "six" ? 2200
      : active.kind === "wicket" ? 2000
      : 1800;
    const t = setTimeout(() => setActive(null), ms);
    return () => clearTimeout(t);
  }, [active]);

  if (!active) return null;
  return <HcCelebrationOverlay data={active} />;
}

function HcCelebrationOverlay({ data }: { data: HcCelebrationData }) {
  return (
    <div
      className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center px-4"
      aria-live="polite"
      aria-atomic="true"
      role="status"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            data.kind === "wicket" || data.kind === "hattrickWickets"
              ? "radial-gradient(ellipse at center, rgba(127,29,29,0.45) 0%, rgba(0,0,0,0.55) 70%)"
              : data.kind === "winner"
              ? "radial-gradient(ellipse at center, rgba(217,119,6,0.4) 0%, rgba(0,0,0,0.6) 70%)"
              : "radial-gradient(ellipse at center, rgba(180,83,9,0.35) 0%, rgba(0,0,0,0.45) 70%)",
        }}
      />
      {(data.kind === "four" || data.kind === "six" || data.kind === "hattrickBoundaries") && (
        <EmojiBurst emojis={data.kind === "four" ? ["4️⃣", "🏏", "💥"] : data.kind === "six" ? ["6️⃣", "🏏", "🎆", "⭐"] : ["4️⃣", "6️⃣", "🔥", "🏏"]} count={data.kind === "hattrickBoundaries" ? 22 : 14} />
      )}
      {(data.kind === "wicket" || data.kind === "hattrickWickets") && (
        <EmojiBurst emojis={data.kind === "wicket" ? ["💥", "🎯"] : ["🎯", "💥", "🔥"]} count={data.kind === "hattrickWickets" ? 18 : 10} />
      )}
      {data.kind === "winner" && !data.isTie && <ConfettiRain count={60} />}

      <HcCelebrationCard data={data} />
    </div>
  );
}

function HcCelebrationCard({ data }: { data: HcCelebrationData }) {
  switch (data.kind) {
    case "four":
      return (
        <div className="relative hc-celebrate-pop text-center">
          <div
            className="font-black tracking-tight leading-none hc-glow-pulse"
            style={{
              fontSize: "clamp(72px, 18vw, 168px)",
              background: "linear-gradient(180deg, #fde047 0%, #f59e0b 60%, #b45309 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              textShadow: "0 6px 22px rgba(0,0,0,0.55)",
            }}
          >
            FOUR!
          </div>
          <div className="mt-2 text-amber-100 font-bold text-sm sm:text-base drop-shadow">
            🏏 {data.batter} smashes a boundary!
          </div>
        </div>
      );
    case "six":
      return (
        <div className="relative hc-celebrate-pop text-center">
          <div
            className="absolute inset-0 -z-10 mx-auto hc-rays-spin"
            aria-hidden
            style={{
              width: "min(120vw, 800px)",
              height: "min(120vw, 800px)",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              background:
                "conic-gradient(from 0deg, rgba(251,191,36,0.0) 0deg, rgba(251,191,36,0.35) 30deg, rgba(251,191,36,0) 60deg, rgba(251,191,36,0.35) 90deg, rgba(251,191,36,0) 120deg, rgba(251,191,36,0.35) 150deg, rgba(251,191,36,0) 180deg, rgba(251,191,36,0.35) 210deg, rgba(251,191,36,0) 240deg, rgba(251,191,36,0.35) 270deg, rgba(251,191,36,0) 300deg, rgba(251,191,36,0.35) 330deg, rgba(251,191,36,0) 360deg)",
              filter: "blur(8px)",
              opacity: 0.6,
            }}
          />
          <div
            className="font-black tracking-tight leading-none hc-glow-pulse"
            style={{
              fontSize: "clamp(80px, 22vw, 200px)",
              background:
                "linear-gradient(180deg, #fff3a0 0%, #f97316 55%, #b91c1c 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              textShadow: "0 8px 28px rgba(0,0,0,0.6)",
            }}
          >
            SIX!
          </div>
          <div className="mt-2 text-amber-50 font-extrabold text-base sm:text-lg drop-shadow">
            🚀 {data.batter} sends it out of the park!
          </div>
        </div>
      );
    case "wicket":
      return (
        <div className="relative hc-shake text-center">
          <div
            className="font-black tracking-tight leading-none"
            style={{
              fontSize: "clamp(72px, 20vw, 180px)",
              background: "linear-gradient(180deg, #fecaca 0%, #ef4444 55%, #7f1d1d 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              textShadow: "0 6px 24px rgba(0,0,0,0.7)",
            }}
          >
            WICKET!
          </div>
          <div className="mt-2 text-rose-100 font-extrabold text-base sm:text-lg drop-shadow">
            🎯 {data.batter} OUT — {data.bowler} strikes!
          </div>
        </div>
      );
    case "hattrickWickets":
      return (
        <div className="relative hc-celebrate-pop text-center">
          <div className="text-[28px] sm:text-[36px] mb-1">🔥🔥🔥</div>
          <div
            className="font-black tracking-tight leading-none uppercase hc-glow-pulse"
            style={{
              fontSize: "clamp(60px, 16vw, 140px)",
              background:
                "linear-gradient(180deg, #fef08a 0%, #f97316 50%, #b91c1c 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              letterSpacing: "0.02em",
              textShadow: "0 8px 26px rgba(0,0,0,0.7)",
            }}
          >
            HAT-TRICK!
          </div>
          <div className="mt-2 text-amber-100 font-extrabold text-base sm:text-lg drop-shadow">
            🎯 {data.bowler} — three in a row!
          </div>
          <div className="mt-4 flex justify-center gap-3 text-3xl sm:text-4xl">
            <span className="hc-celebrate-pop" style={{ animationDelay: "120ms" }}>🎯</span>
            <span className="hc-celebrate-pop" style={{ animationDelay: "240ms" }}>🎯</span>
            <span className="hc-celebrate-pop" style={{ animationDelay: "360ms" }}>🎯</span>
          </div>
        </div>
      );
    case "hattrickBoundaries":
      return (
        <div className="relative hc-celebrate-pop text-center">
          <div className="text-[28px] sm:text-[36px] mb-1">⚡⚡⚡</div>
          <div
            className="font-black tracking-tight leading-none uppercase hc-glow-pulse"
            style={{
              fontSize: "clamp(54px, 14vw, 128px)",
              background:
                "linear-gradient(180deg, #fff3a0 0%, #f59e0b 50%, #9a3412 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              letterSpacing: "0.02em",
              textShadow: "0 8px 26px rgba(0,0,0,0.65)",
            }}
          >
            ON FIRE!
          </div>
          <div className="mt-2 text-amber-50 font-extrabold text-base sm:text-lg drop-shadow">
            🏏 {data.batter} — boundary spree!
          </div>
          <div className="mt-4 flex justify-center gap-3 text-3xl sm:text-4xl font-black text-amber-200">
            <span className="hc-celebrate-pop" style={{ animationDelay: "120ms" }}>4️⃣</span>
            <span className="hc-celebrate-pop" style={{ animationDelay: "240ms" }}>6️⃣</span>
            <span className="hc-celebrate-pop" style={{ animationDelay: "360ms" }}>4️⃣</span>
          </div>
        </div>
      );
    case "winner":
      return (
        <div className="relative text-center max-w-md mx-auto">
          <div
            className="absolute inset-0 -z-10 mx-auto hc-rays-spin"
            aria-hidden
            style={{
              width: "min(140vw, 900px)",
              height: "min(140vw, 900px)",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              background:
                "conic-gradient(from 0deg, rgba(251,191,36,0) 0deg, rgba(251,191,36,0.5) 25deg, rgba(251,191,36,0) 50deg, rgba(251,191,36,0.5) 75deg, rgba(251,191,36,0) 100deg, rgba(251,191,36,0.5) 125deg, rgba(251,191,36,0) 150deg, rgba(251,191,36,0.5) 175deg, rgba(251,191,36,0) 200deg, rgba(251,191,36,0.5) 225deg, rgba(251,191,36,0) 250deg, rgba(251,191,36,0.5) 275deg, rgba(251,191,36,0) 300deg, rgba(251,191,36,0.5) 325deg, rgba(251,191,36,0) 360deg)",
              filter: "blur(10px)",
              opacity: data.isTie ? 0 : 0.7,
            }}
          />
          <div className="winner-pop">
            <div className="text-6xl sm:text-7xl winner-crown-bob mb-2">
              {data.isTie ? "🤝" : "🏆"}
            </div>
            <div
              className="font-black tracking-tight leading-none uppercase"
              style={{
                fontSize: "clamp(58px, 15vw, 130px)",
                background: data.isTie
                  ? "linear-gradient(180deg, #e5e7eb, #94a3b8)"
                  : "linear-gradient(180deg, #fff3a0 0%, #f59e0b 50%, #b45309 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                textShadow: "0 8px 28px rgba(0,0,0,0.65)",
              }}
            >
              {data.isTie ? "TIED!" : data.youWon ? "VICTORY!" : "WELL PLAYED"}
            </div>
            <div className="mt-3 text-amber-50 font-extrabold text-base sm:text-xl drop-shadow">
              {data.isTie
                ? "Match tied — a thriller!"
                : `${data.winnerName} wins ${data.margin}!`}
            </div>
          </div>
        </div>
      );
  }
}

function EmojiBurst({ emojis, count }: { emojis: string[]; count: number }) {
  const pieces = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
      const radius = 180 + Math.random() * 180;
      const bx = Math.cos(angle) * radius;
      const by = Math.sin(angle) * radius;
      return {
        emoji: emojis[i % emojis.length],
        bx: `${bx.toFixed(0)}px`,
        by: `${by.toFixed(0)}px`,
        rot: `${(Math.random() * 720 - 360).toFixed(0)}deg`,
        delay: `${(Math.random() * 250).toFixed(0)}ms`,
        size: 22 + Math.floor(Math.random() * 22),
      };
    });
  }, [emojis, count]);
  return (
    <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="hc-burst-piece absolute"
          style={
            {
              fontSize: `${p.size}px`,
              "--bx": p.bx,
              "--by": p.by,
              "--brot": p.rot,
              animationDelay: p.delay,
              filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.55))",
            } as React.CSSProperties
          }
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}

const CONFETTI_COLORS = [
  "#f59e0b", "#fbbf24", "#10b981", "#34d399",
  "#3b82f6", "#60a5fa", "#ef4444", "#f472b6",
];

function ConfettiRain({ count }: { count: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: `${(i / count) * 100 + Math.random() * (100 / count)}%`,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: `${(Math.random() * 1500).toFixed(0)}ms`,
        duration: `${(2.2 + Math.random() * 1.4).toFixed(2)}s`,
        rot: `${(Math.random() * 360).toFixed(0)}deg`,
      })),
    [count],
  );
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: p.left,
            top: "-2vh",
            backgroundColor: p.color,
            animationDelay: p.delay,
            animationDuration: p.duration,
            transform: `rotate(${p.rot})`,
          }}
        />
      ))}
    </div>
  );
}

