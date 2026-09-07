import React, { useRef } from "react";
import { DoorOpen, AlertTriangle } from "lucide-react";
import Modal from "../Modal";
import { HapticsManager } from "../../services/HapticsManager";

export interface LeaveRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function LeaveRoomModal({
  isOpen,
  onClose,
  onConfirm,
}: LeaveRoomModalProps) {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  const handleCancel = () => {
    HapticsManager.getInstance().subtle();
    onClose();
  };

  const handleConfirm = () => {
    HapticsManager.getInstance().subtle();
    onClose();
    onConfirm();
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      initialFocusRef={cancelBtnRef}
      ariaLabelledBy="leave-modal-title"
      ariaDescribedBy="leave-modal-desc"
      panelClassName="w-full max-w-sm rounded-3xl p-2 bg-gradient-to-b from-rose-500/30 via-amber-500/20 to-slate-800/40 dark:from-rose-500/20 dark:via-slate-800/60 dark:to-slate-900/80 border border-rose-400/40 dark:border-rose-500/30 shadow-[0_25px_60px_-10px_rgba(0,0,0,0.7),0_0_30px_rgba(244,63,94,0.15)] select-none"
    >
      {/* Inner 3D Double-Bezel Card */}
      <div
        className="rounded-[22px] bg-gradient-to-b from-white/95 via-stone-50/95 to-[#FBF8F2]/95 dark:from-[#182132]/95 dark:via-[#121A28]/95 dark:to-[#0C121D]/98 p-5 sm:p-6 space-y-4 border border-white/80 dark:border-slate-700/60 shadow-inner backdrop-blur-xl"
        style={{ transform: "translateZ(20px)" }}
      >
        <div className="flex items-start gap-3.5 text-left">
          {/* 3D Extruded Door Icon */}
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-rose-500 to-rose-600 border-t border-rose-300/80 border-b-[4px] border-rose-800 flex items-center justify-center text-white shadow-[0_8px_16px_rgba(244,63,94,0.3)] shrink-0">
            <DoorOpen className="w-6 h-6 stroke-[2.5]" aria-hidden="true" />
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-3 h-3" aria-hidden="true" />
              <span>Leave Confirmation</span>
            </div>
            <h3
              id="leave-modal-title"
              className="text-base sm:text-lg font-black font-display text-slate-900 dark:text-white leading-tight"
            >
              Leave this table?
            </h3>
            <p
              id="leave-modal-desc"
              className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium"
            >
              You will leave the match and forfeit your current seat at this lounge table.
            </p>
          </div>
        </div>

        {/* 3D Physical Extruded Action Buttons */}
        <div className="flex items-center gap-2.5 pt-2">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={handleCancel}
            className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white/90 dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-700/90 border-t border-x border-slate-200 dark:border-slate-600 border-b-[3px] border-slate-400 dark:border-slate-900 active:border-b-[1px] active:translate-y-[2px] shadow-xs transition-all cursor-pointer min-h-[44px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            Stay Here
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-rose-500 via-rose-600 to-red-600 border-t border-rose-300/60 border-b-[4px] border-rose-900 hover:brightness-105 active:border-b-[1px] active:translate-y-[3px] shadow-[0_4px_14px_rgba(244,63,94,0.35)] transition-all cursor-pointer min-h-[44px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            Leave Room
          </button>
        </div>
      </div>
    </Modal>
  );
}
