import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage, Player } from "@shared/types";
import { getSocket } from "../lib/socket";
import {
  QUICK_REACTIONS,
  THROW_REACTIONS,
  NUDGE_REACTIONS,
} from "@shared/reactions";
import { SOUNDBOARD_CLIPS, SOUND_RATE_LIMIT, type SoundClip } from "@shared/soundboard";

// Local aliases keep the JSX below reading the same as before.
const QUICK_EMOJIS: readonly string[] = QUICK_REACTIONS;
const MORE_EMOJIS: readonly string[] = THROW_REACTIONS;
const NUDGE_EMOJIS: readonly string[] = NUDGE_REACTIONS;

import PlayerList from "./PlayerList";
import VoicePanel from "./VoicePanel";
import Chat from "./Chat";
import QrCodeModal from "./QrCodeModal";

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

type Panel = "room" | "players" | "voice" | "chat" | "emoji";

export default function InlineRoomRail({
  code,
  game,
  phase,
  players,
  selfId,
  messages,
  variant = "dark",
  hideStrip = false,
  onUnreadChange,
}: {
  code: string;
  game: string;
  phase: string;
  players: Player[];
  selfId: string | null;
  messages: ChatMessage[];
  /** Visual skin. "dark" (default) keeps the original slate strip every
   *  other game uses; "paper" matches the BHALYAM notebook theme (Ludo's
   *  redesigned board chrome). Only the pill + buttons + emoji popover
   *  change — the slide-in side sheets are already paper-toned. */
  variant?: "dark" | "paper";
  /** When true, the visible nav strip is not rendered — only the panels +
   *  the `bhalyam:open-room-panel` / `bhalyam:react-at-player` event bridge
   *  stay live. Lets a host (Ludo mobile) drive every room action from its
   *  own bottom nav without a duplicated toolbar row eating vertical space. */
  hideStrip?: boolean;
  /** Fires whenever the unread-chat count changes, so a host driving the
   *  panels from its own controls can surface the badge itself. */
  onUnreadChange?: (n: number) => void;
}) {
  const paper = variant === "paper";
  const [open, setOpen] = useState<Panel | null>(null);
  const [emojiCooldown, setEmojiCooldown] = useState(false);
  const [reactionTarget, setReactionTarget] = useState<string | null>(null);
  /** Send timestamps inside the current sound-rate window (see sendSound). */
  const soundStamps = useRef<number[]>([]);
  const [soundBlocked, setSoundBlocked] = useState(false);

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
    onUnreadChange?.(unread);
  }, [unread, onUnreadChange]);

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

  // Sibling controls (e.g. Ludo's bottom nav) can open one of this rail's
  // panels without re-implementing them — they fire `bhalyam:open-room-panel`
  // with the target panel id, same lightweight custom-event bridge as the
  // board's react-at-player above.
  useEffect(() => {
    function onOpenPanel(e: Event) {
      const panel = (e as CustomEvent<{ panel: Panel }>).detail?.panel;
      if (!panel) return;
      if (panel === "emoji") setReactionTarget(null);
      setOpen(panel);
    }
    window.addEventListener("bhalyam:open-room-panel", onOpenPanel);
    return () => window.removeEventListener("bhalyam:open-room-panel", onOpenPanel);
  }, []);

  function sendReaction(emoji: string) {
    if (emojiCooldown) return;
    getSocket().emit("room:reaction", { emoji, targetPlayerId: reactionTarget ?? undefined });
    setEmojiCooldown(true);
    window.setTimeout(() => setEmojiCooldown(false), 400);
  }

  /**
   * Soundboard clip. The client mirrors the server's budget
   * (SOUND_RATE_LIMIT) rather than inventing its own, so a throttled clip
   * shows as a disabled button instead of a tap that appears to work and
   * produces silence. The server still enforces it — this is only courtesy.
   */
  function sendSound(clipId: string) {
    const now = Date.now();
    const recent = soundStamps.current.filter((t) => now - t < SOUND_RATE_LIMIT.windowMs);
    if (recent.length >= SOUND_RATE_LIMIT.max) {
      setSoundBlocked(true);
      return;
    }
    recent.push(now);
    soundStamps.current = recent;
    setSoundBlocked(false);
    getSocket().emit("room:sound", { clipId, targetPlayerId: reactionTarget ?? undefined });
    // Re-enable exactly when the oldest stamp falls out of the window.
    window.setTimeout(() => setSoundBlocked(false), SOUND_RATE_LIMIT.windowMs);
  }

  return (
    <>
      {!hideStrip && (
      <div className="flex justify-center">
        <nav
          aria-label="Room actions"
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 shadow-lg backdrop-blur"
          style={{
            background: paper ? "rgba(247,232,196,0.92)" : "rgba(15, 23, 42, 0.75)",
            border: paper ? "1px solid #C8A66B" : "1px solid rgba(148, 163, 184, 0.18)",
          }}
        >
          <InlineButton
            label="Room code"
            paper={paper}
            active={open === "room"}
            onClick={() => setOpen(open === "room" ? null : "room")}
          >
            <IconRoom />
          </InlineButton>
          <InlineButton
            label="Players"
            paper={paper}
            active={open === "players"}
            onClick={() => setOpen(open === "players" ? null : "players")}
          >
            <IconUsers />
          </InlineButton>
          <InlineButton
            label="Voice"
            paper={paper}
            active={open === "voice"}
            onClick={() => setOpen(open === "voice" ? null : "voice")}
          >
            <IconMic />
          </InlineButton>
          <InlineButton
            label="Chat"
            paper={paper}
            active={open === "chat"}
            badge={unread}
            onClick={() => setOpen(open === "chat" ? null : "chat")}
          >
            <IconChat />
          </InlineButton>
          <span
            className="self-stretch w-px"
            style={{ background: paper ? "rgba(200,166,107,0.5)" : "rgba(148,163,184,0.25)" }}
            aria-hidden
          />
          <InlineButton
            label="Reactions"
            paper={paper}
            active={open === "emoji"}
            onClick={() => { setReactionTarget(null); setOpen(open === "emoji" ? null : "emoji"); }}
          >
            <span className="text-lg leading-none">🙂</span>
          </InlineButton>
        </nav>
      </div>
      )}

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
          onPickSound={(clipId) => {
            sendSound(clipId);
            // Sounds do NOT auto-close on a targeted send the way emoji do.
            // The budget is 3 per 6s and the tray is the only place to see
            // what is left, so closing it would hide the one thing the
            // player needs to pace themselves.
          }}
          soundBlocked={soundBlocked}
          onClose={() => {
            setOpen(null);
            setReactionTarget(null);
          }}
          cooldown={emojiCooldown}
          targetName={reactionTarget ? players.find((p) => p.id === reactionTarget)?.name ?? null : null}
          paper={paper}
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
  paper = false,
  children,
}: {
  label: string;
  active: boolean;
  badge?: number;
  onClick: () => void;
  paper?: boolean;
  children: React.ReactNode;
}) {
  const bg = active
    ? paper ? "#FF8F00" : "#EA5A1F"
    : paper ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.06)";
  const color = active ? "#fff" : paper ? "#6D4323" : "#e2e8f0";
  const border = active
    ? paper ? "1px solid #C86D0E" : "1px solid #D84F17"
    : paper ? "1px solid #C8A66B" : "1px solid rgba(148,163,184,0.18)";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="relative w-9 h-9 rounded-full flex items-center justify-center transition-colors"
      style={{ background: bg, color, border, cursor: "pointer" }}
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
  onPickSound,
  soundBlocked,
  onClose,
  cooldown,
  targetName,
  paper = false,
}: {
  onPick: (e: string) => void;
  onPickSound: (clipId: string) => void;
  soundBlocked: boolean;
  onClose: () => void;
  cooldown: boolean;
  targetName: string | null;
  paper?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  // Emoji and sounds share one tray rather than getting a second button on
  // the strip: they are the same gesture ("react to what just happened"),
  // and the targeting context (🎯 <name>) applies to both.
  const [mode, setMode] = useState<"emoji" | "sound">("emoji");
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
          background: paper ? "rgba(247,232,196,0.96)" : "rgba(15, 23, 42, 0.92)",
          border: paper ? "1px solid #C8A66B" : "1px solid rgba(148,163,184,0.22)",
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
        <button
          onClick={() => setMode((m) => (m === "emoji" ? "sound" : "emoji"))}
          aria-pressed={mode === "sound"}
          className={`text-xs font-bold w-8 h-8 flex items-center justify-center rounded-full mr-1 transition ${
            mode === "sound"
              ? "bg-[#E6A11E] text-[#2B2118]"
              : paper
              ? "text-[#6E5E4D] hover:bg-[#E5D4B2]"
              : "text-slate-300 hover:bg-slate-700"
          }`}
          title={mode === "sound" ? "Switch to emoji" : "Switch to sounds"}
        >
          {mode === "sound" ? "🙂" : "🔊"}
        </button>

        {mode === "sound" ? (
          <SoundGrid onPick={onPickSound} blocked={soundBlocked} paper={paper} />
        ) : (
          <>
        {/* Which row leads depends on WHY the tray is open. Aimed at a player
            (they just sent your token home) the comeback set is the point, so
            it leads; a general cheer leads with the applause set. Burying the
            throwables behind "+" made the targeted flow two taps deep for the
            one emotion it exists to serve. */}
        {(targetName ? MORE_EMOJIS : QUICK_EMOJIS).map((e) => (
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
            {[...NUDGE_EMOJIS, ...(targetName ? QUICK_EMOJIS : MORE_EMOJIS)].map((e) => (
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
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Soundboard grid, grouped the same way the emoji rows are (cheer / tease /
 * drama) so the two halves of the tray read as one vocabulary.
 *
 * Every button carries its label, not just a glyph. A glyph-only soundboard
 * is a guessing game — you cannot preview a clip before inflicting it on the
 * whole room, so the label is the only thing standing between a player and
 * an accidental airhorn.
 */
function SoundGrid({
  onPick,
  blocked,
  paper,
}: {
  onPick: (clipId: string) => void;
  blocked: boolean;
  paper: boolean;
}) {
  const groups: { key: SoundClip["group"]; title: string }[] = [
    { key: "cheer", title: "Cheer" },
    { key: "tease", title: "Tease" },
    { key: "drama", title: "Drama" },
  ];
  return (
    <div className="flex flex-col gap-1.5 w-full max-w-[22rem]">
      {blocked && (
        <p className={`text-[11px] ${paper ? "text-[#8A5A2B]" : "text-amber-300"}`}>
          Easy — wait a moment before the next sound.
        </p>
      )}
      {groups.map((g) => (
        <div key={g.key}>
          <p
            className={`text-[10px] uppercase tracking-wider mb-1 ${
              paper ? "text-[#8A7865]" : "text-slate-400"
            }`}
          >
            {g.title}
          </p>
          <div className="flex flex-wrap gap-1">
            {SOUNDBOARD_CLIPS.filter((c) => c.group === g.key).map((c) => (
              <button
                key={c.id}
                onClick={() => onPick(c.id)}
                disabled={blocked}
                className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold transition disabled:opacity-40 ${
                  paper
                    ? "bg-[#EFE2C7] hover:bg-[#E5D4B2] text-[#5C4A38]"
                    : "bg-slate-700 hover:bg-slate-600 text-slate-100"
                }`}
                title={`Play ${c.label} for the room`}
              >
                <span aria-hidden>{c.glyph}</span>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      ))}
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
  const [qrOpen, setQrOpen] = useState(false);

  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <>
      <div className="space-y-3">
        <div className="bg-[#F7EEDC] border border-[#E6D4B7] rounded-xl p-4 text-center">
          <div className="text-[11px] uppercase tracking-widest text-[#A3886E] font-bold">
            Room code
          </div>
          <div className="font-mono text-[28px] tracking-[0.35em] font-black text-[#2B3550] mt-1">
            {code}
          </div>
          <div className="mt-3 flex justify-center gap-2">
            <button
              onClick={copy}
              className="text-xs bg-[#EA5A1F] hover:bg-[#D84F17] text-white rounded-lg px-3 py-2 font-bold transition"
            >
              {copied ? "✓ Copied" : "Copy code"}
            </button>
            <button
              onClick={() => setQrOpen(true)}
              className="text-xs bg-[#FF8F00] hover:bg-[#E57F00] text-white rounded-lg px-3 py-2 font-bold transition"
            >
              📷 QR Code
            </button>
          </div>
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

      <QrCodeModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        code={code}
        gameName={game.toUpperCase()}
      />
    </>
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
