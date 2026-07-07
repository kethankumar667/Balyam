import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@shared/types";
import { getSocket } from "../lib/socket";

/**
 * Quick-chat presets — one tap fires a friendly, desi-flavoured line as a
 * normal chat message. Shared by every game that mounts the room rail.
 */
const QUICK_PHRASES = ["Nice move! 👏", "All the best 🤞", "Well played 🙌", "So close! 😅", "Haar gaya 😄", "Mast! 🔥"];

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
    <div className="bg-[#F7EEDC] border border-[#E6D4B7] rounded-xl flex flex-col h-80 dark:bg-slate-900 dark:border-slate-700">
      <div className="px-4 py-2 border-b border-[#E2CFB0] text-sm uppercase text-[#7A6652] dark:border-slate-700 dark:text-slate-400">
        Chat
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {messages.length === 0 && (
          <div className="text-[#8A7865] text-sm dark:text-slate-500">No messages yet. Say hi 👋</div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`text-sm ${m.playerId === selfId ? "text-[#2A4D87] dark:text-blue-300" : "text-[#352C24] dark:text-slate-200"}`}>
            <span className="font-semibold">{m.playerName}:</span>{" "}
            <span>{m.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
        <div className="px-2 pt-2 flex flex-wrap gap-1.5">
          {QUICK_PHRASES.map((p) => (
            <button
              key={p}
              onClick={() => sendText(p)}
              className="rounded-full bg-[#EFE2C7] hover:bg-[#E5D4B2] active:scale-95 text-[#5C4A38] text-xs font-semibold px-2.5 py-1 transition dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
            >
              {p}
            </button>
          ))}
        </div>
      <div className="p-2 border-t border-[#E2CFB0] flex gap-2 dark:border-slate-700">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type a message..."
          maxLength={500}
          className="flex-1 bg-[#FFF9EE] border border-[#DCC8A6] rounded px-3 py-1.5 text-sm text-[#352C24] focus:outline-none focus:border-[#EA5A1F] dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        <button
          onClick={send}
          className="bg-[#EA5A1F] hover:bg-[#D84F17] text-white rounded px-3 py-1.5 text-sm font-semibold"
        >
          Send
        </button>
      </div>
    </div>
  );
}
