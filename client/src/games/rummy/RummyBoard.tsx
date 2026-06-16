import type {
  ChatMessage,
  Player,
  RummyPlayerState,
} from "@shared/types";
import RummyBoardMobile from "./RummyBoardMobile";

/**
 * Rummy table entry point.
 *
 * Always renders the mobile layout — regardless of viewport size, regardless
 * of orientation, regardless of device type. There is intentionally NO
 * viewport check here.
 *
 * Why this is unconditional:
 *   - The product call is that Rummy is played on phones, and phones in
 *     landscape (the natural orientation for cards) report widths well above
 *     the 768px "desktop" breakpoint (iPhone 14 Pro Max landscape = 932px).
 *     Any width-based router will show the desktop UI to a player who is
 *     actively trying to play on their phone.
 *   - There is no separate desktop board planned; the mobile layout works at
 *     every width up to ~1080px and beyond. Keeping a viewport router around
 *     "just in case" only reopens the bug above.
 *
 * Bulletproof rule: do NOT introduce `useViewport`, `matchMedia`, orientation
 * detection, or `window.innerWidth` checks in this file. If a future desktop
 * variant is built, route to it from a NEW entry point so the mobile path
 * stays the safe default.
 */
export default function RummyBoard(props: {
  state: RummyPlayerState;
  players: Player[];
  selfId: string | null;
  messages?: ChatMessage[];
  roomCode?: string;
  onLeave?: () => void;
}) {
  return <RummyBoardMobile {...props} />;
}
