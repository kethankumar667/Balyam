import { useEffect, useRef, useState } from "react";
import type { Player } from "@shared/types";
import { Trash2, Pencil } from "lucide-react";

export default function ParticipantActionMenu({
  player,
  isHost,
  onRemoveBot,
  onRemoveLocalPlayer,
  onRenameBot,
}: {
  player: Player;
  isHost: boolean;
  onRemoveBot?: (botId: string) => void;
  onRemoveLocalPlayer?: (localId: string) => void;
  onRenameBot?: (botId: string, newName: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(player.name);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingName) {
      setNameInput(player.name);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isEditingName, player.name]);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsEditingName(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setIsEditingName(false);
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

  function handleDirectRemove() {
    if (player.isBot && onRemoveBot) {
      onRemoveBot(player.id);
    } else if (player.isLocal && onRemoveLocalPlayer) {
      onRemoveLocalPlayer(player.id);
    }
    setIsOpen(false);
    setIsEditingName(false);
  }

  function handleRenameSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = nameInput.trim();
    if (trimmed && trimmed.length > 0 && onRenameBot) {
      onRenameBot(player.id, trimmed);
    }
    setIsOpen(false);
    setIsEditingName(false);
  }

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          setIsEditingName(false);
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
          className="absolute right-0 top-full mt-1 w-52 rounded-xl bg-[#FFFDF8] dark:bg-[#1A2333] border border-[#EEDBCA] dark:border-slate-700 shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 duration-100"
        >
          {isEditingName ? (
            <form onSubmit={handleRenameSubmit} className="p-2.5 space-y-2">
              <div className="text-[11px] font-bold text-[#8A6D4B] dark:text-slate-400">
                Rename Bot
              </div>
              <input
                ref={inputRef}
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={20}
                placeholder="Enter bot nickname"
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[#EEDBCA] dark:border-slate-700 bg-white dark:bg-[#0F1420] text-[#2B3550] dark:text-slate-100 placeholder-[#B0A090] dark:placeholder:text-slate-500 focus:outline-none focus:border-[#EA5A1F] focus:ring-1 focus:ring-[#EA5A1F]"
              />
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsEditingName(false)}
                  className="flex-1 py-1 text-[11px] font-semibold bg-white dark:bg-slate-800 border border-[#EEDBCA] dark:border-slate-700 rounded-md text-[#6E5E4D] dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!nameInput.trim()}
                  className="flex-1 py-1 text-[11px] font-extrabold bg-[#EA5A1F] text-white rounded-md hover:bg-[#D44E17] transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="px-3 py-1.5 border-b border-[#EEDBCA]/60 dark:border-slate-800 text-[11px] font-bold text-[#8A6D4B] dark:text-slate-400 truncate">
                {player.name} {player.isBot ? "(Bot)" : "(Local)"}
              </div>

              {/* Rename Bot Action (if Bot) */}
              {player.isBot && onRenameBot && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => setIsEditingName(true)}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-[#5C4328] dark:text-slate-200 hover:bg-[#FFF4E0] dark:hover:bg-slate-800 flex items-center gap-2 transition cursor-pointer min-h-[38px]"
                >
                  <Pencil size={13} aria-hidden />
                  <span>Rename Bot</span>
                </button>
              )}

              {/* Direct 1-Tap Remove Action (No confirmation required) */}
              <button
                type="button"
                role="menuitem"
                onClick={handleDirectRemove}
                className="w-full text-left px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 transition cursor-pointer min-h-[38px]"
              >
                <Trash2 size={13} aria-hidden />
                <span>{player.isBot ? "Remove Bot" : "Remove Local Seat"}</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
