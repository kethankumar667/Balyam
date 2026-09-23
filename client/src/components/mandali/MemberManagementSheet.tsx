/**
 * BHALYAM Mandali — Member Management Sheet
 *
 * Promote/demote/kick/ban/transfer-ownership, gated per the caller's own
 * role so the UI never offers an action the server would reject anyway —
 * mirrors `transition_membership`'s own rule: owner acts on anyone but
 * themself, admin acts on ordinary members only, never the owner or a
 * peer admin.
 *
 * Requirements:
 * - Dual light/dark theme support.
 * - 44x44px touch targets.
 * - Zero usage of Sparkles from lucide-react.
 */

import { useState } from "react";
import { Users, Crown, ShieldCheck, ChevronDown, UserMinus, Ban, ArrowLeftRight } from "lucide-react";
import Modal from "../Modal.js";
import type { MandaliMember } from "@shared/mandali/types.js";

export interface MemberManagementSheetProps {
  open: boolean;
  onClose: () => void;
  members: MandaliMember[];
  selfId: string;
  onPromote: (targetId: string) => Promise<{ success: boolean; error?: string }>;
  onDemote: (targetId: string) => Promise<{ success: boolean; error?: string }>;
  onKick: (targetId: string) => Promise<{ success: boolean; error?: string }>;
  onBan: (targetId: string) => Promise<{ success: boolean; error?: string }>;
  onTransferOwnership: (targetId: string) => Promise<{ success: boolean; error?: string }>;
}

function avatarUrl(avatar?: string): string {
  if (!avatar) return "/Bhalyam-logo.png";
  if (avatar.startsWith("/") || avatar.startsWith("http")) return avatar;
  return `/Avatars/${avatar}`;
}

export default function MemberManagementSheet({
  open, onClose, members, selfId, onPromote, onDemote, onKick, onBan, onTransferOwnership,
}: MemberManagementSheetProps) {
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const [busyFor, setBusyFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const self = members.find((m) => m.playerId === selfId);
  const selfRole: string = self?.role ?? "MEMBER";
  const isSelfOwner = selfRole === "OWNER";
  const isSelfAdmin = selfRole === "ADMIN";
  const canManage = isSelfOwner || isSelfAdmin;

  const runAction = async (targetId: string, action: (id: string) => Promise<{ success: boolean; error?: string }>) => {
    setBusyFor(targetId);
    setError(null);
    const result = await action(targetId);
    setBusyFor(null);
    setOpenMenuFor(null);
    if (!result.success) setError(result.error ?? "That action could not be completed.");
  };

  const sortedMembers = [...members]
    .filter((m) => m.state === "ACTIVE")
    .sort((a, b) => {
      const rank: Record<string, number> = { OWNER: 0, ADMIN: 1, MEMBER: 2 };
      return (rank[a.role] ?? 3) - (rank[b.role] ?? 3);
    });

  return (
    <Modal open={open} onClose={onClose} mobileSheet ariaLabelledBy="member-management-title">
      <div className="w-full max-w-md max-h-[85dvh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <Users className="w-4 h-4 text-amber-500" />
          <h2 id="member-management-title" className="text-base font-black text-slate-900 dark:text-white">
            Members ({sortedMembers.length})
          </h2>
        </div>

        {error && (
          <p className="px-5 pt-3 text-xs text-rose-600 dark:text-rose-400" role="alert">
            {error}
          </p>
        )}

        <div className="flex-1 overflow-y-auto px-3 py-2">
          {sortedMembers.map((member) => {
            // Durable mode's role is always OWNER/ADMIN/MEMBER at runtime,
            // but MandaliMember.role is typed as the wider 7-value
            // MandaliRole union (see the migration's own role-collapse
            // note) — compare as string so "ADMIN" isn't a type error.
            const role: string = member.role;
            const isSelf = member.playerId === selfId;
            const canActOnThisMember =
              canManage &&
              !isSelf &&
              role !== "OWNER" &&
              !(isSelfAdmin && role === "ADMIN");
            const isBusy = busyFor === member.playerId;

            return (
              <div
                key={member.playerId}
                className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors relative"
              >
                <img
                  src={avatarUrl(member.avatar)}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover bg-slate-200 dark:bg-slate-700 shrink-0"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/Bhalyam-logo.png"; }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                    {member.displayName}
                    {isSelf && <span className="text-[10px] text-slate-400 font-normal">(you)</span>}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    {role === "OWNER" && <Crown className="w-3 h-3 text-amber-500" />}
                    {role === "ADMIN" && <ShieldCheck className="w-3 h-3 text-sky-500" />}
                    {role === "OWNER" ? "Owner" : role === "ADMIN" ? "Admin" : "Member"}
                  </p>
                </div>

                {canActOnThisMember && (
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setOpenMenuFor(openMenuFor === member.playerId ? null : member.playerId)}
                      disabled={isBusy}
                      aria-label={`Manage ${member.displayName}`}
                      aria-expanded={openMenuFor === member.playerId}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 disabled:opacity-50 cursor-pointer transition-colors"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>

                    {openMenuFor === member.playerId && (
                      <div className="absolute right-0 top-full mt-1 z-10 w-48 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl overflow-hidden py-1">
                        {role === "MEMBER" && isSelfOwner && (
                          <button
                            type="button"
                            onClick={() => runAction(member.playerId, onPromote)}
                            className="w-full text-left px-3.5 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-sky-500" />
                            Make admin
                          </button>
                        )}
                        {role === "ADMIN" && isSelfOwner && (
                          <button
                            type="button"
                            onClick={() => runAction(member.playerId, onDemote)}
                            className="w-full text-left px-3.5 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                            Dismiss as admin
                          </button>
                        )}
                        {isSelfOwner && (
                          <button
                            type="button"
                            onClick={() => runAction(member.playerId, onTransferOwnership)}
                            className="w-full text-left px-3.5 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5 text-amber-500" />
                            Make group owner
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => runAction(member.playerId, onKick)}
                          className="w-full text-left px-3.5 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                        >
                          <UserMinus className="w-3.5 h-3.5 text-rose-500" />
                          Remove from group
                        </button>
                        <button
                          type="button"
                          onClick={() => runAction(member.playerId, onBan)}
                          className="w-full text-left px-3.5 py-2.5 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          Remove and ban
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
