import React, { useState } from "react";
import { getSocket } from "../../lib/socket";
import { HapticsManager } from "../../services/HapticsManager";

interface CarromQuickChatPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  opponentId?: string | null;
}

const QUICK_EMOJIS = [
  { emoji: "😭", label: "Crying" },
  { emoji: "😲", label: "Shocked" },
  { emoji: "😁", label: "Grin" },
  { emoji: "😡", label: "Angry" },
  { emoji: "👹", label: "Monster" },
  { emoji: "🙂", label: "Smile" },
];

const QUICK_PHRASES = [
  "Good luck!",
  "Thanks",
  "Well played!",
  "Great shot!",
  "What a strike!",
  "Wow",
];

export function CarromQuickChatPopover({
  isOpen,
  onClose,
  opponentId,
}: CarromQuickChatPopoverProps) {
  const [activeTab, setActiveTab] = useState<"chat" | "emoji">("chat");

  if (!isOpen) return null;

  const handleSendEmoji = (emoji: string) => {
    HapticsManager.getInstance().subtle();
    getSocket().emit("room:reaction", {
      emoji,
      targetPlayerId: opponentId ?? undefined,
    });
    onClose();
  };

  const handleSendPhrase = (phrase: string) => {
    HapticsManager.getInstance().subtle();
    getSocket().emit("chat:send", { text: phrase });
    onClose();
  };

  return (
    <>
      {/* Invisible backdrop to dismiss on tap outside */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Floating Popover Card anchored above bottom-left */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Quick Chat and Emojis"
        className="fixed bottom-20 left-4 z-50 w-72 max-w-[calc(100vw-32px)] rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        style={{
          background: "linear-gradient(180deg, #2B160C 0%, #1A0D07 100%)",
          border: "1.5px solid #63361A",
          boxShadow: "0 10px 30px rgba(0,0,0,0.8), 0 0 15px rgba(245,158,11,0.15)",
        }}
      >
        {/* Red Circular Close Badge */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close quick chat"
          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-90 flex items-center justify-center text-white shadow-md cursor-pointer transition z-10"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Top Tab Bar */}
        <div
          className="flex items-center gap-6 px-4 pt-3 pb-2.5 border-b"
          style={{ borderColor: "#4A2814" }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("chat")}
            aria-label="Messages tab"
            aria-selected={activeTab === "chat"}
            className={`flex items-center gap-1.5 pb-1 cursor-pointer transition ${
              activeTab === "chat"
                ? "text-amber-400 border-b-2 border-amber-400 font-black"
                : "text-amber-200/60 hover:text-amber-200 font-bold"
            }`}
          >
            <span className="text-lg">💬</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("emoji")}
            aria-label="Emojis tab"
            aria-selected={activeTab === "emoji"}
            className={`flex items-center gap-1.5 pb-1 cursor-pointer transition ${
              activeTab === "emoji"
                ? "text-amber-400 border-b-2 border-amber-400 font-black"
                : "text-amber-200/60 hover:text-amber-200 font-bold"
            }`}
          >
            <span className="text-lg">😀</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-3 max-h-[320px] overflow-y-auto overscroll-contain">
          {/* 3x2 Expressive Emoji Grid */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {QUICK_EMOJIS.map(({ emoji, label }) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleSendEmoji(emoji)}
                aria-label={`Send ${label} reaction`}
                className="min-h-[44px] rounded-xl flex items-center justify-center text-2xl hover:scale-110 active:scale-95 transition cursor-pointer"
                style={{
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(245, 158, 11, 0.15)",
                }}
              >
                <span>{emoji}</span>
              </button>
            ))}
          </div>

          {/* Canned Quick Messages List */}
          <div className="flex flex-col divide-y divide-amber-950/40">
            {QUICK_PHRASES.map((phrase) => (
              <button
                key={phrase}
                type="button"
                onClick={() => handleSendPhrase(phrase)}
                aria-label={`Send "${phrase}"`}
                className="w-full text-left py-2.5 px-2 rounded-lg text-sm font-bold text-amber-100 hover:bg-amber-900/20 active:bg-amber-900/40 transition cursor-pointer min-h-[44px] flex items-center"
              >
                {phrase}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}

export default CarromQuickChatPopover;
