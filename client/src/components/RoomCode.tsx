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
      <div className="flex items-center gap-2 bg-[var(--room-panel)] border border-[var(--room-panel-edge)] rounded-lg px-3 py-1.5">
        <span className="text-[var(--room-ink-soft)] text-xs uppercase">Room</span>
        <span className="font-mono text-lg font-bold tracking-widest text-[var(--room-ink)]">{code}</span>
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
