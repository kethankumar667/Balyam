import { useState, useEffect } from "react";
import type { ChatMessage, Player } from "@shared/types";
import { MessageSquare, Mic, ChevronRight } from "lucide-react";
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

  // Mobile / Inline Trigger & Bottom Drawer
  if (isMobile) {
    return (
      <>
        {/* Polished Teaser Card matching the mockup */}
        <div
          data-testid="communication-teaser-card"
          onClick={() => setMobileDrawerOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setMobileDrawerOpen(true);
            }
          }}
          aria-label="Open Chat and Voice drawer"
          className="w-full bg-white dark:bg-[#131926] border border-stone-200/80 dark:border-slate-800 rounded-3xl p-3.5 sm:p-4 shadow-xs flex items-center justify-between gap-3 relative overflow-hidden select-none cursor-pointer hover:border-amber-300 dark:hover:border-slate-700 transition active:scale-98 group"
        >
          {/* Left: Chat & Mic Icons Container */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200/70 dark:border-sky-800/60 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0 gap-0.5">
              <MessageSquare size={16} />
              <Mic size={14} className="opacity-80" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-[#2B3550] dark:text-slate-100">
                  Chat &amp; Voice
                </span>
                {messages.length > 0 && (
                  <span className="text-[10px] bg-orange-600 text-white rounded-full px-1.5 py-0.2 font-black">
                    {messages.length}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 dark:text-slate-400 font-medium truncate">
                Chat with players or jump on voice before the match
              </p>
            </div>
          </div>

          {/* Right: Open Button & Voice status */}
          <div className="flex flex-col items-end gap-0.5 shrink-0">
            <div className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full border border-stone-200/90 dark:border-slate-700 bg-stone-50/80 dark:bg-slate-800 group-hover:bg-amber-50 dark:group-hover:bg-slate-700 text-xs font-bold text-stone-700 dark:text-slate-200 transition shadow-2xs">
              <span>Open</span>
              <ChevronRight size={14} />
            </div>

            <div className="flex items-center gap-1 text-[10px] font-semibold text-stone-500 dark:text-slate-400">
              <span className={`w-1.5 h-1.5 rounded-full ${voiceConnected ? "bg-emerald-500 animate-pulse" : "bg-emerald-500"}`} />
              <span>Voice available</span>
            </div>
          </div>
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
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#8A6D4B] dark:text-slate-400 flex items-center gap-1.5">
                    <span>💬 Table Communication</span>
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  aria-label="Close communication drawer"
                  className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-[#EFE4D2] dark:bg-slate-800 text-[#2B3550] dark:text-slate-100 font-black flex items-center justify-center cursor-pointer active:scale-95 transition text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EA5A1F]"
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
    <div className="bg-white dark:bg-[#131926] border border-stone-200/80 dark:border-slate-800 rounded-3xl p-3 sm:p-3.5 shadow-xs flex flex-col h-[280px] sm:h-[300px] max-h-[340px] overflow-hidden w-full">
      {renderTabContent()}
    </div>
  );
}
