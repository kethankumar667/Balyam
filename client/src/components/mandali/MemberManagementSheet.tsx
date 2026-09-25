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
import { Crown, ShieldCheck, ChevronDown, UserMinus, Ban, ArrowLeftRight } from "lucide-react";
import { AlbumSheet } from "./album";
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
    <AlbumSheet open={open} onClose={onClose} title={`Members (${sortedMembers.length})`}>
      <div className="-mx-2">
        {error && (
          <p className="px-5 pt-3 text-[13px] text-album-danger" role="alert">
            {error}
          </p>
        )}

        <div className="px-1 py-1">
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
                className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl hover:bg-album-field transition-colors relative"
              >
                <img
                  src={avatarUrl(member.avatar)}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover bg-album-field shrink-0"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/Bhalyam-logo.png"; }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-album-ink truncate flex items-center gap-1.5">
                    {member.displayName}
                    {isSelf && <span className="text-[13px] text-album-ink3 font-normal">(you)</span>}
                  </p>
                  <p className="text-[13px] text-album-ink3 flex items-center gap-1">
                    {role === "OWNER" && <Crown className="w-3 h-3 text-album-foil" />}
                    {role === "ADMIN" && <ShieldCheck className="w-3 h-3 text-album-foil" />}
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
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-album-field text-album-ink3 disabled:opacity-50 cursor-pointer transition-colors"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>

                    {openMenuFor === member.playerId && (
                      <div className="absolute right-0 top-full mt-1 z-10 w-48 rounded-xl border border-album-line bg-album-raised shadow-xl overflow-hidden py-1">
                        {role === "MEMBER" && isSelfOwner && (
                          <button
                            type="button"
                            onClick={() => runAction(member.playerId, onPromote)}
                            className="w-full text-left px-3.5 py-2.5 text-[15px] text-album-ink hover:bg-album-field flex items-center gap-2 cursor-pointer"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-album-foil" />
                            Make admin
                          </button>
                        )}
                        {role === "ADMIN" && isSelfOwner && (
                          <button
                            type="button"
                            onClick={() => runAction(member.playerId, onDemote)}
                            className="w-full text-left px-3.5 py-2.5 text-[15px] text-album-ink hover:bg-album-field flex items-center gap-2 cursor-pointer"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-album-ink3" />
                            Dismiss as admin
                          </button>
                        )}
                        {isSelfOwner && (
                          <button
                            type="button"
                            onClick={() => runAction(member.playerId, onTransferOwnership)}
                            className="w-full text-left px-3.5 py-2.5 text-[15px] text-album-ink hover:bg-album-field flex items-center gap-2 cursor-pointer"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5 text-album-foil" />
                            Make group owner
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => runAction(member.playerId, onKick)}
                          className="w-full text-left px-3.5 py-2.5 text-[15px] text-album-ink hover:bg-album-field flex items-center gap-2 cursor-pointer"
                        >
                          <UserMinus className="w-3.5 h-3.5 text-album-danger" />
                          Remove from group
                        </button>
                        <button
                          type="button"
                          onClick={() => runAction(member.playerId, onBan)}
                          className="w-full text-left px-3.5 py-2.5 text-[15px] text-album-danger hover:bg-album-danger/10 flex items-center gap-2 cursor-pointer"
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
    </AlbumSheet>
  );
}
