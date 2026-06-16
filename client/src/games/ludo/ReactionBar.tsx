import { useState } from "react";
import { getSocket } from "../../lib/socket";

const QUICK_EMOJIS = ["👍", "😂", "🔥", "🎉", "😮", "💯", "👏", "🤝"];
const MORE_EMOJIS = ["😢", "🤔", "😭", "😡", "🙌", "💪", "🎯", "💔"];

export default function ReactionBar() {
  const [expanded, setExpanded] = useState(false);
  const [cooldown, setCooldown] = useState(false);

  function send(emoji: string) {
    if (cooldown) return;
    getSocket().emit("room:reaction", { emoji });
    setCooldown(true);
    setTimeout(() => setCooldown(false), 400);
  }

  return (
    <div className="bg-slate-900/70 rounded-full px-2 py-1.5 flex items-center gap-1 shadow-lg backdrop-blur">
      {QUICK_EMOJIS.map((e) => (
        <button
          key={e}
          onClick={() => send(e)}
          disabled={cooldown}
          className="text-2xl hover:scale-125 active:scale-110 transition disabled:opacity-50 leading-none w-9 h-9 flex items-center justify-center"
          title={`React with ${e}`}
        >
          {e}
        </button>
      ))}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="text-xs text-slate-400 hover:text-white w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-700"
        title="More emojis"
      >
        {expanded ? "−" : "+"}
      </button>
      {expanded && (
        <div className="flex items-center gap-1 pl-1 border-l border-slate-700">
          {MORE_EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => send(e)}
              disabled={cooldown}
              className="text-2xl hover:scale-125 active:scale-110 transition disabled:opacity-50 leading-none w-9 h-9 flex items-center justify-center"
              title={`React with ${e}`}
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
