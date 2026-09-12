import { useState, useEffect, useRef } from "react";
import { X, Check } from "lucide-react";

interface RenameBotModalProps {
  isOpen: boolean;
  botName: string;
  onClose: () => void;
  onSave: (newName: string) => void;
}

export default function RenameBotModal({
  isOpen,
  botName,
  onClose,
  onSave,
}: RenameBotModalProps) {
  const [name, setName] = useState(botName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(botName);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, botName]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed && trimmed.length > 0) {
      onSave(trimmed);
    }
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rename-bot-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs rounded-2xl bg-white dark:bg-[#131926] border border-stone-200 dark:border-slate-800 p-4.5 shadow-2xl space-y-3.5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 id="rename-bot-title" className="text-sm font-extrabold text-[#2B3550] dark:text-slate-100">
            Rename Bot
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-7 h-7 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label htmlFor="bot-name-input" className="block text-xs font-bold text-stone-600 dark:text-slate-300 mb-1.5">
              Bot Nickname
            </label>
            <input
              id="bot-name-input"
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              placeholder="Enter bot nickname"
              className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-stone-300 dark:border-slate-700 bg-stone-50/50 dark:bg-[#0F1420] text-[#2B3550] dark:text-slate-100 placeholder-stone-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-bold rounded-xl border border-stone-200 dark:border-slate-700 text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-3.5 py-1.5 text-xs font-black rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <Check size={13} className="stroke-[2.5]" />
              <span>Save</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
