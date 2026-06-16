import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@shared/types";
import { getSocket } from "../lib/socket";

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

  function send() {
    const trimmed = text.trim();
    if (!trimmed) return;
    getSocket().emit("chat:send", { text: trimmed });
    setText("");
  }

  return (
    <div className="bg-[#F7EEDC] border border-[#E6D4B7] rounded-xl flex flex-col h-80">
      <div className="px-4 py-2 border-b border-[#E2CFB0] text-sm uppercase text-[#7A6652]">
        Chat
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {messages.length === 0 && (
          <div className="text-[#8A7865] text-sm">No messages yet. Say hi 👋</div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`text-sm ${m.playerId === selfId ? "text-[#2A4D87]" : "text-[#352C24]"}`}>
            <span className="font-semibold">{m.playerName}:</span>{" "}
            <span>{m.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="p-2 border-t border-[#E2CFB0] flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type a message..."
          maxLength={500}
          className="flex-1 bg-[#FFF9EE] border border-[#DCC8A6] rounded px-3 py-1.5 text-sm text-[#352C24] focus:outline-none focus:border-[#EA5A1F]"
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
