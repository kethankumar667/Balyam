/**
 * BHALYAM Mandali — Futuristic Party Lounge Card
 *
 * FAANG/MAANG-grade holographic squad card inside Mandali squad lounge.
 * Supports full Light & Dark mode themes with glassmorphism and slot telemetry.
 *
 * Requirements:
 * - Dual Light (`data-theme="light"`) and Dark (`data-theme="dark"`) mode support.
 * - Touch targets >= 44x44px.
 * - Zero usage of Sparkles from lucide-react.
 * - Golden focus ring for WCAG 2.1 AA compliance.
 */

import React from "react";
import { Gamepad2, Users, Play, LogOut, CheckCircle2, Crown, Zap } from "lucide-react";
import type { MandaliParty } from "@shared/mandali/types.js";

function getAvatarUrl(avatar?: string): string {
  if (!avatar) return "/Bhalyam-logo.png";
  if (avatar.startsWith("/") || avatar.startsWith("http")) return avatar;
  if (avatar.endsWith(".jpg") || avatar.endsWith(".png") || avatar.endsWith(".webp") || avatar.endsWith(".svg")) {
    return `/Avatars/${avatar}`;
  }
  return `/Avatars/${avatar}.png`;
}

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

  return (
    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 hover:border-amber-500/60 dark:hover:border-amber-500/60 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-xl dark:shadow-2xl transition-all duration-200 flex flex-col justify-between group relative overflow-hidden">
      {/* Ambient glow accent top edge */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Top row: Game icon & Title */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-inner group-hover:scale-105 transition-transform">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900 dark:text-white text-base leading-snug tracking-tight">
                {party.title}
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-400/90 font-semibold capitalize flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {party.game} • {party.modeId || "Casual Arena"}
              </p>
            </div>
          </div>

          <span
            className={`text-[11px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
              party.status === "FORMING"
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                : party.status === "IN_GAME"
                ? "bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30"
                : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}
          >
            {party.status}
          </span>
        </div>

        {/* Member Slots Visualizer Pod */}
        <div className="my-4 bg-slate-50/80 dark:bg-slate-950/70 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-2.5">
            <span className="flex items-center gap-1.5 font-medium">
              <Users className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              Squad Slots
            </span>
            <span className="font-bold text-slate-900 dark:text-white">
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
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-xs relative group/slot"
                    title={member.displayName}
                  >
                    {memberIsLeader && (
                      <Crown className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 absolute -top-1.5 -right-1.5 drop-shadow" />
                    )}
                    <img
                      src={getAvatarUrl(member.avatar)}
                      alt={member.displayName}
                      className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 object-cover border-2 border-amber-500/40"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "/Bhalyam-logo.png";
                      }}
                    />
                    <span className="text-[10px] text-slate-800 dark:text-slate-200 font-semibold truncate w-full text-center mt-1">
                      {member.displayName.split(" ")[0]}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={`empty_${idx}`}
                  className="flex flex-col items-center justify-center p-2 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-800 bg-slate-100/40 dark:bg-slate-900/30 text-slate-400 dark:text-slate-600 min-h-[56px] transition-colors"
                >
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-600">+</span>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-500">Open</span>
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
                className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 flex items-center justify-center gap-2 shadow-md hover:shadow-amber-500/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
              >
                <Play className="w-4 h-4 fill-current" />
                Launch Arena Match
              </button>
            ) : (
              <div className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                Squad Ready
              </div>
            )}

            <button
              type="button"
              onClick={() => onLeave(party.partyId)}
              disabled={disabled}
              className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 flex items-center justify-center active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:outline-none"
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
            className="w-full min-h-[44px] px-4 py-2.5 rounded-xl font-bold text-sm bg-slate-900 dark:bg-slate-800 hover:bg-amber-500 dark:hover:bg-amber-500 text-white hover:text-slate-950 border border-slate-800 dark:border-slate-700 hover:border-amber-400 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none shadow-sm"
          >
            <Users className="w-4 h-4" />
            {isFull ? "Squad Full" : "Join Squad"}
          </button>
        )}
      </div>
    </div>
  );
};
