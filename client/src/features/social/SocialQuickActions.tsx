import React, { useState } from "react";
import {
  GamesNavIcon,
  AddFriendUserIcon,
  SwordsClashIcon,
  ShieldNavIcon,
  SparklesIcon,
} from "../../design-system/icons";

interface SocialQuickActionsProps {
  onCreateSquad: () => void;
  onInviteFriends: () => void;
  onOpenRecentRooms?: () => void;
  onOpenBlockedModal?: () => void;
}

export default function SocialQuickActions({
  onCreateSquad,
  onInviteFriends,
  onOpenRecentRooms,
  onOpenBlockedModal,
}: SocialQuickActionsProps) {
  const [showBlockedNotice, setShowBlockedNotice] = useState(false);

  return (
    <div className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-extrabold text-sm text-[var(--auth-ink)] flex items-center gap-2">
          <span className="w-7 h-7 rounded-xl bg-purple-500/15 text-purple-500 flex items-center justify-center flex-shrink-0">
            <SparklesIcon size={14} />
          </span>
          Quick Actions
        </h3>
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
          SHORTCUTS
        </span>
      </div>

      <div className="space-y-2.5">
        {/* Action 1: Create Squad */}
        <button
          onClick={onCreateSquad}
          className="w-full text-left p-3.5 rounded-2xl bg-[var(--auth-field)] hover:bg-purple-500/10 border border-[var(--auth-field-edge)] hover:border-purple-500/30 transition group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 group-hover:scale-105 transition-transform flex items-center justify-center flex-shrink-0">
              <SwordsClashIcon size={16} />
            </div>
            <div>
              <span className="text-xs font-bold text-[var(--auth-ink)] block leading-tight">
                Create Squad
              </span>
              <span className="text-[10px] font-medium text-[var(--auth-ink-soft)] block">
                Assemble 4-player party
              </span>
            </div>
          </div>
          <span className="text-xs text-purple-400 font-black group-hover:translate-x-0.5 transition-transform">
            →
          </span>
        </button>

        {/* Action 2: Invite Friends */}
        <button
          onClick={onInviteFriends}
          className="w-full text-left p-3.5 rounded-2xl bg-[var(--auth-field)] hover:bg-amber-500/10 border border-[var(--auth-field-edge)] hover:border-amber-500/30 transition group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-500 group-hover:scale-105 transition-transform flex items-center justify-center flex-shrink-0">
              <AddFriendUserIcon size={16} />
            </div>
            <div>
              <span className="text-xs font-bold text-[var(--auth-ink)] block leading-tight">
                Invite Friends
              </span>
              <span className="text-[10px] font-medium text-[var(--auth-ink-soft)] block">
                Send friend request by ID
              </span>
            </div>
          </div>
          <span className="text-xs text-amber-500 font-black group-hover:translate-x-0.5 transition-transform">
            →
          </span>
        </button>

        {/* Action 3: Recent Rooms */}
        <button
          onClick={() => {
            if (onOpenRecentRooms) onOpenRecentRooms();
            else if (typeof window !== "undefined") window.location.href = "/games";
          }}
          className="w-full text-left p-3.5 rounded-2xl bg-[var(--auth-field)] hover:bg-sky-500/10 border border-[var(--auth-field-edge)] hover:border-sky-500/30 transition group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 group-hover:scale-105 transition-transform flex items-center justify-center flex-shrink-0">
              <GamesNavIcon size={16} />
            </div>
            <div>
              <span className="text-xs font-bold text-[var(--auth-ink)] block leading-tight">
                Recent Rooms
              </span>
              <span className="text-[10px] font-medium text-[var(--auth-ink-soft)] block">
                Browse active tables
              </span>
            </div>
          </div>
          <span className="text-xs text-sky-400 font-black group-hover:translate-x-0.5 transition-transform">
            →
          </span>
        </button>

        {/* Action 4: Blocked Players */}
        <button
          onClick={() => {
            if (onOpenBlockedModal) onOpenBlockedModal();
            else setShowBlockedNotice((prev) => !prev);
          }}
          className="w-full text-left p-3.5 rounded-2xl bg-[var(--auth-field)] hover:bg-zinc-500/10 border border-[var(--auth-field-edge)] hover:border-zinc-500/30 transition group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-zinc-500/20 text-zinc-400 group-hover:scale-105 transition-transform flex items-center justify-center flex-shrink-0">
              <ShieldNavIcon size={16} />
            </div>
            <div>
              <span className="text-xs font-bold text-[var(--auth-ink)] block leading-tight">
                Blocked Players
              </span>
              <span className="text-[10px] font-medium text-[var(--auth-ink-soft)] block">
                Privacy & player filtering
              </span>
            </div>
          </div>
          <span className="text-xs text-zinc-400 font-black group-hover:translate-x-0.5 transition-transform">
            ⚙
          </span>
        </button>

        {showBlockedNotice && (
          <div className="p-3 bg-zinc-500/10 border border-zinc-500/20 rounded-xl text-[11px] text-[var(--auth-ink-soft)] leading-snug">
            🛡️ Zero blocked players. You can block or report disruptive players from their profile card in active match rooms.
          </div>
        )}
      </div>
    </div>
  );
}
