import { useEffect, useState, useCallback, useRef } from "react";
import { Flame, Zap, Volume2 } from "lucide-react";
import { getSocket } from "../../lib/socket";
import type { ReactionRecvPayload, SoundboardRecvPayload, Player } from "@shared/types";
import { audioKeyForClip } from "../../lib/soundboard";
import { AudioManager } from "../../services/AudioManager";
import { SOUNDBOARD_CLIPS } from "@shared/soundboard";

interface ActiveReaction {
  id: string;
  emoji: string;
  fromName: string;
  isThrowable: boolean;
  xStartPercent: number;
  yEndPercent: number;
  splatText?: string;
  splatColor?: string;
  createdAt: number;
}

const THROWABLE_MAP: Record<string, { splatText: string; splatColor: string }> = {
  "🍅": { splatText: "SPLAT!", splatColor: "#ef4444" },
  "🩴": { splatText: "WHACK!", splatColor: "#f59e0b" },
  "🧨": { splatText: "BOOM!", splatColor: "#f97316" },
  "🎯": { splatText: "BULLSEYE!", splatColor: "#06b6d4" },
  "💩": { splatText: "PLOP!", splatColor: "#854d0e" },
};

interface TvCrowdReactionsProps {
  players: Player[];
  onTriggerShake?: (level: "subtle" | "intense") => void;
}

export function TvCrowdReactions({ players, onTriggerShake }: TvCrowdReactionsProps) {
  const [reactions, setReactions] = useState<ActiveReaction[]>([]);
  const [hypeStreak, setHypeStreak] = useState(0);
  const recentTimestampsRef = useRef<number[]>([]);

  const handleReaction = useCallback(
    (payload: ReactionRecvPayload) => {
      const now = Date.now();

      // Update hype streak (reactions in last 4 seconds)
      recentTimestampsRef.current = [...recentTimestampsRef.current.filter((t) => now - t < 4000), now];
      const count = recentTimestampsRef.current.length;
      setHypeStreak(count >= 3 ? count : 0);

      const sender = players.find((p) => p.id === payload.fromPlayerId);
      const senderName = sender?.name ?? "Audience";

      const throwableInfo = THROWABLE_MAP[payload.emoji];
      const isThrowable = Boolean(throwableInfo);

      // Random horizontal trajectory
      const xStart = 15 + Math.random() * 70;
      const yEnd = 20 + Math.random() * 50;

      const item: ActiveReaction = {
        id: `${payload.id}-${now}-${Math.random()}`,
        emoji: payload.emoji,
        fromName: senderName,
        isThrowable,
        xStartPercent: xStart,
        yEndPercent: yEnd,
        splatText: throwableInfo?.splatText,
        splatColor: throwableInfo?.splatColor,
        createdAt: now,
      };

      setReactions((prev) => [...prev.slice(-15), item]);

      // If heavy throwable, trigger subtle screen shake
      if (isThrowable && onTriggerShake) {
        onTriggerShake("subtle");
      }
    },
    [players, onTriggerShake]
  );

  const handleSoundboard = useCallback(
    (payload: SoundboardRecvPayload) => {
      const audioKey = audioKeyForClip(payload.clipId);
      if (audioKey) {
        try {
          AudioManager.getInstance().play(audioKey);
        } catch {
          // Ignored if sound not supported
        }
      }

      const clipObj = SOUNDBOARD_CLIPS.find((c) => c.id === payload.clipId);
      const sender = players.find((p) => p.id === payload.fromPlayerId);
      const senderName = sender?.name ?? "Audience";

      const now = Date.now();
      const item: ActiveReaction = {
        id: `sb-${payload.id}-${now}-${Math.random()}`,
        emoji: clipObj?.glyph ?? "📣",
        fromName: `${senderName}: ${clipObj?.label ?? "Sound"}`,
        isThrowable: false,
        xStartPercent: 30 + Math.random() * 40,
        yEndPercent: 35,
        createdAt: now,
      };

      setReactions((prev) => [...prev.slice(-15), item]);

      if (payload.clipId === "airhorn" || payload.clipId === "dhol") {
        onTriggerShake?.("intense");
      } else {
        onTriggerShake?.("subtle");
      }
    },
    [players, onTriggerShake]
  );

  useEffect(() => {
    const socket = getSocket();
    socket.on("room:reaction", handleReaction);
    socket.on("room:sound", handleSoundboard);

    return () => {
      socket.off("room:reaction", handleReaction);
      socket.off("room:sound", handleSoundboard);
    };
  }, [handleReaction, handleSoundboard]);

  // Garbage collection of completed reaction animations
  useEffect(() => {
    const interval = setInterval(() => {
      const cutoff = Date.now() - 3200;
      setReactions((prev) => (prev.some((r) => r.createdAt < cutoff) ? prev.filter((r) => r.createdAt >= cutoff) : prev));

      // Reset hype streak if quiet
      if (recentTimestampsRef.current.length > 0) {
        const active = recentTimestampsRef.current.filter((t) => Date.now() - t < 4000);
        recentTimestampsRef.current = active;
        if (active.length < 3) {
          setHypeStreak(0);
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      {/* Dynamic Hype Streak Marquee Banner */}
      {hypeStreak >= 3 && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center gap-2.5 px-6 py-2 rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 text-stone-950 font-black text-sm uppercase tracking-widest shadow-[0_0_30px_rgba(245,158,11,0.8)] border border-amber-300 animate-bounce">
          <Flame className="w-5 h-5 text-amber-950 fill-amber-950 animate-pulse" />
          <span>STADIUM HYPE OVERLOAD x{hypeStreak}!</span>
          <Zap className="w-5 h-5 text-amber-950 fill-amber-950 animate-pulse" />
        </div>
      )}

      {/* Floating Reactions & Throwables */}
      {reactions.map((r) => {
        if (r.isThrowable) {
          return (
            <div
              key={r.id}
              className="absolute transition-all duration-700 ease-out flex flex-col items-center"
              style={{
                left: `${r.xStartPercent}%`,
                top: `${r.yEndPercent}%`,
                animation: "throwable-arc 1.2s cubic-bezier(0.25, 1, 0.5, 1) forwards",
              }}
            >
              <span className="text-5xl sm:text-6xl filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] animate-spin">
                {r.emoji}
              </span>
              <div
                className="mt-1 px-3 py-1 rounded-full text-xs font-black tracking-wider text-white shadow-lg animate-ping"
                style={{ backgroundColor: r.splatColor ?? "#ef4444" }}
              >
                {r.splatText}
              </div>
              <span className="text-[10px] font-mono font-bold text-amber-200/90 bg-black/60 px-2 py-0.5 rounded-full mt-1">
                from {r.fromName}
              </span>
            </div>
          );
        }

        return (
          <div
            key={r.id}
            className="absolute bottom-16 flex flex-col items-center gap-1 transition-all duration-1000 ease-out"
            style={{
              left: `${r.xStartPercent}%`,
              animation: "float-reaction-up 2.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            }}
          >
            <div className="text-4xl sm:text-5xl filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] transform hover:scale-125 transition-transform">
              {r.emoji}
            </div>
            <div className="px-2 py-0.5 rounded-full bg-black/70 border border-amber-500/30 text-[10px] font-bold text-amber-100/90 whitespace-nowrap shadow-md">
              {r.fromName}
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes float-reaction-up {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.6);
          }
          15% {
            opacity: 1;
            transform: translateY(0) scale(1.1);
          }
          80% {
            opacity: 0.9;
            transform: translateY(-220px) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-300px) scale(0.8);
          }
        }
        @keyframes throwable-arc {
          0% {
            opacity: 0;
            transform: translateY(180px) scale(0.4) rotate(0deg);
          }
          40% {
            opacity: 1;
            transform: translateY(-40px) scale(1.3) rotate(180deg);
          }
          85% {
            opacity: 1;
            transform: translateY(0) scale(1) rotate(360deg);
          }
          100% {
            opacity: 0;
            transform: translateY(10px) scale(0.9) rotate(380deg);
          }
        }
      `}</style>
    </div>
  );
}
