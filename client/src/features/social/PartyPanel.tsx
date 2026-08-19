import { useState } from "react";
import type { Party } from "@shared/party/Party";
import { ChampionCrownIcon, SwordsClashIcon, LevelSparkleIcon } from "../../design-system/icons";
import SeatAvatar from "../../components/profile/SeatAvatar";

interface PartyPanelProps {
  party: Party | null;
  currentPlayerId: string;
  onCreateParty: () => Promise<void>;
  onSetReady: (isReady: boolean) => Promise<void>;
  onLeaveParty: () => Promise<void>;
  onDisbandParty: () => Promise<void>;
  onSetTarget: (game?: string, roomCode?: string) => Promise<void>;
}

export default function PartyPanel({
  party,
  currentPlayerId,
  onCreateParty,
  onSetReady,
  onLeaveParty,
  onDisbandParty,
  onSetTarget,
}: PartyPanelProps) {
  const [roomCodeInput, setRoomCodeInput] = useState("");

  if (!party) {
    return (
      <div className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-3xl p-6 sm:p-10 text-center space-y-4 shadow-sm relative overflow-hidden">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-3xl mx-auto shadow-inner text-purple-500">
          <SwordsClashIcon size={32} />
        </div>
        <div className="space-y-1.5 max-w-md mx-auto">
          <h3 className="text-xl font-black text-[var(--auth-ink)] tracking-tight">
            Create a Multiplayer Squad
          </h3>
          <p className="text-xs text-[var(--auth-ink-soft)] leading-relaxed">
            Form a party with up to 4 friends to queue together for rooms and weekly championship brackets with double XP bonuses!
          </p>
        </div>
        <button
          onClick={onCreateParty}
          className="bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-black px-6 py-3 rounded-2xl text-xs uppercase font-mono tracking-wider transition shadow-md shadow-amber-500/20 active:scale-98 flex items-center gap-2 mx-auto"
        >
          <SwordsClashIcon size={14} />
          Assemble Party
        </button>
      </div>
    );
  }

  const isLeader = party.leaderId === currentPlayerId;
  const currentMember = party.members.find((m) => m.playerId === currentPlayerId);

  return (
    <div className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-3xl p-6 sm:p-8 space-y-6 relative overflow-hidden shadow-sm">
      {/* Radiant Party Aura */}
      <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--auth-field-edge)]">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-black text-purple-500 uppercase tracking-widest bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
              SQUAD LOBBY
            </span>
            <span className="text-xs font-mono font-bold text-[var(--auth-ink-soft)]">
              {party.members.length} / {party.maxMembers} Members
            </span>
          </div>
          <h3 className="text-xl font-black text-[var(--auth-ink)]">Party Headquarters</h3>
        </div>

        <div className="flex items-center gap-2">
          {currentMember && (
            <button
              onClick={() => onSetReady(!currentMember.isReady)}
              className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition uppercase ${
                currentMember.isReady
                  ? "bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20"
                  : "bg-[var(--auth-field)] text-[var(--auth-ink)] border border-[var(--auth-field-edge)]"
              }`}
            >
              {currentMember.isReady ? "✓ Ready for Match" : "Not Ready"}
            </button>
          )}

          {isLeader ? (
            <button
              onClick={onDisbandParty}
              className="bg-[var(--auth-field)] hover:bg-rose-500/15 text-[var(--auth-ink-soft)] hover:text-rose-500 px-3 py-2 rounded-xl text-xs font-mono border border-[var(--auth-field-edge)] transition"
            >
              Disband
            </button>
          ) : (
            <button
              onClick={onLeaveParty}
              className="bg-[var(--auth-field)] hover:bg-rose-500/15 text-[var(--auth-ink-soft)] hover:text-rose-500 px-3 py-2 rounded-xl text-xs font-mono border border-[var(--auth-field-edge)] transition"
            >
              Leave Party
            </button>
          )}
        </div>
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {party.members.map((member) => (
          <div
            key={member.playerId}
            className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 transition ${
              member.isReady
                ? "bg-[var(--auth-card)] border-emerald-500/50 shadow-sm"
                : "bg-[var(--auth-field)] border-[var(--auth-field-edge)]"
            }`}
          >
            <div className="flex items-center justify-between">
              <SeatAvatar
                avatar={member.avatar}
                name={member.displayName}
                className="w-12 h-12 rounded-2xl border border-[var(--auth-field-edge)] shadow-inner"
                textClassName="text-xl"
              />
              {member.isLeader && (
                <span className="text-[10px] font-mono font-black text-amber-500 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ChampionCrownIcon size={10} /> LEADER
                </span>
              )}
            </div>

            <div>
              <h4 className="font-bold text-sm text-[var(--auth-ink)]">{member.displayName}</h4>
              <span className="text-[10px] font-mono text-[var(--auth-ink-soft)] block">
                ID: {member.playerId}
              </span>
            </div>

            <div className="pt-2 border-t border-[var(--auth-field-edge)] flex items-center justify-between text-xs font-mono">
              <span className="text-[var(--auth-ink-soft)]">Status</span>
              <span
                className={`font-bold ${
                  member.isReady ? "text-emerald-500" : "text-amber-500"
                }`}
              >
                {member.isReady ? "READY" : "PREPARING"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Leader Target Selector */}
      {isLeader && (
        <div className="bg-[var(--auth-field)] border border-[var(--auth-field-edge)] rounded-2xl p-4 space-y-3">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
            <LevelSparkleIcon size={14} />
            Leader Room Target
          </h4>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter Target Room Code (e.g. LUDO99)..."
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
              maxLength={8}
              className="flex-1 bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-xl px-3.5 py-2 text-xs text-[var(--auth-ink)] placeholder-[var(--auth-ink-soft)] focus:outline-none focus:border-amber-500 font-mono"
            />
            <button
              onClick={() => onSetTarget(undefined, roomCodeInput.trim())}
              className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs px-4 py-2 rounded-xl transition uppercase font-mono tracking-wider shrink-0"
            >
              Set Target
            </button>
          </div>
          {party.targetRoomCode && (
            <p className="text-xs font-mono text-emerald-500">
              Active Squad Objective: Room <strong>{party.targetRoomCode}</strong>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
