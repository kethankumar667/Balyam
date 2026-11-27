import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useGangStore } from "../../store/gangStore";

/**
 * Leave a Gang's page when the Gang stops existing.
 *
 * When the owner deletes a group, everyone reading it is told over the socket
 * and the store forgets it. What is left on screen is a chat of a group that is
 * gone, so the page hands them back to the list — with `replace`, so Back does
 * not return to it.
 *
 * It acts only when a Gang WAS open and now is not. `activeGang` is null
 * before the first load finishes, and that must not read as "deleted"; moving
 * from one Gang to another never passes through null.
 */
export function useLeaveWhenGangGone(): void {
  const openGangId = useGangStore((s) => s.activeGang?.id ?? null);
  const navigate = useNavigate();
  const hadOne = useRef(false);

  useEffect(() => {
    if (openGangId !== null) {
      hadOne.current = true;
      return;
    }
    if (!hadOne.current) return;
    hadOne.current = false;
    navigate("/gang", { replace: true });
  }, [openGangId, navigate]);
}
