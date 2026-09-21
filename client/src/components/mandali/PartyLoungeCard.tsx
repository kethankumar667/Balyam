/**
 * BHALYAM Mandali — Party Lounge Card
 *
 * Renders an active game squad card inside a Mandali's squad-formation lounge.
 * Shows the target game, leader, filled/open player slots, and one-click
 * join/leave/launch handoff controls.
 *
 * Requirements:
 * - Touch targets >= 44x44px.
 * - Zero usage of Sparkles from lucide-react.
 * - Golden focus ring for WCAG 2.1 AA compliance.
 */

import React from "react";
import { Gamepad2, Users, Play, LogOut, CheckCircle2, Crown } from "lucide-react";
import type { MandaliParty } from "@shared/mandali/types.js";

export interface PartyLoungeCardProps {
  party: MandaliParty;
  currentUserId: string | null;
  onJoin: (partyId: string) => void;
  onLeave: (partyId: string) => void;
  onLaunch: (partyId: string) => void;
  disabled?: boolean;
}

export const PartyLoungeCard: React.FC<PartyLoungeCardProps> = ({
  party,
  currentUserId,
  onJoin,
  onLeave,
  onLaunch,
  disabled = false,
}) => {
  const isMember = party.members.some((m) => m.playerId === currentUserId);
  const isLeader = party.leaderId === currentUserId;
  const isFull = party.members.length >= party.slots;
  const canLaunch = isLeader && party.members.length >= 1 && party.status === "FORMING";

  return (
    <div className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-4 sm:p-5 shadow-lg transition-all duration-200 flex flex-col justify-between">
      {/* Top row: Game and Status badge */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base leading-snug">{party.title}</h4>
              <p className="text-xs text-amber-400/90 font-medium capitalize">
                {party.game} • {party.modeId || "Casual Match"}
              </p>
            </div>
          </div>

          <span
            className={`text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider ${
              party.status === "FORMING"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : party.status === "IN_GAME"
                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            {party.status}
          </span>
        </div>

        {/* Member Slots Visualization */}
        <div className="my-4 bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              Squad Slots
            </span>
            <span className="font-semibold text-white">
              {party.members.length} / {party.slots}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: party.slots }).map((_, idx) => {
              const member = party.members[idx];
              if (member) {
                const memberIsLeader = member.playerId === party.leaderId;
                return (
                  <div
                    key={member.playerId || idx}
                    className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-800/60 border border-slate-700/60 relative group"
                    title={member.displayName}
                  >
                    {memberIsLeader && (
                      <Crown className="w-3.5 h-3.5 text-amber-400 absolute -top-1.5 -right-1.5" />
                    )}
                    <img
                      src={`/Avatars/${member.avatar || "avatar_1"}.png`}
                      alt={member.displayName}
                      className="w-8 h-8 rounded-full bg-slate-700 object-cover border border-amber-500/30"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "/logo.png";
                      }}
                    />
                    <span className="text-[10px] text-slate-200 font-medium truncate w-full text-center mt-1">
                      {member.displayName.split(" ")[0]}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={`empty_${idx}`}
                  className="flex flex-col items-center justify-center p-2 rounded-lg border-2 border-dashed border-slate-800/80 bg-slate-900/30 text-slate-600 min-h-[56px]"
                >
                  <span className="text-xs font-semibold text-slate-600">+</span>
                  <span className="text-[10px] text-slate-500 font-normal">Open</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action CTA Bar */}
      <div className="pt-2 flex items-center gap-2">
        {isMember ? (
          <>
            {isLeader ? (
              <button
                type="button"
                onClick={() => onLaunch(party.partyId)}
                disabled={disabled || party.status !== "FORMING"}
                className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 flex items-center justify-center gap-2 shadow-md hover:shadow-amber-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none"
              >
                <Play className="w-4 h-4 fill-current" />
                Launch Match
              </button>
            ) : (
              <div className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center gap-2 text-xs font-semibold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                Ready in Squad
              </div>
            )}

            <button
              type="button"
              onClick={() => onLeave(party.partyId)}
              disabled={disabled}
              className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 flex items-center justify-center active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:outline-none"
              title="Leave Squad"
              aria-label="Leave Squad"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => onJoin(party.partyId)}
            disabled={disabled || isFull || party.status !== "FORMING"}
            className="w-full min-h-[44px] px-4 py-2.5 rounded-xl font-bold text-sm bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-white border border-slate-700 hover:border-amber-400 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none"
          >
            <Users className="w-4 h-4" />
            {isFull ? "Squad Full" : "Join Squad"}
          </button>
        )}
      </div>
    </div>
  );
};
