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
      <div className="flex items-center gap-2 bg-[#F7EEDC] border border-[#E6D4B7] rounded-lg px-3 py-1.5 dark:bg-slate-900 dark:border-slate-700">
        <span className="text-[#7C6955] text-xs uppercase dark:text-slate-400">Room</span>
        <span className="font-mono text-lg font-bold tracking-widest text-[#2B3550] dark:text-slate-100">{code}</span>
        <button
          onClick={copy}
          className="text-xs bg-[#EA5A1F] hover:bg-[#D84F17] text-white rounded px-2 py-1 transition"
          title="Copy room code"
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
        <button
          onClick={() => setQrOpen(true)}
          className="text-xs bg-[#FF8F00] hover:bg-[#E57F00] text-white rounded px-2 py-1 transition"
          title="Show QR Code"
        >
          📷 QR
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
