import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@shared/types";
import { getSocket } from "../lib/socket";

/**
 * Quick-chat presets — one tap fires a friendly, desi-flavoured line as a
 * normal chat message. Shared by every game that mounts the room rail.
 */
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
];

export default function Chat({
  messages,
  selfId,
}: {
  messages: ChatMessage[];
  selfId: string | null;
}) {
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendText(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return;
    getSocket().emit("chat:send", { text: trimmed });
  }
  function send() {
    sendText(text);
    setText("");
  }

  return (
    <div className="bg-[#FFFDF8] dark:bg-[#131926] border-2 border-[#EEDBCA] dark:border-slate-800 rounded-3xl p-3.5 sm:p-4 shadow-sm flex flex-col h-[220px] sm:h-[240px]">
      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#EEDBCA]/60 dark:border-slate-800">
        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[#8A6D4B] dark:text-slate-400 flex items-center gap-1.5">
          <span aria-hidden>💬</span>
          <span>Chat</span>
        </h3>
        <span className="text-xs text-[#8A6D4B] dark:text-slate-500 font-bold">•••</span>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
        {messages.length === 0 && (
          <div className="text-[#8A6D4B] dark:text-slate-400 text-xs py-1">
            No messages yet. Say hi! 👋
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`text-xs ${
              m.playerId === selfId
                ? "text-blue-600 dark:text-blue-400 font-medium"
                : "text-[#2B3550] dark:text-slate-100"
            }`}
          >
            <span className="font-bold">{m.playerName}:</span> <span>{m.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Quick chips */}
      <div className="pt-1.5 pb-1.5 flex flex-wrap gap-1 border-t border-[#EEDBCA]/40 dark:border-slate-800/60">
        {QUICK_PHRASES.slice(0, 4).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => sendText(p)}
            className="rounded-full bg-[#FFF9EE] dark:bg-[#182234] hover:bg-[#FFF4E0] dark:hover:bg-[#1E2738] active:scale-95 text-[#6E5E4D] dark:text-slate-300 border border-[#EEDBCA] dark:border-slate-700/60 text-[10px] font-semibold px-2 py-0.5 transition cursor-pointer"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="pt-0.5 flex gap-1.5">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type a message..."
          maxLength={500}
          className="flex-1 bg-white dark:bg-[#0F1420] border border-[#EEDBCA] dark:border-slate-700 rounded-full px-3 py-1 text-xs text-[#2B3550] dark:text-slate-100 placeholder-[#B0A090] dark:placeholder:text-slate-500 focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 transition"
        />
        <button
          type="button"
          onClick={send}
          className="inline-flex items-center gap-1 bg-[#EA5A1F] hover:bg-[#D84F17] text-white rounded-full px-3 py-1 text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer"
        >
          <span aria-hidden>✈</span>
          <span>Send</span>
        </button>
      </div>
    </div>
  );
}

