import { useState, useRef, useEffect } from "react";
import type { ChatMessage, Player } from "@shared/types";
import { getSocket } from "../../lib/socket";
import VoicePanel from "../VoicePanel";
import { useVoiceSession } from "../../lib/voice-session";

const QUICK_PHRASES = [
  "Nice move! 👏",
  "All the best 🍀",
  "Well played! 🎉",
  "So close! 😲",
  "Haar gaya 😅",
  "Mast! 🔥",
];

export default function CommunicationPanel({
  messages,
  players,
  selfId,
  isMobile = false,
}: {
  messages: ChatMessage[];
  players: Player[];
  selfId: string | null;
  isMobile?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"chat" | "voice">("chat");
  const [text, setText] = useState("");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Monitor voice status for badge
  const voice = useVoiceSession(selfId);
  const voiceConnected = voice.status === "live";

  useEffect(() => {
    if (activeTab === "chat") {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab]);

  function sendText(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return;
    getSocket().emit("chat:send", { text: trimmed });
  }

  function send() {
    sendText(text);
    setText("");
  }

  // Render tabbed content body
  const renderContent = () => (
    <div className="flex flex-col h-full space-y-2">
      {/* Tab Navigation */}
      <div
        role="tablist"
        className="flex items-center gap-1 bg-[#FFF4E0] dark:bg-slate-800/80 p-1 rounded-2xl border border-[#EEDBCA] dark:border-slate-700/60 shrink-0"
      >
        <button
          role="tab"
          type="button"
          aria-selected={activeTab === "chat"}
          aria-controls="comm-tab-chat"
          onClick={() => setActiveTab("chat")}
          className={`flex-1 min-h-[38px] py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === "chat"
              ? "bg-white dark:bg-slate-900 text-[#2B3550] dark:text-slate-100 shadow-xs border border-[#EEDBCA] dark:border-slate-800"
              : "text-[#8A6D4B] dark:text-slate-400 hover:text-[#2B3550] dark:hover:text-slate-200"
          }`}
        >
          <span aria-hidden>💬</span>
          <span>Chat</span>
          {messages.length > 0 && (
            <span className="text-[10px] bg-[#EA5A1F] text-white rounded-full px-1.5 py-0.2 ml-0.5">
              {messages.length}
            </span>
          )}
        </button>

        <button
          role="tab"
          type="button"
          aria-selected={activeTab === "voice"}
          aria-controls="comm-tab-voice"
          onClick={() => setActiveTab("voice")}
          className={`flex-1 min-h-[38px] py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === "voice"
              ? "bg-white dark:bg-slate-900 text-[#2B3550] dark:text-slate-100 shadow-xs border border-[#EEDBCA] dark:border-slate-800"
              : "text-[#8A6D4B] dark:text-slate-400 hover:text-[#2B3550] dark:hover:text-slate-200"
          }`}
        >
          <span aria-hidden>🎙</span>
          <span>Voice</span>
          {voiceConnected && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
          )}
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "chat" ? (
        <div
          id="comm-tab-chat"
          role="tabpanel"
          className="flex flex-col flex-1 min-h-0 space-y-2"
        >
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar min-h-[140px] max-h-[220px]">
            {messages.length === 0 && (
              <div className="text-[#8A6D4B] dark:text-slate-400 text-xs py-2 text-center font-medium">
                No messages yet. Say hi to the table! 👋
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`text-xs p-1.5 rounded-lg ${
                  m.playerId === selfId
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-medium"
                    : "bg-white dark:bg-[#0F1420] text-[#2B3550] dark:text-slate-100 border border-[#EEDBCA]/60 dark:border-slate-800"
                }`}
              >
                <span className="font-extrabold">{m.playerName}:</span>{" "}
                <span>{m.text}</span>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Quick phrases chips */}
          <div className="flex flex-wrap gap-1 pt-1 border-t border-[#EEDBCA]/60 dark:border-slate-800">
            {QUICK_PHRASES.slice(0, 3).map((p) => (
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

          {/* Chat input */}
          <div className="flex gap-1.5 pt-0.5">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Type message..."
              maxLength={500}
              className="flex-1 bg-white dark:bg-[#0F1420] border border-[#EEDBCA] dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-[#2B3550] dark:text-slate-100 placeholder-[#B0A090] dark:placeholder:text-slate-500 focus:outline-none focus:border-[#EA5A1F] transition"
            />
            <button
              type="button"
              onClick={send}
              aria-label="Send message"
              className="px-3 py-1.5 rounded-xl bg-[#EA5A1F] hover:bg-[#D84F17] text-white font-bold text-xs transition active:scale-95 cursor-pointer"
            >
              Send
            </button>
          </div>
        </div>
      ) : (
        <div
          id="comm-tab-voice"
          role="tabpanel"
          className="flex-1 min-h-0 overflow-y-auto"
        >
          <VoicePanel players={players} selfId={selfId} />
        </div>
      )}
    </div>
  );

  // On Mobile, render a compact expandable trigger / drawer or inline card
  if (isMobile) {
    return (
      <>
        {/* Compact Mobile Strip */}
        <div className="bg-[#FFFDF8] dark:bg-[#131926] border-2 border-[#EEDBCA] dark:border-slate-800 rounded-3xl p-3 shadow-xs">
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-2xl bg-[#FFF9EE] dark:bg-[#182234] border border-[#EEDBCA] dark:border-slate-700/60 hover:border-amber-400 transition cursor-pointer"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-[#2B3550] dark:text-slate-200">
              <span>💬 Chat & 🎙 Voice</span>
              {messages.length > 0 && (
                <span className="text-[10px] bg-[#EA5A1F] text-white rounded-full px-1.5 py-0.2">
                  {messages.length}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-[#EA5A1F] dark:text-amber-400">
              {voiceConnected && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              )}
              <span>Open ↗</span>
            </div>
          </button>
        </div>

        {/* Mobile Bottom Sheet Drawer */}
        {mobileDrawerOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Chat and Voice Drawer"
            className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in"
          >
            <div className="bg-[#FFFDF8] dark:bg-[#151D2A] border-t-2 border-[#EEDBCA] dark:border-slate-800 rounded-t-3xl p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl max-h-[80vh] flex flex-col space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-[#EEDBCA]/60 dark:border-slate-800">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#8A6D4B] dark:text-slate-400">
                  Communication
                </h3>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-[#2B3550] dark:text-slate-100 font-bold flex items-center justify-center cursor-pointer text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto">
                {renderContent()}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop Panel
  return (
    <div className="bg-[#FFFDF8] dark:bg-[#131926] border-2 border-[#EEDBCA] dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col min-h-[320px]">
      {renderContent()}
    </div>
  );
}
