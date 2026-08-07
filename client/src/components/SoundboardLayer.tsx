import { useEffect, useState } from "react";
import type { Player, SoundboardRecvPayload } from "@shared/types";
import { soundClipById } from "@shared/soundboard";
import { getSocket } from "../lib/socket";
import { audioKeyForClip } from "../lib/soundboard";
import { useAudio } from "../hooks/useAudio";

/**
 * Plays incoming soundboard clips and shows who sent them.
 *
 * Mounted once, high in <Room>, for the same reason the voice session lives
 * outside the React tree: a clip must land whether or not the sender's panel
 * happens to be open on the receiver's screen.
 *
 * The banner is not decoration. A sound with no visible attribution is the
 * anonymous-airhorn problem — nobody knows who did it, so nobody moderates
 * it socially and the only remaining lever is the rate limiter. Naming the
 * sender is the cheapest and most effective control here.
 */

interface Banner {
  id: string;
  fromName: string;
  targetName: string | null;
  label: string;
  glyph: string;
  self: boolean;
}

/** How long a banner stays up. Long enough to read, short enough to stack. */
const BANNER_MS = 2200;

export default function SoundboardLayer({
  players,
  selfId,
}: {
  players: Player[];
  selfId: string | null;
}) {
  const { play } = useAudio();
  const [banners, setBanners] = useState<Banner[]>([]);

  useEffect(() => {
    const socket = getSocket();

    function onSound(payload: SoundboardRecvPayload) {
      const clip = soundClipById(payload.clipId);
      // An id this client does not know about — an older build, or a clip
      // added after this tab loaded. Ignore rather than render a blank chip.
      if (!clip) return;

      const key = audioKeyForClip(payload.clipId);
      // A clip with no audio key (or no file in the active theme) still shows
      // its banner; it degrades to a visual reaction rather than vanishing.
      if (key) play(key);

      const from = players.find((p) => p.id === payload.fromPlayerId);
      const target = payload.targetPlayerId
        ? players.find((p) => p.id === payload.targetPlayerId)
        : undefined;

      const banner: Banner = {
        id: payload.id,
        fromName: from?.name ?? "Someone",
        targetName: target?.name ?? null,
        label: clip.label,
        glyph: clip.glyph,
        self: payload.fromPlayerId === selfId,
      };
      setBanners((cur) => [...cur.slice(-3), banner]);
      window.setTimeout(() => {
        setBanners((cur) => cur.filter((b) => b.id !== banner.id));
      }, BANNER_MS);
    }

    socket.on("room:sound", onSound);
    return () => {
      socket.off("room:sound", onSound);
    };
    // `players` is in the dep list so the banner can name a player who joined
    // after this effect first ran. Re-subscribing is cheap.
  }, [players, selfId, play]);

  if (banners.length === 0) return null;

  return (
    <div
      // Announcements, not controls — never steal a tap from the board.
      className="fixed left-1/2 -translate-x-1/2 top-3 z-[65] flex flex-col items-center gap-1.5 pointer-events-none"
      aria-live="polite"
    >
      {banners.map((b) => (
        <div
          key={b.id}
          className="flex items-center gap-2 rounded-full px-3 py-1.5 shadow-lg animate-[sbDrop_220ms_ease-out]"
          style={{
            background: b.self ? "rgba(49,161,87,0.92)" : "rgba(43,33,24,0.92)",
            border: "1px solid rgba(230,212,183,0.35)",
            color: "#FFF3E3",
          }}
        >
          <span aria-hidden className="text-base leading-none">
            {b.glyph}
          </span>
          <span className="text-xs font-semibold whitespace-nowrap">
            {b.self ? "You" : b.fromName} played {b.label}
            {b.targetName ? ` at ${b.targetName}` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}
