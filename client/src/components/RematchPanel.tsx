import React, { useEffect, useState } from "react";
import { getSocket } from "../lib/socket";
import { useRoomStore } from "../store/roomStore";
import type { Player } from "@shared/types";
import { HapticsManager } from "../services/HapticsManager";

export interface RematchPanelProps {
  players: Player[];
  selfId: string | null;
  className?: string;
}

export default function RematchPanel({
  players,
  selfId,
  className = "",
}: RematchPanelProps) {
  const rematch = useRoomStore((s) => s.rematch);
  const roomState = useRoomStore((s) => s.roomState);

  const isHost = roomState?.hostId === selfId;
  const myResponse = selfId ? rematch.responses[selfId] : undefined;

  function requestRematch() {
    HapticsManager.getInstance().subtle();
    getSocket().emit("rematch:request");
  }

  function accept() {
    HapticsManager.getInstance().subtle();
    getSocket().emit("rematch:respond", "accept");
  }

  function decline() {
    HapticsManager.getInstance().subtle();
    getSocket().emit("rematch:respond", "decline");
  }

  // ─── Accepted: 3D countdown ───
  if (rematch.status === "accepted" && rematch.startsAt) {
    return <CountdownBox startsAt={rematch.startsAt} className={className} />;
  }

  // ─── Declined: 3D badge ───
  if (rematch.status === "declined") {
    const decliner = players.find((p) => p.id === rematch.declinedBy);
    return (
      <div
        role="status"
        className={`rounded-2xl border-t border-x border-rose-300 dark:border-rose-800/60 border-b-[4px] border-rose-500/80 bg-gradient-to-b from-rose-50 to-rose-100 dark:from-rose-950/40 dark:to-[#1A0B10] text-rose-800 dark:text-rose-200 px-4 py-3 text-xs sm:text-sm font-bold text-center shadow-[0_4px_12px_rgba(244,63,94,0.15)] ${className}`}
      >
        {decliner
          ? `${decliner.name} declined the rematch.`
          : "Rematch request expired."}
      </div>
    );
  }

  // ─── Pending: depends on role + own response ───
  if (rematch.status === "pending") {
    const responses = Object.values(rematch.responses);
    const acceptedCount = responses.filter((r) => r === "accept").length;
    const totalCount = responses.length;

    if (isHost || myResponse === "accept") {
      return (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-2xl border-t border-x border-amber-300 dark:border-amber-500/40 border-b-[4px] border-amber-600/80 bg-gradient-to-b from-amber-50 to-amber-100/90 dark:from-[#1E2738] dark:to-[#131B2A] p-4 text-center space-y-3 shadow-[0_6px_16px_rgba(217,119,6,0.15)] ${className}`}
        >
          <div className="text-amber-950 dark:text-amber-200 font-extrabold text-sm flex items-center justify-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            <span>Waiting for players…</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 font-mono text-xs text-amber-800 dark:text-amber-300 font-black">
              {acceptedCount}/{totalCount}
            </span>
          </div>
          <PendingResponseAvatars players={players} rematch={rematch} />
          <button
            type="button"
            onClick={decline}
            className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer min-h-[32px] inline-flex items-center justify-center"
          >
            Cancel rematch
          </button>
        </div>
      );
    }

    // Non-host who hasn't responded yet → 3D prompt
    return (
      <div
        role="status"
        aria-live="polite"
        className={`rounded-2xl border-t border-x border-amber-300 dark:border-amber-500/40 border-b-[4px] border-amber-600/80 bg-gradient-to-b from-amber-50 to-amber-100/90 dark:from-[#1E2738] dark:to-[#131B2A] p-4 space-y-3 shadow-[0_6px_16px_rgba(217,119,6,0.2)] ${className}`}
      >
        <div className="text-amber-950 dark:text-amber-200 font-extrabold text-sm text-center">
          Host requested a rematch! Are you ready?
        </div>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={accept}
            className="flex-1 min-h-[44px] rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 border-t border-emerald-300/60 border-b-[4px] border-emerald-800 hover:brightness-105 active:border-b-[1px] active:translate-y-[3px] text-white font-black text-xs sm:text-sm uppercase tracking-wider cursor-pointer transition-all shadow-[0_4px_12px_rgba(16,185,129,0.3)] flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            ✓ Accept
          </button>
          <button
            type="button"
            onClick={decline}
            className="flex-1 min-h-[44px] rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 border-t border-rose-300/60 border-b-[4px] border-rose-800 hover:brightness-105 active:border-b-[1px] active:translate-y-[3px] text-white font-black text-xs sm:text-sm uppercase tracking-wider cursor-pointer transition-all shadow-[0_4px_12px_rgba(244,63,94,0.3)] flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            ✕ Decline
          </button>
        </div>
      </div>
    );
  }

  // ─── Idle: host can kick off; non-host sees subtle waiting ───
  if (isHost) {
    return (
      <button
        type="button"
        onClick={requestRematch}
        className={`w-full inline-flex items-center justify-center gap-2 min-h-[48px] rounded-xl font-black text-sm uppercase tracking-wider text-white bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 border-t border-amber-300/60 border-b-[4px] border-[#9A3412] hover:brightness-105 active:border-b-[1px] active:translate-y-[3px] shadow-[0_6px_16px_rgba(217,119,6,0.35)] transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${className}`}
      >
        <RepeatIcon className="w-5 h-5" />
        <span>Play Rematch</span>
      </button>
    );
  }

  // Non-host idle → wait silently for host to act
  return (
    <div className={`text-center text-xs sm:text-sm text-[#6E5E4D] dark:text-slate-400 italic py-1.5 ${className}`}>
      Waiting for host to start another round…
    </div>
  );
}

function CountdownBox({
  startsAt,
  className = "",
}: {
  startsAt: number;
  className?: string;
}) {
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, startsAt - Date.now())
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      setRemainingMs(Math.max(0, startsAt - Date.now()));
    }, 100);
    return () => window.clearInterval(id);
  }, [startsAt]);

  const seconds = Math.ceil(remainingMs / 1000);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-2xl border-t border-x border-emerald-300 dark:border-emerald-700/60 border-b-[4px] border-emerald-600 bg-gradient-to-b from-emerald-50 to-emerald-100 dark:from-emerald-950/40 dark:to-[#0B1A12] px-4 py-3.5 text-emerald-950 dark:text-emerald-100 font-extrabold text-center text-sm shadow-[0_4px_16px_rgba(16,185,129,0.2)] flex items-center justify-center gap-2 ${className}`}
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
      </span>
      <span>Next match starts in</span>
      <span className="px-2.5 py-0.5 rounded-lg bg-emerald-600 text-white font-mono font-black text-base shadow-xs">
        {seconds}s
      </span>
    </div>
  );
}

function PendingResponseAvatars({
  players,
  rematch,
}: {
  players: Player[];
  rematch: { responses: Record<string, "pending" | "accept" | "decline"> };
}) {
  const entries = players.filter((p) => rematch.responses[p.id] !== undefined);
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {entries.map((p) => {
        const r = rematch.responses[p.id];
        const dot =
          r === "accept"
            ? "bg-emerald-500"
            : r === "decline"
            ? "bg-rose-500"
            : "bg-amber-400 animate-pulse";
        return (
          <span
            key={p.id}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/90 dark:bg-slate-800 border border-amber-300/80 dark:border-amber-700 px-2.5 py-1 text-xs font-bold text-amber-900 dark:text-amber-200 shadow-xs"
            title={`${p.name} — ${r}`}
          >
            <span className={`w-2 h-2 rounded-full ${dot}`} aria-hidden="true" />
            <span>{p.name}</span>
            <span className="sr-only">({r})</span>
          </span>
        );
      })}
    </div>
  );
}

function RepeatIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m17 2 4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="m7 22-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </svg>
  );
}
