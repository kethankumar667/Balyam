import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage, Player } from "@shared/types";
import { getSocket } from "../../lib/socket";
import Chat from "../../components/Chat";
import VoicePanel from "../../components/VoicePanel";
import PlayerList from "../../components/PlayerList";
import { ScorePanel } from "./uno-shared";

/**
 * UNO's Chat / Voice / Players / Points tab rail — structurally mirrors
 * Rummy's persistent tab sidebar (RummyBoardDesktop.tsx:1106-1150): same
 * four tabs, same underlying Chat/VoicePanel/PlayerList components (already
 * game-agnostic, already shared with Rummy), UNO's gold accent instead of
 * Rummy's nostalgia-brass. "Points" reuses UNO's own `ScorePanel` — UNO has
 * no melds/live-points concept, so there's no need for Rummy's PointsPanel.
 *
 * Desktop gets a persistent column (`variant="sidebar"`, matches Rummy).
 * Mobile has no room for a persistent column — Rummy's own mobile shell
 * doesn't try to keep one either, it uses a hamburger -> per-item modal
 * instead. Here `variant="sheet"` is the mobile-appropriate equivalent: one
 * floating trigger opens the same tab body in a full-screen sheet, so the
 * "tabbed" structure stays intact instead of splintering into four separate
 * modals.
 */

type UnoRailTab = "chat" | "voice" | "players" | "points";
const TABS: UnoRailTab[] = ["chat", "voice", "players", "points"];

export interface UnoRoomRailProps {
  variant: "sidebar" | "sheet";
  players: Player[];
  selfId: string | null;
  messages: ChatMessage[];
  playerOrder: string[];
  turnPlayerId: string;
  scores: Record<string, number>;
  nameOf: (id: string) => string;
}

export function UnoRoomRail(props: UnoRoomRailProps) {
  return props.variant === "sidebar" ? <SidebarRail {...props} /> : <SheetRail {...props} />;
}

function SidebarRail(props: UnoRoomRailProps) {
  return (
    <aside className="border-l flex flex-col" style={{ background: "#FFF9F0", borderColor: "#E8D8BE" }}>
      <UnoRailBody {...props} />
      <div className="p-2 border-t flex justify-end" style={{ borderColor: "#E8D8BE" }}>
        <ReactionButton />
      </div>
    </aside>
  );
}

function SheetRail(props: UnoRoomRailProps) {
  const [open, setOpen] = useState(false);
  const unread = useUnreadCount(props.messages, props.selfId, open);

  return (
    <>
      {/* bottom-20 (not bottom-4) — clears the sticky Play/Draw/Pass action
          bar, which also sits at the bottom of the viewport on mobile and
          would otherwise sit directly under these floating buttons. */}
      <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-2">
        <ReactionButton />
        <button
          onClick={() => setOpen(true)}
          className="relative rounded-full px-4 py-2.5 text-sm font-bold shadow-lg"
          style={{ background: "#6D4323", color: "#F7E8C4" }}
        >
          💬 Room
          {unread > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-extrabold flex items-center justify-center"
              style={{ background: "#DC2626", color: "#fff" }}
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </div>

      {open && (
        <>
          <button
            aria-label="Close panel"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/40"
          />
          <div
            role="dialog"
            aria-modal="true"
            className="fixed z-50 inset-x-0 bottom-0 max-h-[80vh] rounded-t-2xl overflow-hidden flex flex-col shadow-2xl"
            style={{ background: "#FFF9F0" }}
          >
            <div className="flex items-center justify-between px-4 pt-3 pb-1 flex-shrink-0">
              <span className="text-sm font-bold uppercase tracking-wide text-[#6E5E4D]">Room</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="w-8 h-8 rounded-full bg-[#EFE2C7] hover:bg-[#E5D4B2] text-[#5C4A38] font-bold"
              >
                ✕
              </button>
            </div>
            <UnoRailBody {...props} />
          </div>
        </>
      )}
    </>
  );
}

/** Tab strip + switched content. Owns its own tab state so both host shells
 *  (persistent sidebar, full-screen sheet) stay dumb positioning wrappers. */
function UnoRailBody({
  players,
  selfId,
  messages,
  playerOrder,
  turnPlayerId,
  scores,
  nameOf,
}: UnoRoomRailProps) {
  const [activeTab, setActiveTab] = useState<UnoRailTab>("chat");
  return (
    <>
      <div className="flex border-b flex-shrink-0" style={{ borderColor: "#E8D8BE" }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 text-[12px] uppercase tracking-widest py-2.5 font-bold capitalize transition ${
              activeTab === tab
                ? "text-[#2B2118] border-b-2 border-[#E6A11E] bg-[#F6EDDB]"
                : "text-[#9C8568] hover:text-[#6E5E4D]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-3 min-h-0">
        {activeTab === "chat" && <Chat messages={messages} selfId={selfId} />}
        {activeTab === "voice" && (
          <VoicePanel players={players} selfId={selfId} restoreOrientation="any" />
        )}
        {activeTab === "players" && <PlayerList players={players} selfId={selfId} />}
        {activeTab === "points" && (
          <ScorePanel
            playerOrder={playerOrder}
            turnPlayerId={turnPlayerId}
            selfId={selfId}
            scores={scores}
            nameOf={nameOf}
          />
        )}
      </div>
    </>
  );
}

/** Unread-chat badge count for the mobile trigger — same idea as
 *  InlineRoomRail's tracking, simplified to "seen" the moment the sheet
 *  opens (any tab), since chat is one tap away once it's open. */
function useUnreadCount(messages: ChatMessage[], selfId: string | null, open: boolean): number {
  const [lastReadCount, setLastReadCount] = useState(messages.length);
  useEffect(() => {
    if (open) setLastReadCount(messages.length);
  }, [open, messages.length]);
  return useMemo(
    () => messages.slice(lastReadCount).filter((m) => m.playerId !== selfId).length,
    [messages, lastReadCount, selfId],
  );
}

/** Quick emoji reaction — same `room:reaction` broadcast InlineRoomRail's
 *  emoji picker already used, ported here (trimmed: no per-player targeting)
 *  so replacing InlineRoomRail in UNO doesn't silently drop the feature. */
const QUICK_EMOJIS = ["👍", "😂", "🔥", "🎉", "😮", "💯", "👏", "🤝"];

function ReactionButton() {
  const [open, setOpen] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleDown(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", handleDown);
    return () => window.removeEventListener("mousedown", handleDown);
  }, [open]);

  function sendReaction(emoji: string) {
    if (cooldown) return;
    getSocket().emit("room:reaction", { emoji });
    setCooldown(true);
    window.setTimeout(() => setCooldown(false), 400);
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="React"
        title="React"
        className="w-9 h-9 rounded-full flex items-center justify-center text-lg shadow-sm"
        style={{ background: "#F0E1D0", border: "1px solid #E8D8BE" }}
      >
        🙂
      </button>
      {open && (
        <div
          // `w-56` (not `max-w-[14rem]`) — an absolutely-positioned flex-wrap
          // container needs a definite width or it shrinks to fit a single
          // column instead of wrapping into a grid.
          className="absolute bottom-full mb-2 right-0 rounded-2xl px-2.5 py-2 flex flex-wrap items-center gap-1 shadow-xl w-56 z-10"
          style={{ background: "#2B2118", border: "1px solid rgba(230,161,30,0.3)" }}
        >
          {QUICK_EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => sendReaction(e)}
              disabled={cooldown}
              className="text-2xl hover:scale-125 active:scale-110 transition disabled:opacity-50 leading-none w-9 h-9 flex items-center justify-center"
              title={`React with ${e}`}
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
