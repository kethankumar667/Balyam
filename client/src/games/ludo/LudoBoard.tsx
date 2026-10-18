import { useEffect, useState } from "react";
import LudoBoardMobile from "./LudoBoardMobile";
import LudoBoardDesktop from "./LudoBoardDesktop";
import type { LudoBoardProps } from "./useLudoBoard";
import { drawnWorld } from "../../lib/worlds/worldArt";
import { setLudoSoundWorld } from "./sound";

/** Desktop gate copied from RummyBoard: real desktop only (rules out phone
 *  landscape ≤1133px). Do NOT widen. Mobile shell handles every smaller tier
 *  incl. tablets. */
function isDesktopLayout(): boolean {
  if (typeof window === "undefined") return false;
  if (window.innerWidth < 1280 || window.innerHeight < 720) return false;
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export default function LudoBoard(props: LudoBoardProps) {
  const [isDesktop, setIsDesktop] = useState<boolean>(() => isDesktopLayout());
  // The table's world decides what the cues sound like; leaving the table puts the classic voice back.
  const soundWorld = drawnWorld("ludo", props.world);
  useEffect(() => {
    setLudoSoundWorld(soundWorld);
    return () => setLudoSoundWorld("classic");
  }, [soundWorld]);
  useEffect(() => {
    const onResize = () => setIsDesktop(isDesktopLayout());
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);
  return isDesktop ? <LudoBoardDesktop {...props} /> : <LudoBoardMobile {...props} />;
}
