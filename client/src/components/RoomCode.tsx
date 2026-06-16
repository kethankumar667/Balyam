import { useState } from "react";

export default function RoomCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="flex items-center gap-3 bg-[#F7EEDC] border border-[#E6D4B7] rounded-lg px-4 py-2">
      <span className="text-[#7C6955] text-xs uppercase">Room</span>
      <span className="font-mono text-xl tracking-widest text-[#2B3550]">{code}</span>
      <button
        onClick={copy}
        className="text-xs bg-[#EA5A1F] hover:bg-[#D84F17] text-white rounded px-2 py-1"
      >
        {copied ? "✓ Copied" : "Copy"}
      </button>
    </div>
  );
}
