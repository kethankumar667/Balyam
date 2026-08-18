import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@shared/types";
import { getSocket } from "../lib/socket";

/**
 * Quick-chat presets — one tap fires a friendly, desi-flavoured line as a
 * normal chat message. Shared by every game that mounts the room rail.
 */
const QUICK_PHRASES = [
  "Nice move! 👏",
  "All the best 🍀",
  "Well played! 🎉",
  "So close! 😲",
  "Haar gaya 😅",
  "Mast! 🔥",
  "Good game! 🏆",
  "Speed up ⏳",
];

export interface ChatProps {
  messages: ChatMessage[];
  selfId: string | null;
  showHeader?: boolean;
  className?: string;
}

/**
 * Principal-engineered responsive Chat component.
 *
 * Implements strict flexbox hierarchy:
 *  - Header: flex-shrink-0 (optional)
 *  - Messages: flex-1, min-h-0, overflow-y-auto, overscroll-contain
 *  - Quick chips: flex-shrink-0, flex-wrap
 *  - Composer: flex-shrink-0, sticky bottom-0, safe-area-inset-bottom padded
 *  - Send Button: guaranteed visible with min 44x44px touch target
 */
export default function Chat({
  messages,
  selfId,
  showHeader = false,
  className = "",
}: ChatProps) {
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll messages smoothly to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function sendText(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return;
    getSocket().emit("chat:send", { text: trimmed });
  }

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!text.trim()) return;
    sendText(text);
    setText("");
    // Keep focus on input for fast mobile chatting
    inputRef.current?.focus();
  }

  return (
    <div
      className={`w-full max-w-full h-full min-h-0 flex flex-col bg-[#FFFDF8] dark:bg-[#131926] border border-[#EEDBCA]/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden ${className}`}
    >
      {/* Optional Header */}
      {showHeader && (
        <div className="flex-shrink-0 flex items-center justify-between px-3.5 py-2.5 border-b border-[#EEDBCA]/60 dark:border-slate-800 bg-[#FFFDF8]/90 dark:bg-[#131926]/90 backdrop-blur-xs">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#8A6D4B] dark:text-slate-400 flex items-center gap-1.5">
            <span aria-hidden>💬</span>
            <span>Chat</span>
          </h3>
          <span className="text-[11px] font-bold text-[#8A6D4B] dark:text-slate-400">
            {messages.length} msg{messages.length === 1 ? "" : "s"}
          </span>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2.5 sm:p-3 space-y-2 custom-scrollbar focus:outline-none"
        tabIndex={0}
        aria-label="Chat messages history"
      >
        {messages.length === 0 && (
          <div className="text-[#8A6D4B] dark:text-slate-400 text-xs py-6 text-center font-medium">
            No messages yet. Say hi to the table! 👋
          </div>
        )}
        {messages.map((m) => {
          const isSelf = m.playerId === selfId;
          return (
            <div
              key={m.id}
              className={`text-xs p-2 sm:p-2.5 rounded-2xl max-w-[88%] break-words shadow-2xs transition-all ${
                isSelf
                  ? "ml-auto bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-br-xs"
                  : "mr-auto bg-white dark:bg-[#182234] text-[#2B3550] dark:text-slate-100 border border-[#EEDBCA]/60 dark:border-slate-700/60 rounded-bl-xs"
              }`}
            >
              <div className="text-[10px] font-extrabold opacity-80 mb-0.5">
                {isSelf ? "You" : m.playerName}
              </div>
              <div className="leading-relaxed whitespace-pre-wrap select-text">
                {m.text}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} className="h-0 w-0" />
      </div>

      {/* Quick Reply Chips (Fluid wrapping, touch-friendly) */}
      <div className="flex-shrink-0 px-2.5 py-1.5 border-t border-[#EEDBCA]/60 dark:border-slate-800 bg-[#FFF9EE]/70 dark:bg-[#161F2E]/70">
        <div className="flex flex-wrap gap-1.5 max-h-[64px] sm:max-h-[72px] overflow-y-auto custom-scrollbar py-0.5">
          {QUICK_PHRASES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => sendText(p)}
              className="min-h-[34px] px-2.5 py-1 rounded-full bg-white dark:bg-[#1F2B3E] hover:bg-[#FFF4E0] dark:hover:bg-[#283850] active:scale-95 text-[#6E5E4D] dark:text-slate-200 border border-[#EEDBCA] dark:border-slate-700 text-[11px] font-semibold transition cursor-pointer shrink-0 shadow-2xs"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Message Composer (Sticky Bottom, Safe Area Padded, Guaranteed Visible Send Button) */}
      <form
        onSubmit={handleSubmit}
        className="flex-shrink-0 sticky bottom-0 z-10 bg-[#FFFDF8] dark:bg-[#131926] p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom,0px))] border-t border-[#EEDBCA] dark:border-slate-800"
      >
        <div className="flex items-center gap-1.5 sm:gap-2 max-w-full">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            maxLength={500}
            autoComplete="off"
            className="flex-1 min-w-0 min-h-[44px] bg-white dark:bg-[#0F1420] border border-[#EEDBCA] dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#2B3550] dark:text-slate-100 placeholder-[#B0A090] dark:placeholder:text-slate-500 focus:outline-none focus:border-[#EA5A1F] focus:ring-2 focus:ring-[#EA5A1F]/20 transition"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            aria-label="Send message"
            className="min-h-[44px] min-w-[44px] px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-[#EA5A1F] to-[#D84F17] hover:from-[#F06A32] hover:to-[#EA5A1F] active:scale-95 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            <span aria-hidden className="text-sm">✈</span>
            <span className="hidden xs:inline">Send</span>
          </button>
        </div>
      </form>
    </div>
  );
}
