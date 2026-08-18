import { useState } from "react";
import type { FriendRequest } from "@shared/social/FriendRequest";
import { AddFriendUserIcon } from "../../design-system/icons";
import { SURFACES } from "../../design-system/dls";

interface FriendRequestPanelProps {
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
  onSendRequest: (recipientId: string) => Promise<void>;
  onAccept: (requestId: string) => Promise<void>;
  onDecline: (requestId: string) => Promise<void>;
}

export default function FriendRequestPanel({
  incoming,
  outgoing,
  onSendRequest,
  onAccept,
  onDecline,
}: FriendRequestPanelProps) {
  const [targetIdInput, setTargetIdInput] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetIdInput.trim()) return;
    try {
      await onSendRequest(targetIdInput.trim());
      setTargetIdInput("");
      setFeedback("Friend request dispatched!");
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback(err.message || "Failed to send request");
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Send Request Bar */}
      <div className={`${SURFACES.cardDefault} p-4 sm:p-5 space-y-3`}>
        <h3 className="font-bold text-sm text-stone-100 flex items-center gap-1.5">
          <AddFriendUserIcon size={16} className="text-amber-400" />
          Send Friend Request
        </h3>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="Enter Player ID (e.g. player_xyz123)..."
            value={targetIdInput}
            onChange={(e) => setTargetIdInput(e.target.value)}
            className="flex-1 bg-stone-950/80 border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500 font-mono"
          />
          <button
            type="submit"
            className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs px-4 py-2 rounded-xl transition uppercase font-mono tracking-wider shrink-0"
          >
            Send Invite
          </button>
        </form>
        {feedback && (
          <p className="text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg">
            {feedback}
          </p>
        )}
      </div>

      {/* Incoming Requests */}
      <div className="space-y-3">
        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-400">
          Incoming Requests ({incoming.length})
        </h4>
        {incoming.length === 0 ? (
          <div className="bg-stone-900/40 border border-stone-800 rounded-xl p-6 text-center text-stone-500 text-xs font-mono">
            No incoming friend requests.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {incoming.map((req) => (
              <div
                key={req.id}
                className={`${SURFACES.cardDefault} p-3.5 flex items-center justify-between gap-3`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{req.senderAvatar || "👤"}</span>
                  <div>
                    <h5 className="font-bold text-sm text-stone-100">{req.senderName}</h5>
                    <span className="text-[10px] font-mono text-stone-500 block">
                      ID: {req.senderId}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onAccept(req.id)}
                    className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs px-3 py-1.5 rounded-lg transition font-mono uppercase"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => onDecline(req.id)}
                    className="bg-stone-800 hover:bg-rose-950/50 text-stone-400 hover:text-rose-300 text-xs px-2.5 py-1.5 rounded-lg border border-stone-700 transition"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Outgoing Requests */}
      <div className="space-y-3">
        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-400">
          Pending Sent Requests ({outgoing.length})
        </h4>
        {outgoing.length === 0 ? (
          <div className="bg-stone-900/40 border border-stone-800 rounded-xl p-4 text-center text-stone-500 text-xs font-mono">
            No pending outgoing requests.
          </div>
        ) : (
          <div className="space-y-2">
            {outgoing.map((req) => (
              <div
                key={req.id}
                className="bg-stone-900/60 border border-stone-800 rounded-xl p-3 flex items-center justify-between text-xs font-mono"
              >
                <span className="text-stone-300">Invite sent to ID: <strong>{req.recipientId}</strong></span>
                <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  PENDING
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
