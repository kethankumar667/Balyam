import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage, Player } from "@shared/types";
import { getSocket } from "../lib/socket";
import PlayerList from "./PlayerList";
import VoicePanel from "./VoicePanel";
import Chat from "./Chat";

/**
 * Horizontal in-board version of the room rail. Used inside a game's own
 * card (e.g. the LudoBoard chrome) where a floating right-edge strip would
 * overlap the play area. The visual idiom is identical to FloatingRoomRail
 * — same icons, same slide-in sheet — but the strip is placed inline by
 * the host component instead of being position:fixed.
 *
 * Adds a 🙂 emoji button that opens a compact quick-reaction picker; the
 * reactions are emitted on the same `room:reaction` socket event the
 * standalone ReactionBar used to fire, so existing FloatingReactionsLayer
 * / EmojiRain receivers work unchanged.
 */
const QUICK_EMOJIS = ["👍", "😂", "🔥", "🎉", "😮", "💯", "👏", "🤝"];
const MORE_EMOJIS = ["😢", "🤔", "😭", "😡", "🙌", "💪", "🎯", "💔"];

type Panel = "room" | "players" | "voice" | "chat" | "emoji";

export default function InlineRoomRail({
  code,
  game,
  phase,
  players,
  selfId,
  messages,
}: {
  code: string;
  game: string;
  phase: string;
  players: Player[];
  selfId: string | null;
  messages: ChatMessage[];
}) {
  const [open, setOpen] = useState<Panel | null>(null);
  const [emojiCooldown, setEmojiCooldown] = useState(false);
  const [reactionTarget, setReactionTarget] = useState<string | null>(null);

  // Unread chat tracking — same logic as FloatingRoomRail.
  const [lastReadCount, setLastReadCount] = useState(messages.length);
  useEffect(() => {
    if (open === "chat") setLastReadCount(messages.length);
  }, [open, messages.length]);
  const unread = useMemo(
    () =>
      messages.slice(lastReadCount).filter((m) => m.playerId !== selfId).length,
    [messages, lastReadCount, selfId],
  );

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Lets a game board fire a custom event (tapping a player's name plate
  // directly on the felt, e.g. Ludo's yard badge) to open the reaction
  // picker pre-targeted at that player - same targeting the Players-panel
  // rows below already do, just reachable without detouring through a
  // side panel first.
  useEffect(() => {
    function onBoardTarget(e: Event) {
      const id = (e as CustomEvent<{ playerId: string }>).detail?.playerId;
      if (!id || id === selfId) return;
      setReactionTarget(id);
      setOpen("emoji");
    }
    window.addEventListener("bhalyam:react-at-player", onBoardTarget);
    return () => window.removeEventListener("bhalyam:react-at-player", onBoardTarget);
  }, [selfId]);

  function sendReaction(emoji: string) {
    if (emojiCooldown) return;
    getSocket().emit("room:reaction", { emoji, targetPlayerId: reactionTarget ?? undefined });
    setEmojiCooldown(true);
    window.setTimeout(() => setEmojiCooldown(false), 400);
  }

  return (
    <>
      <div className="flex justify-center">
        <nav
          aria-label="Room actions"
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 shadow-lg backdrop-blur"
          style={{
            background: "rgba(15, 23, 42, 0.75)",
            border: "1px solid rgba(148, 163, 184, 0.18)",
          }}
        >
          <InlineButton
            label="Room code"
            active={open === "room"}
            onClick={() => setOpen(open === "room" ? null : "room")}
          >
            <IconRoom />
          </InlineButton>
          <InlineButton
            label="Players"
            active={open === "players"}
            onClick={() => setOpen(open === "players" ? null : "players")}
          >
            <IconUsers />
          </InlineButton>
          <InlineButton
            label="Voice"
            active={open === "voice"}
            onClick={() => setOpen(open === "voice" ? null : "voice")}
          >
            <IconMic />
          </InlineButton>
          <InlineButton
            label="Chat"
            active={open === "chat"}
            badge={unread}
            onClick={() => setOpen(open === "chat" ? null : "chat")}
          >
            <IconChat />
          </InlineButton>
          <span
            className="self-stretch w-px"
            style={{ background: "rgba(148,163,184,0.25)" }}
            aria-hidden
          />
          <InlineButton
            label="Reactions"
            active={open === "emoji"}
            onClick={() => { setReactionTarget(null); setOpen(open === "emoji" ? null : "emoji"); }}
          >
            <span className="text-lg leading-none">🙂</span>
          </InlineButton>
        </nav>
      </div>

      {/* Inline emoji popover — sits directly under the strip and dismisses
          on outside click. Kept lightweight (no backdrop) so reacting feels
          instant. */}
      {open === "emoji" && (
        <EmojiPopover
          onPick={(e) => {
            sendReaction(e);
            if (reactionTarget) {
              setOpen(null);
              setReactionTarget(null);
            }
            // else: stay open so the player can fire off several reactions in a row.
          }}
          onClose={() => {
            setOpen(null);
            setReactionTarget(null);
          }}
          cooldown={emojiCooldown}
          targetName={reactionTarget ? players.find((p) => p.id === reactionTarget)?.name ?? null : null}
        />
      )}

      {/* Side sheets for the heavier panels — Room / Players / Voice / Chat. */}
      {(open === "room" ||
        open === "players" ||
        open === "voice" ||
        open === "chat") && (
        <>
          <button
            aria-label="Close panel"
            onClick={() => setOpen(null)}
            className="fixed inset-0 z-40 bg-black/40"
            style={{ backdropFilter: "blur(2px)" }}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="fixed z-50 right-0 top-0 bottom-0 w-[min(92vw,22rem)] overflow-y-auto p-3 shadow-2xl animate-[slideInRight_220ms_ease-out]"
            style={{
              background: "#F6EDDB",
              borderLeft: "1px solid #E8D8BE",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm uppercase tracking-wider font-bold text-[#5C4A38]">
                {open === "room" && "Room"}
                {open === "players" && "Players"}
                {open === "voice" && "Voice"}
                {open === "chat" && "Chat"}
              </h2>
              <button
                onClick={() => setOpen(null)}
                aria-label="Close"
                className="w-8 h-8 rounded-full bg-[#EFE2C7] hover:bg-[#E5D4B2] text-[#5C4A38] font-bold"
              >
                ✕
              </button>
            </div>
            {open === "room" && (
              <RoomInfo code={code} game={game} phase={phase} />
            )}
            {open === "players" && (
            <PlayerList
              players={players}
              selfId={selfId}
              onTapPlayer={(id) => {
                setReactionTarget(id);
                setOpen("emoji");
              }}
            />
            )}
            {open === "voice" && (
              <VoicePanel
                players={players}
                selfId={selfId}
                restoreOrientation="portrait"
              />
            )}
            {open === "chat" && <Chat messages={messages} selfId={selfId} />}
          </div>
        </>
      )}
    </>
  );
}

function InlineButton({
  label,
  active,
  badge,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  badge?: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="relative w-9 h-9 rounded-full flex items-center justify-center transition-colors"
      style={{
        background: active ? "#EA5A1F" : "rgba(255,255,255,0.06)",
        color: active ? "#fff" : "#e2e8f0",
        border: active
          ? "1px solid #D84F17"
          : "1px solid rgba(148,163,184,0.18)",
        cursor: "pointer",
      }}
    >
      {children}
      {badge != null && badge > 0 && (
        <span
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-extrabold flex items-center justify-center"
          style={{
            background: "#DC2626",
            color: "#fff",
            border: "1.5px solid #0f172a",
          }}
        >
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

function EmojiPopover({
  onPick,
  onClose,
  cooldown,
  targetName,
}: {
  onPick: (e: string) => void;
  onClose: () => void;
  cooldown: boolean;
  targetName: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleDown(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) onClose();
    }
    window.addEventListener("mousedown", handleDown);
    return () => window.removeEventListener("mousedown", handleDown);
  }, [onClose]);
  return (
    <div className="flex justify-center mt-2">
      <div
        ref={wrapRef}
        className="rounded-2xl px-2.5 py-2 flex flex-wrap items-center gap-1 shadow-xl backdrop-blur max-w-[min(92vw,28rem)]"
        style={{
          background: "rgba(15, 23, 42, 0.92)",
          border: "1px solid rgba(148,163,184,0.22)",
        }}
      >
        {targetName && (
          <div
            className="flex items-center gap-1.5 pr-1.5 mr-1 border-r text-xs font-semibold text-amber-300"
            style={{ borderColor: "rgba(148,163,184,0.25)" }}
          >
            🎯 {targetName}
          </div>
        )}
        {QUICK_EMOJIS.map((e) => (
          <button
            key={e}
            onClick={() => onPick(e)}
            disabled={cooldown}
            className="text-2xl hover:scale-125 active:scale-110 transition disabled:opacity-50 leading-none w-9 h-9 flex items-center justify-center"
            title={`React with ${e}`}
          >
            {e}
          </button>
        ))}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-slate-300 hover:text-white w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-700"
          title="More emojis"
        >
          {expanded ? "−" : "+"}
        </button>
        {expanded && (
          <div
            className="flex items-center gap-1 pl-2 ml-1 border-l"
            style={{ borderColor: "rgba(148,163,184,0.25)" }}
          >
            {MORE_EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => onPick(e)}
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
    </div>
  );
}

function RoomInfo({
  code,
  game,
  phase,
}: {
  code: string;
  game: string;
  phase: string;
}) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <div className="space-y-3">
      <div className="bg-[#F7EEDC] border border-[#E6D4B7] rounded-xl p-4 text-center">
        <div className="text-[11px] uppercase tracking-widest text-[#A3886E] font-bold">
          Room code
        </div>
        <div className="font-mono text-[28px] tracking-[0.35em] font-black text-[#2B3550] mt-1">
          {code}
        </div>
        <button
          onClick={copy}
          className="mt-3 inline-block text-sm bg-[#EA5A1F] hover:bg-[#D84F17] text-white rounded-lg px-4 py-2 font-bold"
        >
          {copied ? "✓ Copied" : "Copy code"}
        </button>
      </div>
      <div className="bg-[#F7EEDC] border border-[#E6D4B7] rounded-xl p-3 text-sm text-[#5C4A38] space-y-1">
        <div>
          <span className="text-[#8C7A67] mr-2">Game:</span>
          <span className="font-bold text-[#2F3A54]">{game.toUpperCase()}</span>
        </div>
        <div>
          <span className="text-[#8C7A67] mr-2">Phase:</span>
          <span className="font-bold text-[#2F3A54]">{phase}</span>
        </div>
      </div>
    </div>
  );
}

function IconRoom() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconMic() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}
function IconChat() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
