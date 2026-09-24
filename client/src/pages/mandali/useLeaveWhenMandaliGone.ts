import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMandaliStore } from "../../store/mandaliStore";

/**
 * Leave a Mandali's page when the Mandali stops existing.
 *
 * When the owner deletes a group, everyone reading it is told over the socket
 * and the store forgets it. What is left on screen is a chat of a group that is
 * gone, so the page hands them back to the list — with `replace`, so Back does
 * not return to it.
 *
 * It acts only when a Mandali WAS open and now is not. `activeMandali` is null
 * before the first load finishes, and that must not read as "deleted"; moving
 * from one Mandali to another never passes through null.
 */
export function useLeaveWhenMandaliGone(): void {
  const openMandaliId = useMandaliStore((s) => s.activeMandali?.id ?? null);
  const navigate = useNavigate();
  const hadOne = useRef(false);

  useEffect(() => {
    if (openMandaliId !== null) {
      hadOne.current = true;
      return;
    }
    if (!hadOne.current) return;
    hadOne.current = false;
    navigate("/mandali", { replace: true });
  }, [openMandaliId, navigate]);
}
