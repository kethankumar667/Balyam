import { useState, useEffect } from "react";
import type { ChatMessage, Player } from "@shared/types";
import { MessageSquare, Mic } from "lucide-react";
import VoicePanel from "../VoicePanel";
import Chat from "../Chat";
import { useVoiceSession } from "../../lib/voice-session";
import { useVisualViewport } from "../../lib/useVisualViewport";

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
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const visualViewport = useVisualViewport();

  // Monitor voice status for badge
  const voice = useVoiceSession(selfId);
  const voiceConnected = voice.status === "live";

  // Close mobile drawer on Escape key
  useEffect(() => {
    if (!mobileDrawerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileDrawerOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileDrawerOpen]);

  // Tabbed content renderer
  const renderTabContent = () => (
    <div className="flex flex-col h-full min-h-0 w-full max-w-full space-y-2 overflow-hidden">
      {/* Tab Navigation Strip */}
      <div
        role="tablist"
        aria-label="Communication options"
        className="flex items-center gap-1 bg-[#FFF4E0] dark:bg-slate-800/80 p-1 rounded-2xl border border-[#EEDBCA] dark:border-slate-700/60 shrink-0"
      >
        <button
          role="tab"
          type="button"
          aria-selected={activeTab === "chat"}
          aria-controls="comm-tab-chat"
          onClick={() => setActiveTab("chat")}
          className={`flex-1 min-h-[40px] py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === "chat"
              ? "bg-white dark:bg-slate-900 text-[#2B3550] dark:text-slate-100 shadow-xs border border-[#EEDBCA] dark:border-slate-800"
              : "text-[#8A6D4B] dark:text-slate-400 hover:text-[#2B3550] dark:hover:text-slate-200"
          }`}
        >
          <MessageSquare size={14} aria-hidden />
          <span>Chat</span>
          {messages.length > 0 && (
            <span className="text-[10px] bg-[#EA5A1F] text-white rounded-full px-1.5 py-0.5 ml-0.5 font-extrabold">
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
          className={`flex-1 min-h-[40px] py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === "voice"
              ? "bg-white dark:bg-slate-900 text-[#2B3550] dark:text-slate-100 shadow-xs border border-[#EEDBCA] dark:border-slate-800"
              : "text-[#8A6D4B] dark:text-slate-400 hover:text-[#2B3550] dark:hover:text-slate-200"
          }`}
        >
          <Mic size={14} aria-hidden />
          <span>Voice</span>
          {voiceConnected && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
          )}
        </button>
      </div>

      {/* Active Tab Panel */}
      <div className="flex-1 min-h-0 w-full max-w-full flex flex-col overflow-hidden">
        {activeTab === "chat" ? (
          <div
            id="comm-tab-chat"
            role="tabpanel"
            className="flex-1 min-h-0 w-full max-w-full flex flex-col overflow-hidden"
          >
            <Chat
              messages={messages}
              selfId={selfId}
              showHeader={false}
              className="border-0 shadow-none rounded-2xl bg-transparent dark:bg-transparent"
            />
          </div>
        ) : (
          <div
            id="comm-tab-voice"
            role="tabpanel"
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-1"
          >
            <VoicePanel players={players} selfId={selfId} />
          </div>
        )}
      </div>
    </div>
  );

  // Mobile Trigger & Bottom Drawer
  if (isMobile) {
    return (
      <>
        {/* Compact Mobile Strip */}
        <div className="bg-[#FFFDF8] dark:bg-[var(--surface-1)] border-2 border-[#EEDBCA] dark:border-slate-800 rounded-3xl p-3 shadow-xs">
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-[#FFF9EE] dark:bg-[#182234] border border-[#EEDBCA] dark:border-slate-700/60 hover:border-amber-400 transition active:scale-98 cursor-pointer"
          >
            <div className="flex items-center gap-2 text-xs font-extrabold text-[#2B3550] dark:text-slate-200">
              <MessageSquare size={16} aria-hidden />
              <span>Chat & 🎙 Voice</span>
              {messages.length > 0 && (
                <span className="text-[10px] bg-[#EA5A1F] text-white rounded-full px-1.5 py-0.5 font-black">
                  {messages.length}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-[#EA5A1F] dark:text-amber-400">
              {voiceConnected && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-extrabold">
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
            className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs touch-none animate-in fade-in"
          >
            <button
              type="button"
              aria-label="Close drawer"
              onClick={() => setMobileDrawerOpen(false)}
              className="flex-1 w-full"
            />
            <div
              className="w-full max-w-full bg-[#FFFDF8] dark:bg-[#151D2A] border-t-2 border-[#EEDBCA] dark:border-slate-800 rounded-t-3xl p-3.5 sm:p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] shadow-2xl flex flex-col space-y-2.5 overflow-hidden animate-[slideInUp_220ms_ease-out]"
              style={{
                height: visualViewport.isKeyboardOpen
                  ? `${visualViewport.height}px`
                  : "min(85dvh, 600px)",
                maxHeight: visualViewport.isKeyboardOpen
                  ? `${visualViewport.height}px`
                  : "85dvh",
              }}
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-1.5 border-b border-[#EEDBCA]/60 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-1 bg-[#EEDBCA] dark:bg-slate-700 rounded-full mx-auto hidden" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#8A6D4B] dark:text-slate-400 flex items-center gap-1.5">
                    <span>💬 Table Communication</span>
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  aria-label="Close communication drawer"
                  className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-[#EFE4D2] dark:bg-slate-800 text-[#2B3550] dark:text-slate-100 font-black flex items-center justify-center cursor-pointer active:scale-95 transition text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EA5A1F]"
                >
                  ✕
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {renderTabContent()}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop Panel
  return (
    <div className="bg-[#FFFDF8] dark:bg-[var(--surface-1)] border-2 border-[#EEDBCA] dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col h-[380px] sm:h-[420px] max-h-[500px] overflow-hidden w-full">
      {renderTabContent()}
    </div>
  );
}
