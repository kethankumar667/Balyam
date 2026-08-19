import { useRef } from "react";
import Modal from "../Modal";

export default function LeaveRoomModal({
  isOpen,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      initialFocusRef={cancelBtnRef}
      ariaLabelledBy="leave-modal-title"
      ariaDescribedBy="leave-modal-desc"
      panelClassName="w-full max-w-sm rounded-2xl bg-[#FFFDF8] dark:bg-[#151D2A] border border-[#EEDBCA] dark:border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4"
    >
      <div className="flex items-center gap-3 text-left">
        <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center text-rose-600 dark:text-rose-400 text-lg shrink-0">
          🚪
        </div>
        <div>
          <h3
            id="leave-modal-title"
            className="text-base font-extrabold text-[#2B3550] dark:text-slate-100"
          >
            Leave this table?
          </h3>
          <p
            id="leave-modal-desc"
            className="text-xs text-[#8A6D4B] dark:text-slate-400 mt-0.5"
          >
            You will leave the match and return to the main lobby.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <button
          ref={cancelBtnRef}
          type="button"
          onClick={onClose}
          className="flex-1 min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#FFF9EE] dark:bg-slate-800 hover:bg-[#FFF4E0] dark:hover:bg-slate-700 text-[#6E5E4D] dark:text-slate-200 border border-[#EEDBCA] dark:border-slate-700 transition active:scale-95 cursor-pointer"
        >
          Stay Here
        </button>
        <button
          type="button"
          onClick={() => {
            onClose();
            onConfirm();
          }}
          className="flex-1 min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white shadow-md transition active:scale-95 cursor-pointer"
        >
          Leave Room
        </button>
      </div>
    </Modal>
  );
}
