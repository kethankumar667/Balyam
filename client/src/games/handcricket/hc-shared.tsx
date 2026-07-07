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
import { motion } from "framer-motion";
import { cn } from "../../lib/cn";
import { RoughBorder, HcSketchHeading } from "./hc-notebook";
import {
  PaperPanel,
  PaperButton,
  PaperCard,
  PaperBadge,
  SketchHeading,
  ROLE_BADGE_TONE,
  ROLE_BADGE_LABEL,
} from "../../components/paper";

/**
 * Shared props for every Hand Cricket shell (picker, mobile, desktop).
 * Identical to what Room.tsx forwards.
 */
export interface HandCricketBoardProps {
  state: HcState;
  players: Player[];
  selfId: string | null;
  messages: ChatMessage[];
  roomCode: string;
  roomPhase: string;
  /** Leaves the room. Threaded from Room.tsx so the fixed-viewport notebook
   *  shell can render its own Leave control (Room.tsx's header is covered by
   *  the z-50 notebook overlay). */
  onLeave?: () => void;
}

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

export function teamLabel(state: HcState, playerId: string, players: Player[]): {
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

export function MatchHeader({
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

export function TeamChip({
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

export function TeamSelectPhase({
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

export function TeamPicker({
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

// ── Notebook palette (squad picker section) ──────────────────────────────
const PAPER   = "#F5E9C4";
const PAPER_L = "#FBF5E0";
const INK     = "#1a2952";
const INK_LT  = "#4a5a82";
const BORDER  = "rgba(46,40,25,0.50)";
const STAMP_G = "#166534";
const STAMP_A = "#92400e";
const GOLD    = "#C5963A";

const _ROLE_COLORS: Record<HcPlayerProfile["role"], string> = {
  batter: "#166534", keeper: "#92400e", allrounder: "#6d28d9", bowler: "#991b1b",
};
const _ROLE_LABELS: Record<HcPlayerProfile["role"], string> = {
  batter: "BAT", keeper: "WK", allrounder: "AR", bowler: "BOWL",
};

function PlayerCardMini({
  p,
  isSelected,
  isCaptain,
  isVC,
  onToggle,
  onCaptain,
  onVC,
  disabled,
  isLegend = false,
  big = false,
}: {
  p: HcPlayerProfile;
  isSelected: boolean;
  isCaptain: boolean;
  isVC: boolean;
  onToggle: () => void;
  onCaptain: () => void;
  onVC: () => void;
  disabled: boolean;
  isLegend?: boolean;
  big?: boolean;
}) {
  const nameSize = big ? 14 : 11;
  const leadSize = big ? 10 : 8;
  const isDisabledLook = disabled && !isSelected;
  const leadPad = big ? "2px 7px" : "1px 5px";
  return (
    <PaperCard
      tone={isSelected ? "selected" : isLegend ? "legend" : "default"}
      disabled={isDisabledLook}
      interactive={!isDisabledLook}
      onClick={() => { if (!disabled || isSelected) onToggle(); }}
      ariaPressed={isSelected}
      ariaLabel={p.name}
      className="min-w-0"
    >
      <div className={cn("relative", big ? "px-2.5 py-2.5" : "px-2 py-2")}>
        <div className="flex items-center gap-1 flex-wrap" style={{ marginBottom: big ? 4 : 2 }}>
          <PaperBadge tone={ROLE_BADGE_TONE[p.role]} size={big ? "md" : "sm"}>
            {ROLE_BADGE_LABEL[p.role]}
          </PaperBadge>
          {isCaptain && <PaperBadge tone="captain" size={big ? "md" : "sm"}>C</PaperBadge>}
          {isVC && <PaperBadge tone="vice" size={big ? "md" : "sm"}>VC</PaperBadge>}
        </div>
        <div className="font-hand font-bold text-hc-ink leading-tight" style={{ fontSize: nameSize }}>
          {isLegend ? `★ ${p.name}` : p.name}
        </div>
        {isSelected && (
          <span className="absolute top-0.5 right-1 text-hc-stamp font-bold" style={{ fontSize: big ? 13 : 11 }}>✓</span>
        )}
        {isSelected && (
          <div className="flex gap-1" style={{ marginTop: big ? 5 : 3 }}>
            <button
              onClick={(e) => { e.stopPropagation(); onCaptain(); }}
              className="font-kalam font-extrabold rounded-[2px] cursor-pointer"
              style={{
                background: isCaptain ? GOLD : "rgba(197,150,58,0.15)",
                color: isCaptain ? "#fff" : GOLD,
                border: `1px solid ${GOLD}`,
                fontSize: leadSize,
                padding: leadPad,
              }}
            >
              C
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onVC(); }}
              className="font-kalam font-extrabold rounded-[2px] cursor-pointer"
              style={{
                background: isVC ? STAMP_A : "rgba(146,64,14,0.12)",
                color: isVC ? "#fff" : STAMP_A,
                border: `1px solid ${STAMP_A}`,
                fontSize: leadSize,
                padding: leadPad,
              }}
            >
              VC
            </button>
          </div>
        )}
      </div>
    </PaperCard>
  );
}

export function SquadPicker({
  state,
  selfId,
  players,
  onChangeTeam,
  isDesktop = false,
}: {
  state: HcState;
  selfId: string;
  players: Player[];
  onChangeTeam: () => void;
  /** Desktop shell passes true so the (shared) picker uses larger type and
   *  wider cards — there's far more room than on a phone. */
  isDesktop?: boolean;
}) {
  const mySelection = state.teamSelections[selfId];
  if (!mySelection?.teamId) return null;
  const myTeamId = mySelection.teamId;
  const roster = getRosterFor(myTeamId, state.options.format);
  if (!roster) return (
    <div style={{ color: "#991b1b", fontFamily: "'Kalam', cursive", fontSize: 14 }}>Roster unavailable.</div>
  );

  const sortedSquad = useMemo(
    () => roster.squad.slice().sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]),
    [roster],
  );
  const sortedExtras = useMemo(
    () => roster.extras.slice().sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]),
    [roster],
  );
  const profilesById = useMemo(() => {
    const m = new Map<string, HcPlayerProfile>();
    for (const p of sortedSquad) m.set(p.id, p);
    for (const p of sortedExtras) m.set(p.id, p);
    return m;
  }, [sortedSquad, sortedExtras]);

  const [selected, setSelected] = useState<Set<string>>(() => {
    return new Set(sortedSquad.slice(0, 11).map((p) => p.id));
  });
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [viceCaptainId, setViceCaptainId] = useState<string | null>(null);

  useEffect(() => {
    if (captainId && !selected.has(captainId)) setCaptainId(null);
    if (viceCaptainId && !selected.has(viceCaptainId)) setViceCaptainId(null);
  }, [selected, captainId, viceCaptainId]);

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

  function confirm() {
    if (selected.size !== 11) return;
    if (!captainId || !viceCaptainId) return;
    if (captainId === viceCaptainId) return;
    getSocket().emit("game:move", {
      type: "confirmSquad",
      data: { playerIds: [...selected], captainId, viceCaptainId },
    });
  }

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
  const composition = useMemo(() => evaluateSquadComposition(xiPlayers), [xiPlayers]);

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

  const hasLeaders = !!captainId && !!viceCaptainId && captainId !== viceCaptainId;
  const ready = composition.isValid && hasLeaders;
  const confirmLabel = !composition.isValid
    ? selected.size !== 11
      ? `Select ${11 - selected.size} more player${11 - selected.size === 1 ? "" : "s"}`
      : "Fix squad composition"
    : !hasLeaders
    ? "Pick Captain & Vice-Captain"
    : "🖊 CONFIRM PLAYING XI";

  return (
    <PaperPanel tone="sheet" strong pad="none" className="font-notebook px-5 pt-4 pb-3.5">
        {/* Change team — top-right */}
        <PaperButton
          variant="ghost"
          size="sm"
          onClick={onChangeTeam}
          className="absolute -top-1 right-0 font-kalam normal-case tracking-normal"
        >
          ← Change Team
        </PaperButton>

        <HcSketchHeading size={isDesktop ? "26px" : "clamp(14px,1.8vw,20px)"}>
          Pick Your XI — {teamDisplay}
        </HcSketchHeading>

        {/* Status + composition checklist */}
        <div className="flex justify-center items-center flex-wrap gap-2.5 my-2.5 mb-3">
          <span className="font-hand text-hc-ink-lt" style={{ fontSize: isDesktop ? 14 : 12 }}>
            Selected <strong className="text-hc-ink">{selected.size}/11</strong>
            {" · "}Format: <strong className="text-hc-ink">{state.options.format.toUpperCase()}</strong>
            {" · "}{oppName}: <em>{oppStatus}</em>
          </span>
          <CompositionChecklist composition={composition} />
        </div>

        {/* Scrollable sections */}
        <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 250px)", paddingRight: 2 }}>
          {/* YOUR XI — ruled-paper panel */}
          <PaperPanel
            pad="none"
            className="mb-2.5 pl-12 pr-2.5 py-2.5"
            style={{
              backgroundImage: [
                "repeating-linear-gradient(to bottom, transparent, transparent 26px, rgba(50,80,160,0.13) 26px, rgba(50,80,160,0.13) 27px)",
                "linear-gradient(to right, rgba(180,30,30,0.32) 0px, rgba(180,30,30,0.32) 1.5px, transparent 1.5px)",
              ].join(", "),
              backgroundPosition: "0 15px, 48px 0",
            }}
          >
            <div className="mb-2">
              <span
                className="font-sketch font-bold text-hc-ink tracking-[0.03em]"
                style={{ fontSize: isDesktop ? 19 : 15 }}
              >
                🏏 Your XI ({xiPlayers.length}/11)
              </span>{" "}
              <span className="italic text-hc-ink-lt" style={{ fontSize: isDesktop ? 13 : 11 }}>
                Click [C] / [VC] on a card to assign captain roles · Click card to drop to bench
              </span>
            </div>
            {xiPlayers.length === 0 ? (
              <div className="italic text-hc-ink-lt py-1" style={{ fontSize: isDesktop ? 13 : 11 }}>
                No players selected yet.
              </div>
            ) : (
              <div
                className="grid"
                style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${isDesktop ? 156 : 116}px, 1fr))`, gap: isDesktop ? 10 : 8 }}
              >
                {xiPlayers.map((p) => (
                  <PlayerCardMini
                    key={p.id}
                    p={p}
                    isSelected
                    big={isDesktop}
                    isCaptain={captainId === p.id}
                    isVC={viceCaptainId === p.id}
                    onToggle={() => toggle(p.id)}
                    onCaptain={() => {
                      setCaptainId(p.id);
                      if (viceCaptainId === p.id) setViceCaptainId(null);
                    }}
                    onVC={() => {
                      setViceCaptainId(p.id);
                      if (captainId === p.id) setCaptainId(null);
                    }}
                    disabled={false}
                  />
                ))}
              </div>
            )}
          </PaperPanel>

          {/* BENCH */}
          {benchPlayers.length > 0 && (
            <SquadGroup
              title={`🪑 Bench (${benchPlayers.length})`}
              subtitle="Current squad members not in your XI"
              players={benchPlayers}
              selected={selected}
              onToggle={toggle}
              disabledHint={selected.size >= 11}
              big={isDesktop}
            />
          )}

          {/* LEGENDS */}
          {legendsBench.length > 0 && (
            <SquadGroup
              title={`★ Legends (${legendsBench.length})`}
              subtitle="Popular past players from this team's history"
              players={legendsBench}
              selected={selected}
              onToggle={toggle}
              disabledHint={selected.size >= 11}
              isLegend
              big={isDesktop}
            />
          )}

          {/* Confirm button */}
          <PaperButton
            variant="confirm"
            size="block"
            onClick={confirm}
            disabled={!ready}
            muted={!ready}
            className={cn("mt-3 tracking-[0.08em]", isDesktop ? "text-lg py-3.5" : "text-[15px]")}
          >
            {confirmLabel}
          </PaperButton>
        </div>
    </PaperPanel>
  );
}

// LeadershipPicker removed — captain/VC are now set via [C]/[VC] buttons on XI cards.

export function CompositionChecklist({
  composition,
}: {
  composition: ReturnType<typeof evaluateSquadComposition>;
}) {
  const items = [
    { label: "11 players", ok: composition.total === 11, count: `${composition.total}/11` },
    { label: "Keeper", ok: composition.keepers >= 1, count: `${composition.keepers}` },
    { label: "Bowling options", ok: composition.bowlingOptions >= 4, count: `${composition.bowlingOptions}/4` },
  ];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {items.map((item) => (
        <span
          key={item.label}
          style={{
            border: `1.5px solid ${item.ok ? STAMP_G : "#b45309"}`,
            background: item.ok ? "rgba(22,101,52,0.08)" : "rgba(180,83,9,0.08)",
            color: item.ok ? STAMP_G : "#b45309",
            borderRadius: 3,
            fontSize: 10,
            fontWeight: 800,
            padding: "1px 7px",
            fontFamily: "'Kalam', cursive",
          }}
        >
          {item.ok ? "✓" : "·"} {item.label} ({item.count})
        </span>
      ))}
    </div>
  );
}

export function SquadGroup({
  title,
  subtitle,
  players,
  selected,
  onToggle,
  accentColor: _accentColor = "#10b981",
  disabledHint = false,
  isLegend = false,
  big = false,
}: {
  title: string;
  subtitle?: string;
  players: HcPlayerProfile[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  accentColor?: string;
  disabledHint?: boolean;
  isLegend?: boolean;
  big?: boolean;
}) {
  return (
    <PaperPanel tone={isLegend ? "legend" : "soft"} pad="sm" className="mb-2.5">
      <div className="flex items-baseline justify-between gap-2 mb-2 pl-0.5">
        <h4 className="font-sketch font-bold text-hc-ink m-0 tracking-[0.03em]" style={{ fontSize: big ? 19 : 15 }}>
          {title}
        </h4>
        {subtitle && (
          <span className="italic text-hc-ink-lt" style={{ fontSize: big ? 13 : 11 }}>{subtitle}</span>
        )}
      </div>
      {players.length === 0 ? (
        <div className="italic text-hc-ink-lt px-0.5 py-1" style={{ fontSize: big ? 13 : 11 }}>Empty.</div>
      ) : (
        <div
          className="grid"
          style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${big ? 156 : 116}px, 1fr))`, gap: big ? 10 : 8 }}
        >
          {players.map((p) => {
            const isSel = selected.has(p.id);
            const isDisabled = !isSel && disabledHint;
            return (
              <PlayerCardMini
                key={p.id}
                p={p}
                isSelected={isSel}
                isCaptain={false}
                isVC={false}
                onToggle={() => onToggle(p.id)}
                onCaptain={() => {}}
                onVC={() => {}}
                disabled={isDisabled}
                isLegend={isLegend}
                big={big}
              />
            );
          })}
        </div>
      )}
    </PaperPanel>
  );
}

export function WaitingForOpponentSquad({
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
    if (state.teamSelections[selfId]?.teamId) {
      getSocket().emit("game:move", {
        type: "selectTeam",
        data: { teamId: state.teamSelections[selfId]!.teamId },
      });
    }
  }

  return (
    <PaperPanel tone="soft" strong pad="lg" className="text-center font-notebook">
      <div className="text-[2.4rem] mb-1">{t0.flag}</div>
      <div className="font-sketch font-bold text-[18px] text-hc-ink mb-0.5">{t0.name}</div>
      <div className="text-xs text-hc-ink-lt mb-2.5">
        XI confirmed · {state.teamSelections[selfId]?.squadPlayerIds?.length ?? 0} players
      </div>
      <div className="text-[13px] text-hc-ink mb-3.5">
        Waiting for <strong>{oppName}</strong>
        {oppSelection?.teamId ? " to confirm their XI…" : " to pick a team…"}
      </div>
      <PaperButton variant="ghost" size="sm" onClick={reopen} className="font-kalam normal-case tracking-normal">
        ← Edit my XI
      </PaperButton>
    </PaperPanel>
  );
}

export function TossPhase({
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
    <PaperPanel tone="soft" pad="lg" className="font-notebook">
      <div className="space-y-4">
        <div className="text-center space-y-1">
          <div className="text-[34px] leading-none">🎲</div>
          <SketchHeading arrows={false} className="text-[20px] tracking-[0.04em]">The Toss</SketchHeading>
          <p className="text-hc-ink-lt text-[13px] max-w-[380px] mx-auto leading-snug">
            Both players pick <strong>1–6</strong>. Even sum → first player wins · odd sum → second player wins.
          </p>
        </div>

        <PickRow disabled={myPick != null} onPick={pick} selected={myPick ?? null} />

        <div className="flex justify-center gap-3">
          <TossStatusPill label="You" value={myPick != null ? String(myPick) : "…"} ready={myPick != null} mine />
          <TossStatusPill label={oppName} value={oppLockedIn ? "✓ ready" : "thinking…"} ready={oppLockedIn} />
        </div>
      </div>
    </PaperPanel>
  );
}

function TossStatusPill({
  label,
  value,
  ready,
  mine = false,
}: {
  label: string;
  value: string;
  ready: boolean;
  mine?: boolean;
}) {
  return (
    <div
      style={{
        minWidth: 130,
        textAlign: "center",
        background: mine ? "rgba(22,101,52,0.08)" : "rgba(245,233,196,0.7)",
        border: `1.5px ${ready ? "solid" : "dashed"} ${ready ? "#166534" : "rgba(46,40,25,0.45)"}`,
        borderRadius: 8,
        padding: "6px 12px",
        fontFamily: "'Kalam', cursive",
      }}
    >
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#4a5a82", fontWeight: 800 }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: ready ? "#166534" : "#1a2952", lineHeight: 1.2 }}>
        {value}
      </div>
    </div>
  );
}

export function TossChoicePhase({
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
      <PaperPanel tone="soft" pad="lg" className="font-notebook text-hc-ink-lt">
        <div className="text-center space-y-2">
          <div className="text-[34px] leading-none">🪙</div>
          <div className="font-kalam font-extrabold text-[18px] text-hc-ink">
            {winnerName} won the toss
          </div>
          <div className="text-[13px]">
            Sum was <strong>{state.tossSum}</strong> — they're choosing to bat or bowl…
          </div>
        </div>
      </PaperPanel>
    );
  }
  return (
    <PaperPanel tone="soft" pad="lg" className="font-notebook">
      <div className="text-center space-y-5">
        <div className="space-y-1">
          <div className="text-[34px] leading-none">🎉</div>
          <SketchHeading arrows={false} className="text-[20px] tracking-normal">You won the toss!</SketchHeading>
          <div className="text-hc-ink-lt text-[13px]">
            Sum was <strong>{state.tossSum}</strong>. What would you like to do?
          </div>
        </div>
        <div className="flex justify-center gap-4 flex-wrap">
          <TossChoiceButton emoji="🏏" label="BAT first" sub="Set a target" variant="solidGreen" onClick={() => choose("bat")} />
          <TossChoiceButton emoji="⚾" label="BOWL first" sub="Chase it down" variant="solidBlue" onClick={() => choose("bowl")} />
        </div>
      </div>
    </PaperPanel>
  );
}

function TossChoiceButton({
  emoji,
  label,
  sub,
  variant,
  onClick,
}: {
  emoji: string;
  label: string;
  sub: string;
  variant: "solidGreen" | "solidBlue";
  onClick: () => void;
}) {
  return (
    <PaperButton variant={variant} onClick={onClick} className="min-w-[150px] px-6 py-4 rounded-lg shadow-[0_4px_14px_rgba(0,0,0,0.22)]">
      <span className="flex flex-col items-center">
        <span className="text-[30px] leading-none">{emoji}</span>
        <span className="font-black text-[17px] tracking-[0.04em] mt-1">{label}</span>
        <span className="text-[11px] opacity-85 mt-0.5 font-normal">{sub}</span>
      </span>
    </PaperButton>
  );
}

export function InningsPhase({
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
          <span style={myRole === "batter"
            ? { background: "rgba(22,101,52,0.15)", color: "#166534", border: "1px solid #166534", borderRadius: 20, padding: "3px 10px", fontWeight: 700, fontSize: 12 }
            : { background: "rgba(153,27,27,0.15)", color: "#991b1b", border: "1px solid #991b1b", borderRadius: 20, padding: "3px 10px", fontWeight: 700, fontSize: 12 }
          }>
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

          <div className="flex justify-center gap-6 text-xs" style={{ color: "#4a5a82" }}>
            <div>You: {myPick != null && typeof myPick === "number" && myPick > 0 ? "✓ locked" : "thinking…"}</div>
            <div>Opp: {oppLockedIn ? "✓ locked" : "thinking…"}</div>
          </div>
        </>
      )}

      {target != null && (
        <div className="text-center text-sm" style={{ color: "#92400e", fontWeight: 700, fontSize: 13 }}>
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

export function CurrentPlayersBar({
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

export function PlayerCard({
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
    <PaperPanel tone="soft" pad="none" className={cn("px-2.5 py-1.5", dimmed && "opacity-80")}>
      <div className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-hc-ink-lt">
        {label}
        {isMine && <span className="ml-1 text-hc-stamp text-[9px] font-extrabold">· YOU</span>}
      </div>
      <div className="leading-tight font-bold text-[13px] text-hc-ink">{name}</div>
      <div className="tabular-nums text-[11px] text-hc-ink-lt">{sub}</div>
    </PaperPanel>
  );
}

export function BowlerPicker({
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
      <PaperPanel tone="soft" pad="md" className="text-center font-notebook">
        <span className="text-hc-ink-lt">⚾ Waiting for </span>
        <span className="font-bold text-hc-ink">{bowlingName}</span>
        <span className="text-hc-ink-lt"> to pick the bowler for over {Math.floor(innings.balls / 6) + 1}…</span>
      </PaperPanel>
    );
  }

  // Only bowlers and all-rounders can bowl.
  const bowlersOnly = candidates
    .filter((p) => p.role === "bowler" || p.role === "allrounder")
    .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);
  const maxOvers = HC_MAX_OVERS_PER_BOWLER[state.options.format];
  const quotaLabel = maxOvers == null ? "no limit" : `${maxOvers} overs max`;

  return (
    <PaperPanel tone="soft" pad="md" className="space-y-3 font-notebook">
      <div className="text-center font-sketch font-bold text-hc-ink text-[15px]">
        🏏 Pick your bowler for over {Math.floor(innings.balls / 6) + 1}
      </div>
      {bowlersOnly.length === 0 ? (
        <div className="text-center text-sm font-bold py-4 text-hc-amber">
          No bowlers or all-rounders in your XI. (This shouldn't happen if composition rules held.)
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {bowlersOnly.map((p) => {
            const stats = innings.bowlerStats[p.id];
            const completedOvers = stats ? Math.floor(stats.balls / 6) : 0;
            const atQuota = maxOvers != null && completedOvers >= maxOvers;
            return (
              <PaperCard
                key={p.id}
                tone="default"
                disabled={atQuota}
                interactive={!atQuota}
                onClick={() => !atQuota && pickBowler(p.id)}
                ariaLabel={p.name}
              >
                <div className="px-2 py-1.5 text-left">
                  <div className="flex items-center gap-1.5">
                    <PaperBadge tone={p.role === "bowler" ? "bowler" : "allrounder"}>
                      {p.role === "bowler" ? "BOWL" : "AR"}
                    </PaperBadge>
                    {p.isCaptain && <PaperBadge tone="captain">C</PaperBadge>}
                    {atQuota && <PaperBadge tone="bowler" className="ml-auto">MAX</PaperBadge>}
                  </div>
                  <div className="text-xs font-bold mt-1 leading-tight text-hc-ink">{p.name}</div>
                  <div className="flex items-center justify-between mt-0.5 gap-2">
                    {stats && (stats.balls > 0 || stats.wickets > 0) ? (
                      <span className="tabular-nums text-[10px] text-hc-ink-lt">
                        {Math.floor(stats.balls / 6)}.{stats.balls % 6}-{stats.wickets}-{stats.runs}
                      </span>
                    ) : (
                      <span className="italic text-[10px] text-hc-ink-lt">unused</span>
                    )}
                    {maxOvers != null && (
                      <span className="font-bold tabular-nums text-[9px] px-1.5 rounded-[3px] bg-hc-ink/10 text-hc-ink-lt">
                        {completedOvers}/{maxOvers}
                      </span>
                    )}
                  </div>
                </div>
              </PaperCard>
            );
          })}
        </div>
      )}
      <div className="text-center text-[11px] text-hc-ink-lt">
        Only bowlers and all-rounders can bowl · format quota: {quotaLabel}
      </div>
    </PaperPanel>
  );
}

export function Scoreboard({
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
    <PaperPanel tone="soft" strong pad="none" className="flex items-center justify-between gap-3 px-3.5 py-2.5 font-notebook">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{batterTeam.flag}</span>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-hc-ink-lt">
            Innings {innings.number} · {batterTeam.short} ({batterTeam.playerName}) batting
          </div>
          <div className="text-5xl font-black tabular-nums leading-none text-hc-ink">
            {innings.runs}<span className="text-hc-ink-red">/{innings.wickets}</span>
          </div>
          <div className="text-xs tabular-nums text-hc-ink-lt">
            Overs {oversBowled}.{ballsThisOver} / {innings.overs}
          </div>
        </div>
      </div>
      {target != null && (
        <div className="text-right text-hc-amber">
          <div className="text-[10px] uppercase tracking-wider font-bold">Target</div>
          <div className="text-2xl font-extrabold tabular-nums">{target}</div>
        </div>
      )}
    </PaperPanel>
  );
}

export function RevealStage({
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
        <div
          className="text-3xl font-extrabold"
          style={{ color: reveal.wicket ? "#f43f5e" : reveal.isBoundary ? "#d97706" : "#1a2952" }}
        >
          {reveal.wicket ? "WICKET!" : reveal.runs === 4 ? "FOUR!" : reveal.runs === 6 ? "SIX!" : `+${reveal.runs}`}
        </div>
        <RevealHand label="Opp" pick={oppShown} side="right" />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center gap-6 py-3">
      <RevealHand label="You" pick={myPick} side="left" pending={myPick == null} />
      <div className="text-xl" style={{ color: "#4a5a82" }}>vs</div>
      <RevealHand label="Opp" pick={null} side="right" pending={!oppLockedIn} hidden={oppLockedIn} />
    </div>
  );
}

export function RevealHand({
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
        style={{ color: "#1a2952" }}
      >
        {pick != null ? HAND_FACES[pick] ?? pick : hidden ? "🤐" : pending ? "❓" : "—"}
      </div>
      <div className="text-xs mt-1" style={{ color: "#4a5a82" }}>{label}{pick != null ? ` · ${pick}` : ""}</div>
    </div>
  );
}

export function PickRow({
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
            background: "rgba(180,120,0,0.12)",
            color: "#b45309",
            border: "1px solid rgba(180,120,0,0.4)",
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
              className="relative flex flex-col items-center justify-center font-bold transition"
              style={selected === n
                ? { background: "rgba(22,101,52,0.15)", border: "1.5px solid #166534", color: "#166534", borderRadius: 6, width: 44, height: 44, fontWeight: 800, fontSize: 18 }
                : !isAllowed
                ? { background: "#FBF5E0", border: "1.5px dashed rgba(46,40,25,0.55)", color: "#1a2952", borderRadius: 6, width: 44, height: 44, fontWeight: 800, fontSize: 18, opacity: 0.45, cursor: "not-allowed" }
                : disabled
                ? { background: "#FBF5E0", border: "1.5px dashed rgba(46,40,25,0.55)", color: "#1a2952", borderRadius: 6, width: 44, height: 44, fontWeight: 800, fontSize: 18, opacity: 0.45, cursor: "not-allowed" }
                : { background: "#FBF5E0", border: "1.5px dashed rgba(46,40,25,0.55)", color: "#1a2952", borderRadius: 6, width: 44, height: 44, fontWeight: 800, fontSize: 18 }
              }
            >
              <span className="text-base leading-none">{HAND_FACES[n] ?? n}</span>
              <span className="text-xs mt-1 opacity-80">{n}</span>
              {!isAllowed && (
                <span className="absolute top-0.5 right-1 text-[8px] font-extrabold" style={{ color: "#991b1b" }}>
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

export function PowerplayBanner({
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
        <div className="text-center mt-1 text-[11px] font-extrabold" style={{ color: "#92400e" }}>
          ⚠ This ball is restricted — you may only pick 1, 2, or 3
        </div>
      )}
      {bowlerRestricted && myRole === "batter" && (
        <div className="text-center mt-1 text-[11px] font-extrabold" style={{ color: "#166534" }}>
          ✨ This ball: bowler can only pick 1-3. Pick 4, 5, or 6 to score big risk-free!
        </div>
      )}
    </div>
  );
}

export function RecentBalls({ history }: { history: HcBall[] }) {
  return (
    <PaperPanel tone="soft" pad="sm" className="font-notebook">
      <div className="text-[10px] uppercase tracking-[0.12em] text-hc-ink-lt mb-1 pl-1">
        This over
      </div>
      <div className="flex flex-wrap gap-1">
        {history.map((b, i) => (
          <span
            key={`${b.overNumber}-${b.ballInOver}-${i}`}
            className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold font-kalam border-[1.5px] border-dashed border-hc-border",
              b.wicket
                ? "bg-hc-ink-red/15 text-hc-ink-red"
                : b.isBoundary
                ? "bg-hc-gold/15 text-hc-amber"
                : "bg-hc-paper/80 text-hc-ink",
            )}
            title={`Over ${b.overNumber}.${b.ballInOver}: batter ${b.batterPick} vs bowler ${b.bowlerPick}`}
          >
            {b.wicket ? "W" : b.runs}
          </span>
        ))}
      </div>
    </PaperPanel>
  );
}

export function MatchSummary({
  state,
  players,
  selfId,
}: {
  state: HcState;
  players: Player[];
  selfId: string;
}) {
  const INK = "#1a2952";
  const INK_LT = "#4a5a82";
  const PAPER_L = "#FBF5E0";
  const STAMP_G = "#166534";
  const STAMP_R = "#991b1b";

  const youWon = state.winnerId === selfId;
  const winnerName = players.find((p) => p.id === state.winnerId)?.name ?? "—";
  const winnerTeam = state.winnerId
    ? teamLabel(state, state.winnerId, players)
    : null;
  return (
    <div className="space-y-3 font-notebook">
      <div
        className="rounded-xl p-4 text-center bg-hc-paper-l border-2"
        style={{
          borderColor: state.result === "tie" ? INK_LT : youWon ? STAMP_G : STAMP_R,
          boxShadow: youWon ? "0 0 18px rgba(22,101,52,0.20)" : undefined,
        }}
      >
        <div className="text-4xl mb-1">
          {state.result === "tie" ? "🤝" : youWon ? "🏆" : "👏"}
        </div>
        <div className="font-sketch text-[20px] font-bold text-hc-ink">
          {state.result === "tie"
            ? "Match tied!"
            : winnerTeam
            ? `${winnerTeam.flag} ${winnerTeam.name} (${winnerName}) win!`
            : "Match over"}
        </div>
        <div className="text-sm text-hc-ink-lt mt-1">
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

export function summarizeMatch(state: HcState): string {
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

export function InningsScorecard({
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
    <PaperPanel tone="default" pad="none" className="space-y-3 p-2.5 font-notebook">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{batter.flag}</span>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-hc-ink-lt">
              Innings {innings.number} · {batter.short} ({batter.playerName})
            </div>
            <div className="tabular-nums font-extrabold text-2xl leading-none text-hc-ink">
              {innings.runs}<span className="text-hc-ink-red">/{innings.wickets}</span>
              {" "}<span className="text-xs font-normal text-hc-ink-lt">({oversBowled}.{ballsThisOver} ov)</span>
            </div>
          </div>
        </div>
        <div className="text-[11px] text-hc-ink-lt text-right">
          <div>Bowled by {bowler.short} ({bowler.playerName})</div>
          {innings.endedReason && (
            <div className="text-hc-amber font-bold">
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
    </PaperPanel>
  );
}

export function BatterTable({
  rows,
  nameOf,
  nameOfBowler,
}: {
  rows: { id: string; stats: HcBatterStats | undefined }[];
  nameOf: (id: string) => string;
  nameOfBowler: (id: string) => string;
}) {
  return (
    <div style={{ background: "rgba(245,233,196,0.70)", border: "1.5px dashed rgba(46,40,25,0.35)", borderRadius: 6, padding: 8 }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#166534", fontWeight: 800, marginBottom: 4, paddingLeft: 4, fontFamily: "'Kalam', cursive" }}>
        🏏 Batting
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr style={{ color: "#4a5a82", fontSize: 10, fontFamily: "'Kalam', cursive" }}>
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
              <tr key={id} style={{ color: "#1a2952", fontFamily: "'Kalam', cursive" }}>
                <td className="py-0.5">
                  <div className="font-bold">{nameOf(id)}{!stats.isOut ? "*" : ""}</div>
                  {stats.isOut && stats.dismissedBy && (
                    <div style={{ fontSize: 10, color: "#991b1b", opacity: 0.75 }}>b {nameOfBowler(stats.dismissedBy)}</div>
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

export function BowlerTable({
  rows,
  nameOf,
}: {
  rows: { id: string; stats: HcBowlerStats }[];
  nameOf: (id: string) => string;
}) {
  return (
    <div style={{ background: "rgba(245,233,196,0.70)", border: "1.5px dashed rgba(46,40,25,0.35)", borderRadius: 6, padding: 8 }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#1d4ed8", fontWeight: 800, marginBottom: 4, paddingLeft: 4, fontFamily: "'Kalam', cursive" }}>
        ⚾ Bowling
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr style={{ color: "#4a5a82", fontSize: 10, fontFamily: "'Kalam', cursive" }}>
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
              <tr key={id} style={{ color: "#1a2952", fontFamily: "'Kalam', cursive" }}>
                <td className="py-0.5 font-bold">{nameOf(id)}</td>
                <td className="text-right tabular-nums">{overs}</td>
                <td className="text-right tabular-nums">{stats.runs}</td>
                <td className="text-right tabular-nums font-bold" style={{ color: "#92400e" }}>{stats.wickets}</td>
                <td className="text-right tabular-nums">{econ}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <PaperPanel tone="soft" pad="none" className="px-1.5 py-1 text-center font-notebook">
      <div className="text-[9px] uppercase tracking-[0.10em] font-extrabold text-hc-ink-lt">{label}</div>
      <div className="tabular-nums font-extrabold text-base text-hc-ink">{value}</div>
    </PaperPanel>
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

export function HcCelebrationLayer({
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

export function HcCelebrationOverlay({ data }: { data: HcCelebrationData }) {
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

export function HcCelebrationCard({ data }: { data: HcCelebrationData }) {
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

export function EmojiBurst({ emojis, count }: { emojis: string[]; count: number }) {
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

export function ConfettiRain({ count }: { count: number }) {
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


/* ─────────────────────────── Phase router ─────────────────────────── */

/**
 * Routes to the active phase's component. Identical between the mobile and
 * desktop shells — extracted here so neither shell duplicates the switch.
 * Every phase component below is itself viewport-agnostic (pure Tailwind
 * `sm:`/`lg:` density, unchanged from the original single-tree board); only
 * the shells' surrounding arrangement (room-rail placement, padding) differs.
 */
export function HcPhaseBody({
  state,
  selfId,
  players,
}: {
  state: HcState;
  selfId: string;
  players: Player[];
}) {
  return (
    <>
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
    </>
  );
}
