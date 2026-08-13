import { useEffect, useState } from "react";
import BlockBlastBoardMobile, { type BlockBlastBoardProps } from "./BlockBlastBoardMobile";
import BlockBlastBoardDesktop from "./BlockBlastBoardDesktop";

/**
 * Layout gate — the same test every other board in this app uses.
 *
 * `pointer: fine` matters more here than anywhere else: this game is a drag,
 * and the phone layout exists specifically to keep the board and the tray
 * inside one thumb's reach. A large touchscreen should get the phone layout,
 * not the desktop one, however wide it is.
 */
function isDesktopLayout(): boolean {
  if (typeof window === "undefined") return false;
  if (window.innerWidth < 1024 || window.innerHeight < 650) return false;
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export default function BlockBlastBoard(props: BlockBlastBoardProps) {
  const [isDesktop, setIsDesktop] = useState<boolean>(() => isDesktopLayout());

  useEffect(() => {
    const onResize = () => setIsDesktop(isDesktopLayout());
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  return isDesktop ? <BlockBlastBoardDesktop {...props} /> : <BlockBlastBoardMobile {...props} />;
}
