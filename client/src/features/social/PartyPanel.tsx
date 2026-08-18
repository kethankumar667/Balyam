import { useState } from "react";
import type { Party } from "@shared/party/Party";
import { ChampionCrownIcon, SwordsClashIcon, LevelSparkleIcon } from "../../design-system/icons";
import { SURFACES } from "../../design-system/dls";

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
      <div className={`${SURFACES.cardElevated} p-6 sm:p-8 text-center space-y-4`}>
        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-3xl mx-auto shadow-inner">
          <SwordsClashIcon size={32} className="text-amber-400" />
        </div>
        <div className="space-y-1 max-w-sm mx-auto">
          <h3 className="text-lg font-black text-stone-100 dark:text-zinc-100 tracking-tight">
            Create a Multiplayer Squad
          </h3>
          <p className="text-xs text-stone-400 font-mono">
            Form a party with up to 4 friends to queue together for rooms and championship brackets.
          </p>
        </div>
        <button
          onClick={onCreateParty}
          className="bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-black px-6 py-3 rounded-2xl text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/20 active:scale-98"
        >
          Assemble Party
        </button>
      </div>
    );
  }

  const isLeader = party.leaderId === currentPlayerId;
  const currentMember = party.members.find((m) => m.playerId === currentPlayerId);

  return (
    <div className={`${SURFACES.cardElevated} p-6 sm:p-8 space-y-6 relative overflow-hidden`}>
      {/* Radiant Party Aura */}
      <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-800">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-black text-amber-400 uppercase tracking-widest bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30">
              SQUAD LOBBY
            </span>
            <span className="text-xs font-mono font-bold text-stone-400">
              {party.members.length} / {party.maxMembers} Members
            </span>
          </div>
          <h3 className="text-xl font-black text-stone-100">Party Headquarters</h3>
        </div>

        <div className="flex items-center gap-2">
          {currentMember && (
            <button
              onClick={() => onSetReady(!currentMember.isReady)}
              className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition uppercase ${
                currentMember.isReady
                  ? "bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/20"
                  : "bg-stone-800 text-stone-300 border border-stone-700"
              }`}
            >
              {currentMember.isReady ? "✓ Ready for Match" : "Not Ready"}
            </button>
          )}

          {isLeader ? (
            <button
              onClick={onDisbandParty}
              className="bg-stone-800/80 hover:bg-rose-950/50 text-stone-400 hover:text-rose-300 px-3 py-2 rounded-xl text-xs font-mono border border-stone-700 transition"
            >
              Disband
            </button>
          ) : (
            <button
              onClick={onLeaveParty}
              className="bg-stone-800/80 hover:bg-rose-950/50 text-stone-400 hover:text-rose-300 px-3 py-2 rounded-xl text-xs font-mono border border-stone-700 transition"
            >
              Leave Party
            </button>
          )}
        </div>
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {party.members.map((member) => (
          <div
            key={member.playerId}
            className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 transition ${
              member.isReady
                ? "bg-stone-900/90 border-emerald-500/50 shadow-[0_0_16px_rgba(16,185,129,0.15)]"
                : "bg-stone-900/60 border-stone-800"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-center text-2xl shadow">
                {member.avatar || "👤"}
              </div>
              {member.isLeader && (
                <span className="text-[10px] font-mono font-black text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ChampionCrownIcon size={10} /> LEADER
                </span>
              )}
            </div>

            <div>
              <h4 className="font-bold text-sm text-stone-100">{member.displayName}</h4>
              <span className="text-[10px] font-mono text-stone-500 block">
                ID: {member.playerId}
              </span>
            </div>

            <div className="pt-2 border-t border-stone-800/60 flex items-center justify-between text-xs font-mono">
              <span className="text-stone-400">Status</span>
              <span
                className={`font-bold ${
                  member.isReady ? "text-emerald-400" : "text-amber-400"
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
        <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-4 space-y-3">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
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
              className="flex-1 bg-stone-900 border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500 font-mono"
            />
            <button
              onClick={() => onSetTarget(undefined, roomCodeInput.trim())}
              className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs px-4 py-2 rounded-xl transition uppercase font-mono tracking-wider shrink-0"
            >
              Set Squad Target
            </button>
          </div>
          {party.targetRoomCode && (
            <p className="text-xs font-mono text-emerald-400">
              Active Squad Objective: Room <strong>{party.targetRoomCode}</strong>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
