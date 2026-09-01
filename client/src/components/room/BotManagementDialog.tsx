import { useEffect, useRef, useState } from "react";
import type { BotDifficulty, GameKind } from "@shared/types";
import { Bot } from "lucide-react";
import Modal from "../Modal";
import { RewardButton, SecondaryButton } from "../../design-system/dls/Buttons";

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
  const inputRef = useRef<HTMLInputElement>(null);

  // Form reset on close — separate from focus-trap/Escape/restoration, which
  // <Modal> now owns via useFocusTrap.
  useEffect(() => {
    if (!isOpen) {
      setBotName("");
      setIsSubmitting(false);
    }
  }, [isOpen]);

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
    <Modal
      open={isOpen}
      onClose={onClose}
      initialFocusRef={inputRef}
      ariaLabelledBy="bot-dialog-title"
      panelClassName="w-full max-w-md rounded-2xl bg-[#FFFDF8] dark:bg-[#151D2A] border border-[#EEDBCA] dark:border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4 text-left"
    >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#EEDBCA]/60 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Bot size={20} aria-hidden />
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
              aria-label="Bot Nickname (Optional)"
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
                  aria-label={`Use suggested name ${name}`}
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
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Bot difficulty options">
                {(["easy", "medium", "hard"] as BotDifficulty[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    aria-pressed={difficulty === d}
                    aria-label={`Select ${d} difficulty`}
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
            <SecondaryButton type="button" size="sm" className="flex-1" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </SecondaryButton>

            <RewardButton type="submit" size="sm" className="flex-1" disabled={isSubmitting || availableSeats <= 0}>
              {isSubmitting ? "Adding..." : "+ Add Bot"}
            </RewardButton>
          </div>
        </form>
    </Modal>
  );
}
