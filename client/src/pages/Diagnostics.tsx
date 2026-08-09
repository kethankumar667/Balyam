import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { clearConnLog, formatConnLog, readConnLog } from "../lib/connectionLog";
import { getSocket } from "../lib/socket";

/**
 * Connection diagnostics.
 *
 * Exists because two reconnect fixes have now failed on a real handset with
 * no way to see why. A phone has no console, and by the time the player is
 * back on wifi the evidence is gone. This reads the persisted log back and
 * offers a single Copy button, so a bug report becomes a paste instead of a
 * description.
 *
 * Route: /diagnostics
 */
export default function Diagnostics() {
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const [live, setLive] = useState({ connected: false, id: "", transport: "" });

  const refresh = () => setText(formatConnLog());

  useEffect(() => {
    refresh();
    const socket = getSocket();
    const tick = () => {
      setLive({
        connected: socket.connected,
        id: socket.id ?? "",
        transport: socket.io.engine?.transport?.name ?? "?",
      });
    };
    tick();
    const t = window.setInterval(() => {
      tick();
      refresh();
    }, 1000);
    return () => window.clearInterval(t);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is blocked outside a secure context, which is exactly where
      // this gets used. The textarea below is selectable as the fallback.
      setCopied(false);
    }
  }

  const eventCount = readConnLog().length;

  return (
    <div className="bhalyam-home bhalyam-paper min-h-screen p-4 sm:p-6">
      <header className="flex items-center justify-between gap-3 mb-4">
        <h1 className="bhalyam-display text-[#1D2C4A] text-[26px] sm:text-[34px] leading-none">
          Connection log
        </h1>
        <Link
          to="/"
          className="rounded-full px-4 py-2 bg-[#FCF8EF] border border-[#E8D8BE]
                     text-[#3F2F24] font-bold text-[13px]"
        >
          Home
        </Link>
      </header>

      <div
        className="rounded-xl px-3 py-2 mb-3 text-[13px] font-bold"
        style={{
          background: live.connected ? "#DCEFD8" : "#F6DCD0",
          border: `1px solid ${live.connected ? "#7FA86E" : "#C98B6E"}`,
          color: "#2A221B",
        }}
      >
        {live.connected ? "Connected" : "Not connected"}
        {live.connected && (
          <span className="font-semibold opacity-80">
            {" "}
            · {live.transport} · {live.id.slice(0, 8)}
          </span>
        )}
        <span className="block font-semibold opacity-70 mt-0.5">
          {eventCount} event{eventCount === 1 ? "" : "s"} recorded
        </span>
      </div>

      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={copy}
          className="rounded-full px-4 py-2 bg-[#1D2C4A] text-[#FCF8EF] font-extrabold text-[13px]"
        >
          {copied ? "Copied" : "Copy log"}
        </button>
        <button
          type="button"
          onClick={() => {
            clearConnLog();
            refresh();
          }}
          className="rounded-full px-4 py-2 bg-[#FCF8EF] border border-[#E8D8BE]
                     text-[#3F2F24] font-bold text-[13px]"
        >
          Clear
        </button>
      </div>

      {/* A textarea, not a <pre>: on a phone that cannot reach the clipboard
          API (non-HTTPS origins block it) long-press select-all still works. */}
      <textarea
        readOnly
        value={text}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full h-[60vh] rounded-xl p-3 font-mono text-[11px] leading-relaxed
                   bg-[#FCF8EF] border border-[#E8D8BE] text-[#2A221B]"
      />

      <p className="text-[12px] font-semibold text-[#5D4B3F] mt-2">
        Reproduce the problem first, then come back here and copy. The log
        survives reloads and network loss.
      </p>
    </div>
  );
}
