import { useRef } from "react";
import Modal from "../Modal";
import { DangerButton, SecondaryButton } from "../../design-system/dls/Buttons";

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
        <SecondaryButton ref={cancelBtnRef} size="sm" className="flex-1" onClick={onClose}>
          Stay Here
        </SecondaryButton>
        <DangerButton
          size="sm"
          className="flex-1"
          onClick={() => {
            onClose();
            onConfirm();
          }}
        >
          Leave Room
        </DangerButton>
      </div>
    </Modal>
  );
}
