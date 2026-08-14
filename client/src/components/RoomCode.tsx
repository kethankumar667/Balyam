import { useState } from "react";
import QrCodeModal from "./QrCodeModal";

export default function RoomCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <>
      <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-[#EEDBCA] dark:border-slate-800 rounded-2xl p-1.5 shadow-sm">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#8A6D4B] dark:text-slate-400 pl-2">
          Room Code
        </span>
        <div className="font-mono text-base font-black tracking-[0.2em] text-[#2B3550] dark:text-slate-100 bg-[#FFF9EE] dark:bg-[#0F1420] border border-dashed border-[#E6C99F] dark:border-amber-500/40 rounded-xl px-2.5 py-1">
          {code}
        </div>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 text-xs bg-[#EA5A1F] hover:bg-[#D84F17] text-white font-bold rounded-xl px-3 py-1.5 transition shadow-sm active:scale-95 cursor-pointer"
          title="Copy room code"
        >
          <span aria-hidden>📋</span>
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          type="button"
          onClick={() => setQrOpen(true)}
          className="inline-flex items-center gap-1 text-xs bg-white dark:bg-slate-800 hover:bg-[#FFF9EE] dark:hover:bg-slate-700 border border-[#E8D8BE] dark:border-slate-700 text-[#352C24] dark:text-slate-200 font-semibold rounded-xl px-2.5 py-1.5 transition shadow-sm active:scale-95 cursor-pointer"
          title="Show QR Code"
        >
          <span aria-hidden>📷</span>
          QR Code
        </button>
      </div>

      <QrCodeModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        code={code}
      />
    </>
  );
}

