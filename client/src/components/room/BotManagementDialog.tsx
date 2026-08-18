import { useEffect, useRef, useState } from "react";
import type { BotDifficulty, GameKind } from "@shared/types";

const BOT_NAME_SUGGESTIONS = [
  "AlphaBot",
  "TurboBot",
  "ZenBot",
  "PixelBot",
  "GamerBot",
  "ChaiBot",
  "DesiBot",
  "QuickBot",
];

export default function BotManagementDialog({
  isOpen,
  onClose,
  game,
  availableSeats,
  onAddBot,
}: {
  isOpen: boolean;
  onClose: () => void;
  game: GameKind;
  availableSeats: number;
  onAddBot: (name?: string, difficulty?: BotDifficulty) => Promise<void> | void;
}) {
  const [botName, setBotName] = useState("");
  const [difficulty, setDifficulty] = useState<BotDifficulty>("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setBotName("");
      setIsSubmitting(false);
      return;
    }

    inputRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Tab") {
        if (!modalRef.current) return;
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (isSubmitting || availableSeats <= 0) return;

    setIsSubmitting(true);
    try {
      await onAddBot(botName.trim() || undefined, game === "bingo" ? difficulty : undefined);
      onClose();
    } catch {
      // Keep modal open if error
    } finally {
      setIsSubmitting(false);
    }
  }

  function pickSuggestion(name: string) {
    setBotName(name);
    inputRef.current?.focus();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bot-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        ref={modalRef}
        className="w-full max-w-md rounded-2xl bg-[#FFFDF8] dark:bg-[#151D2A] border border-[#EEDBCA] dark:border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4 text-left"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#EEDBCA]/60 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden>🤖</span>
            <h3
              id="bot-dialog-title"
              className="text-base font-extrabold text-[#2B3550] dark:text-slate-100"
            >
              Customise Bot
            </h3>
          </div>

          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
            {availableSeats} seat{availableSeats === 1 ? "" : "s"} left
          </span>
        </div>

        <p className="text-xs text-[#796651] dark:text-slate-400">
          Optionally give this bot a custom nickname or difficulty. Leaving it blank will automatically pick a random fun name.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Bot Name Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="bot-name-input"
              className="text-xs font-bold uppercase tracking-wider text-[#8A6D4B] dark:text-slate-400 block"
            >
              Bot Nickname (Optional)
            </label>
            <input
              id="bot-name-input"
              ref={inputRef}
              type="text"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              placeholder="e.g. TurboBot (or leave blank for random)"
              maxLength={20}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-[#EEDBCA] dark:border-slate-700 bg-white dark:bg-[#0F1420] text-[#2B3550] dark:text-slate-100 placeholder-[#B0A090] dark:placeholder:text-slate-500 focus:outline-none focus:border-[#EA5A1F] focus:ring-2 focus:ring-[#EA5A1F]/20 transition"
            />

            {/* Suggestions */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[11px] text-[#8A6D4B] dark:text-slate-400 self-center mr-1">
                Suggestions:
              </span>
              {BOT_NAME_SUGGESTIONS.slice(0, 4).map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => pickSuggestion(name)}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FFF4E0] dark:bg-slate-800 text-[#796651] dark:text-slate-300 hover:bg-[#EEDBCA] dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* Bingo Difficulty Selector */}
          {game === "bingo" && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#8A6D4B] dark:text-slate-400 block">
                Bot Difficulty
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["easy", "medium", "hard"] as BotDifficulty[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`min-h-[40px] px-3 py-2 rounded-xl text-xs font-bold capitalize border transition flex items-center justify-center gap-1 cursor-pointer ${
                      difficulty === d
                        ? "bg-[#EA5A1F] border-[#EA5A1F] text-white shadow-xs"
                        : "bg-white dark:bg-slate-800 border-[#EEDBCA] dark:border-slate-700 text-[#796651] dark:text-slate-300 hover:bg-[#FFF9EE] dark:hover:bg-slate-700/60"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#FFF9EE] dark:bg-slate-800 hover:bg-[#FFF4E0] dark:hover:bg-slate-700 text-[#6E5E4D] dark:text-slate-200 border border-[#EEDBCA] dark:border-slate-700 transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || availableSeats <= 0}
              className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <span>Adding...</span>
              ) : (
                <>
                  <span>+</span>
                  <span>Add Bot</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
