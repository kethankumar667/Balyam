import { useEffect, useRef } from "react";

export default function LeaveRoomModal({
  isOpen,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Focus cancel button on open
    cancelBtnRef.current?.focus();

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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="leave-modal-title"
      aria-describedby="leave-modal-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        ref={modalRef}
        className="w-full max-w-sm rounded-2xl bg-[#FFFDF8] dark:bg-[#151D2A] border border-[#EEDBCA] dark:border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4"
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
      </div>
    </div>
  );
}
