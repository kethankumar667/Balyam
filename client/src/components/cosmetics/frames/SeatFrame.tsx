import { useRoomStore } from "../../../store/roomStore";
import AvatarFrameOverlay, { hasAvatarFrameArtwork } from "./AvatarFrameOverlay";
import { usePublicAvatarAura } from "../../../lib/publicAvatarAura";
import { getAvatarAuraConfig } from "../../../lib/cosmeticsResolver";
import { useAuthStore } from "../../../store/authStore";
import { useCosmeticsStore } from "../../../store/cosmeticsStore";
import { peekPlayerCredential } from "../../../lib/playerIdentity";
import { createContext, useContext } from "react";
import type { Player } from "@shared/types";

/** Spectator screens own public room state locally, independently of the viewer's seated room. */
export const AvatarPlayersContext = createContext<readonly Player[] | undefined>(undefined);

/**
 * Resolve by owner, never by face or display name. Room seats (including bots/local seats) use
 * server-filtered live state; outside rooms only the public equipped decoration is requested.
 */
export function useSeatFrame(playerId: string | undefined): string | undefined {
  const contextualSeat = useContext(AvatarPlayersContext)?.find(player => player.id === playerId);
  const roomSeat = useRoomStore(state => state.roomState?.players.find(player => player.id === playerId)
    ?? state.roomState?.lastMatchPlayers?.find(player => player.id === playerId));
  const seat = contextualSeat ?? roomSeat;
  const memberId = useAuthStore(state => state.userId);
  const selfId = memberId ?? peekPlayerCredential()?.playerId;
  const selfAura = useCosmeticsStore(state => state.resolved.avatarAura);
  const isSelf = !!playerId && playerId === selfId;
  const publicAura = usePublicAvatarAura(playerId && !seat && !isSelf ? playerId : undefined);
  return seat ? seat.cosmetics?.avatarAura : isSelf ? selfAura : publicAura;
}

/**
 * The seat's frame as an overlay, for a bespoke avatar. Place it inside the box that is exactly the avatar's
 * size and `position: relative` (the overlay fills 124% of that box, centred on it), and give the box room:
 * the frame reaches 12% past the avatar on every side, so a parent that clips will clip it.
 */
export default function SeatFrame({ playerId }: { playerId: string | undefined }) {
  const frame = useSeatFrame(playerId);
  const legacy = getAvatarAuraConfig(frame);
  if (hasAvatarFrameArtwork(frame) && frame) return <AvatarFrameOverlay frameId={frame} />;
  return legacy?.className ? <span aria-hidden="true" className={`absolute -inset-1 rounded-full border-2 border-dashed pointer-events-none z-10 ${legacy.className}`} /> : null;
}
