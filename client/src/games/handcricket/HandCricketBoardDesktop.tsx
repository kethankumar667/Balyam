import InlineRoomRail from "../../components/InlineRoomRail";
import { MatchHeader, HcPhaseBody, HcCelebrationLayer, type HandCricketBoardProps } from "./hc-shared";

/**
 * Hand Cricket — desktop shell.
 *
 * Two-column: the match header spans full width, then the active phase body
 * sits in the main column while the room rail (players/voice/chat) becomes a
 * persistent sticky side panel instead of the inline strip mobile uses. The
 * phase components themselves are identical to the mobile shell (shared,
 * Tailwind-responsive) — only the surrounding arrangement differs, using the
 * extra width deliberately rather than stretching the phone layout.
 */
export default function HandCricketBoardDesktop({
  state,
  players,
  selfId,
  messages,
  roomCode,
  roomPhase,
}: HandCricketBoardProps) {
  // selfId is guaranteed non-null by the picker's guard.
  const sid = selfId as string;
  return (
    <div
      className="rounded-2xl p-4 lg:p-5 space-y-4"
      style={{
        background: "radial-gradient(ellipse at 50% 30%, #14532d 0%, #052e16 80%)",
        border: "2px solid #166534",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      <MatchHeader state={state} players={players} selfId={sid} />

      <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
        <div className="min-w-0 space-y-4">
          <HcPhaseBody state={state} selfId={sid} players={players} />
        </div>

        <aside className="lg:sticky lg:top-4">
          <InlineRoomRail
            code={roomCode}
            game="handcricket"
            phase={roomPhase}
            players={players}
            selfId={sid}
            messages={messages}
          />
        </aside>
      </div>

      <HcCelebrationLayer state={state} players={players} selfId={sid} />
    </div>
  );
}
