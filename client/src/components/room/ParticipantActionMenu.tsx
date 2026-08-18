import { useEffect, useRef, useState } from "react";
import type { Player } from "@shared/types";

export default function ParticipantActionMenu({
  player,
  isHost,
  onRemoveBot,
  onRemoveLocalPlayer,
}: {
  player: Player;
  isHost: boolean;
  onRemoveBot?: (botId: string) => void;
  onRemoveLocalPlayer?: (localId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsConfirmingRemove(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setIsConfirmingRemove(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!isHost || (!player.isBot && !player.isLocal)) {
    return null;
  }

  function handleAction() {
    if (player.isBot && onRemoveBot) {
      onRemoveBot(player.id);
    } else if (player.isLocal && onRemoveLocalPlayer) {
      onRemoveLocalPlayer(player.id);
    }
    setIsOpen(false);
    setIsConfirmingRemove(false);
  }

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          setIsConfirmingRemove(false);
        }}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`Actions for ${player.name}`}
        className="w-9 h-9 min-h-[44px] min-w-[44px] sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-[#8A6D4B] dark:text-slate-400 hover:text-[#2B3550] dark:hover:text-slate-100 hover:bg-[#FFF4E0] dark:hover:bg-slate-700/60 transition active:scale-95 cursor-pointer"
      >
        <span className="text-sm font-bold leading-none">•••</span>
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 w-48 rounded-xl bg-[#FFFDF8] dark:bg-[#1A2333] border border-[#EEDBCA] dark:border-slate-700 shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-3 py-1.5 border-b border-[#EEDBCA]/60 dark:border-slate-800 text-[11px] font-bold text-[#8A6D4B] dark:text-slate-400 truncate">
            {player.name} {player.isBot ? "(Bot)" : "(Local)"}
          </div>

          {!isConfirmingRemove ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => setIsConfirmingRemove(true)}
              className="w-full text-left px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 transition cursor-pointer min-h-[40px]"
            >
              <span aria-hidden>🗑️</span>
              <span>{player.isBot ? "Remove Bot" : "Remove Local Seat"}</span>
            </button>
          ) : (
            <div className="p-2 space-y-1.5 bg-rose-50/50 dark:bg-rose-950/30">
              <p className="text-[11px] font-bold text-rose-700 dark:text-rose-300">
                Confirm removal?
              </p>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsConfirmingRemove(false)}
                  className="flex-1 py-1 text-[10px] font-semibold bg-white dark:bg-slate-800 border border-[#EEDBCA] dark:border-slate-700 rounded-md text-[#6E5E4D] dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAction}
                  className="flex-1 py-1 text-[10px] font-extrabold bg-rose-600 text-white rounded-md hover:bg-rose-700 transition cursor-pointer shadow-xs"
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
