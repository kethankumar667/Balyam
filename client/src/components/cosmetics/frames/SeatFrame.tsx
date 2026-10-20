import { useRoomStore } from "../../../store/roomStore";
import AvatarFrameOverlay from "./AvatarFrameOverlay";
import { isFrameId } from "./frameDesigns";

/**
 * The animated frame the player in a seat wears, found by player id in the live room state.
 *
 * A game board knows who sits where but draws the face itself, often with its own markup, so it cannot hand
 * `SeatAvatar` an aura. This is the lookup they share. It returns only a drawn frame (never a legacy ring or
 * "none"), and what it reads, `cosmetics.avatarAura`, is what the server has already filtered down to the
 * items that player owns.
 */
export function useSeatFrame(playerId: string | undefined): string | undefined {
  return useRoomStore((state) => {
    if (!playerId) return undefined;
    const aura = state.roomState?.players.find((player) => player.id === playerId)?.cosmetics?.avatarAura;
    return isFrameId(aura) ? aura : undefined;
  });
}

/**
 * The seat's frame as an overlay, for a bespoke avatar. Place it inside the box that is exactly the avatar's
 * size and `position: relative` (the overlay fills 124% of that box, centred on it), and give the box room:
 * the frame reaches 12% past the avatar on every side, so a parent that clips will clip it.
 */
export default function SeatFrame({ playerId }: { playerId: string | undefined }) {
  const frame = useSeatFrame(playerId);
  return frame ? <AvatarFrameOverlay frameId={frame} /> : null;
}
