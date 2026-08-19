import { useState } from "react";
import type { FriendRequest } from "@shared/social/FriendRequest";
import { AddFriendUserIcon } from "../../design-system/icons";

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
      <div className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-3xl p-5 sm:p-6 space-y-3.5 shadow-sm">
        <h3 className="font-extrabold text-sm text-[var(--auth-ink)] flex items-center gap-2">
          <span className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center flex-shrink-0">
            <AddFriendUserIcon size={14} />
          </span>
          Send Friend Request
        </h3>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Enter Player ID (e.g. player_xyz123)..."
            value={targetIdInput}
            onChange={(e) => setTargetIdInput(e.target.value)}
            className="flex-1 bg-[var(--auth-field)] border border-[var(--auth-field-edge)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--auth-ink)] placeholder-[var(--auth-ink-soft)] focus:outline-none focus:border-amber-500 font-mono transition"
          />
          <button
            type="submit"
            className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs px-5 py-2.5 rounded-xl transition uppercase font-mono tracking-wider shrink-0 shadow-xs"
          >
            Send Invite
          </button>
        </form>
        {feedback && (
          <p className="text-xs font-mono text-amber-500 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl">
            {feedback}
          </p>
        )}
      </div>

      {/* Incoming Requests */}
      <div className="space-y-3">
        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--auth-ink-soft)]">
          Incoming Requests ({incoming.length})
        </h4>
        {incoming.length === 0 ? (
          <div className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-2xl p-6 text-center text-[var(--auth-ink-soft)] text-xs font-mono">
            No incoming friend requests.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {incoming.map((req) => (
              <div
                key={req.id}
                className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{req.senderAvatar || "👤"}</span>
                  <div>
                    <h5 className="font-bold text-sm text-[var(--auth-ink)]">{req.senderName}</h5>
                    <span className="text-[10px] font-mono text-[var(--auth-ink-soft)] block">
                      ID: {req.senderId}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onAccept(req.id)}
                    className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs px-3.5 py-1.5 rounded-xl transition font-mono uppercase shadow-xs"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => onDecline(req.id)}
                    className="bg-[var(--auth-field)] hover:bg-rose-500/15 text-[var(--auth-ink-soft)] hover:text-rose-500 text-xs px-3 py-1.5 rounded-xl border border-[var(--auth-field-edge)] transition"
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
        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--auth-ink-soft)]">
          Pending Sent Requests ({outgoing.length})
        </h4>
        {outgoing.length === 0 ? (
          <div className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-2xl p-4 text-center text-[var(--auth-ink-soft)] text-xs font-mono">
            No pending outgoing requests.
          </div>
        ) : (
          <div className="space-y-2">
            {outgoing.map((req) => (
              <div
                key={req.id}
                className="bg-[var(--auth-card)] border border-[var(--auth-card-edge)] rounded-xl p-3.5 flex items-center justify-between text-xs font-mono"
              >
                <span className="text-[var(--auth-ink)]">Invite sent to ID: <strong>{req.recipientId}</strong></span>
                <span className="text-[10px] text-amber-500 font-bold bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
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
