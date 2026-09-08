import React, { useState, useEffect } from "react";
import { Coins, Sliders, X, AlertCircle, Check, Loader2 } from "lucide-react";
import Modal from "../Modal";
import {
  ENTRY_STAKE_PRESET_TIERS,
  ENTRY_STAKE_MIN_COINS,
  ENTRY_STAKE_MAX_COINS,
  ENTRY_STAKE_STEP_COINS,
  isValidEntryStakeCoins,
} from "@shared/types";
import { getSocket } from "../../lib/socket";
import { AudioManager } from "../../services/AudioManager";
import { HapticsManager } from "../../services/HapticsManager";
import { AUDIO } from "../../constants/audio";

export interface ChangeStakeModalProps {
  open: boolean;
  onClose: () => void;
  currentStake: number;
  isGuestHost?: boolean;
  playerCount?: number;
}

export const ChangeStakeModal: React.FC<ChangeStakeModalProps> = ({
  open,
  onClose,
  currentStake,
  isGuestHost = false,
  playerCount = 2,
}) => {
  const [selectedTier, setSelectedTier] = useState<string>(() => {
    return ENTRY_STAKE_PRESET_TIERS.includes(currentStake as any)
      ? String(currentStake)
      : "custom";
  });
  const [customStake, setCustomStake] = useState<number>(() => {
    return isValidEntryStakeCoins(currentStake) ? currentStake : 500;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setBusy(false);
      if (ENTRY_STAKE_PRESET_TIERS.includes(currentStake as any)) {
        setSelectedTier(String(currentStake));
      } else {
        setSelectedTier("custom");
        setCustomStake(currentStake);
      }
    }
  }, [open, currentStake]);

  const targetStake = selectedTier === "custom" ? customStake : Number(selectedTier);
  const projectedPot = targetStake * Math.max(1, playerCount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetStake === currentStake) {
      onClose();
      return;
    }

    if (!isValidEntryStakeCoins(targetStake)) {
      setError(`Stake must be between ${ENTRY_STAKE_MIN_COINS} and ${ENTRY_STAKE_MAX_COINS} in steps of ${ENTRY_STAKE_STEP_COINS}.`);
      return;
    }

    if (isGuestHost && targetStake > 100) {
      setError("Guest hosts can only host at the 100-coin table. Sign in to host higher stakes.");
      return;
    }

    setBusy(true);
    setError(null);

    getSocket().emit("room:setEntryStake", targetStake, (res) => {
      setBusy(false);
      if (res && !res.ok) {
        setError(res.error || "Failed to update entry stake");
        try {
          HapticsManager.getInstance().subtle();
        } catch {
          // ignore
        }
      } else {
        try {
          AudioManager.getInstance().play(AUDIO.UI_CLICK);
          HapticsManager.getInstance().subtle();
        } catch {
          // ignore
        }
        onClose();
      }
    });
  };

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      mobileSheet={true}
      ariaLabelledBy="change-stake-dialog-title"
      className="p-4"
    >
      <div className="w-full max-w-md bg-[#FFFDF9] dark:bg-[#161D2B] rounded-3xl p-5 md:p-6 shadow-2xl border border-[#EEDBCA] dark:border-slate-800 text-[#2B3550] dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#EEDBCA]/60 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="change-stake-dialog-title"
                className="text-base md:text-lg font-black tracking-tight"
              >
                Change Entry Stake
              </h2>
              <p className="text-xs text-[#8A6D4B] dark:text-slate-400">
                Adjust table stake before other players ready up
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-full flex items-center justify-center bg-[#FFF4E0] dark:bg-slate-800 hover:bg-[#EEDCC2] dark:hover:bg-slate-700 text-[#8A6D4B] dark:text-slate-300 transition cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div
              role="alert"
              className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Preset Buttons */}
          <div>
            <label className="block text-xs font-bold text-[#8A6D4B] dark:text-slate-400 mb-2">
              Select Preset Tier (coins / seat)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ENTRY_STAKE_PRESET_TIERS.map((tier) => {
                const disabled = isGuestHost && tier > 100;
                const isSelected = selectedTier === String(tier);
                return (
                  <button
                    key={tier}
                    type="button"
                    disabled={disabled || busy}
                    onClick={() => {
                      setSelectedTier(String(tier));
                      setError(null);
                    }}
                    className={`py-2.5 px-3 rounded-2xl font-black text-sm flex flex-col items-center justify-center gap-0.5 border-2 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md scale-[1.02]"
                        : disabled
                        ? "bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60"
                        : "bg-[#FFF9EE] dark:bg-slate-800/80 border-[#EEDBCA] dark:border-slate-700 text-[#2B3550] dark:text-slate-200 hover:border-amber-400/60 active:scale-95"
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <span>🪙</span>
                      <span>{tier}</span>
                    </span>
                    <span className="text-[10px] opacity-80 font-semibold">
                      {tier === 100 ? "Starter" : tier === 500 ? "Popular" : tier === 1000 ? "High Roller" : "Classic"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Stake Option */}
          {!isGuestHost && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedTier("custom");
                  setError(null);
                }}
                className={`w-full py-2 px-3 rounded-2xl border-2 font-bold text-xs flex items-center justify-between transition cursor-pointer ${
                  selectedTier === "custom"
                    ? "bg-amber-500/15 border-amber-500/50 text-amber-900 dark:text-amber-200"
                    : "bg-[#FFF9EE] dark:bg-slate-800/50 border-[#EEDBCA] dark:border-slate-700 text-[#8A6D4B] dark:text-slate-400 hover:border-amber-400/40"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-500" />
                  <span>Custom Stake Slider</span>
                </span>
                <span className="font-extrabold text-amber-600 dark:text-amber-400">
                  {selectedTier === "custom" ? `🪙 ${customStake}` : "Configure"}
                </span>
              </button>

              {selectedTier === "custom" && (
                <div className="mt-3 p-3.5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      Per seat
                    </span>
                    <span className="text-base font-black tabular-nums text-amber-700 dark:text-amber-300">
                      🪙 {customStake}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={ENTRY_STAKE_MIN_COINS}
                    max={ENTRY_STAKE_MAX_COINS}
                    step={ENTRY_STAKE_STEP_COINS}
                    value={customStake}
                    onChange={(e) => setCustomStake(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[#8A6D4B] dark:text-slate-400 mt-1 font-semibold">
                    <span>{ENTRY_STAKE_MIN_COINS} coins</span>
                    <span>{ENTRY_STAKE_MAX_COINS} coins</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {isGuestHost && (
            <p className="text-[11px] text-[#8A6D4B] dark:text-slate-400 font-medium">
              ℹ️ Guest hosts can only host at the 100-coin starter table. Sign in to host higher stakes or custom bets.
            </p>
          )}

          {/* Projection breakdown */}
          <div className="p-3 rounded-2xl bg-[#FFF4E0] dark:bg-[#1E2738] border border-[#EEDBCA] dark:border-slate-700/60 flex items-center justify-between text-xs font-bold">
            <div className="space-y-0.5">
              <span className="text-[#8A6D4B] dark:text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">
                Projected Pot ({playerCount} seats)
              </span>
              <span className="text-amber-700 dark:text-amber-300 text-sm font-black flex items-center gap-1">
                <span>🪙</span>
                <span>{projectedPot.toLocaleString()} coins</span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-[#8A6D4B] dark:text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">
                New Bet
              </span>
              <span className="text-ink-hi dark:text-text-hi font-extrabold">
                🪙 {targetStake} / seat
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-slate-200/80 hover:bg-slate-300/80 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold text-xs text-[#2B3550] dark:text-slate-200 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || (targetStake === currentStake && selectedTier !== "custom")}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating…</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Confirm (🪙 {targetStake})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
