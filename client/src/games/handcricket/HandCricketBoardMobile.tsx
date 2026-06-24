import InlineRoomRail from "../../components/InlineRoomRail";
import { MatchHeader, HcPhaseBody, HcCelebrationLayer, type HandCricketBoardProps } from "./hc-shared";
import GameTutorial, { useTutorialGate, TutorialButton } from "../../components/GameTutorial";
import { HANDCRICKET_TUTORIAL } from "../tutorials";

/**
 * Hand Cricket — mobile shell.
 *
 * Single column, touch-first: match header → room rail (inline) → the
 * active phase body → full-screen celebration overlay. Every phase
 * component (team/squad pickers, innings, scorecards) already carries its
 * own Tailwind `sm:`/`lg:` density and needs no further layout work here —
 * the shell's job is just the surrounding arrangement.
 */
export default function HandCricketBoardMobile({
  state,
  players,
  selfId,
  messages,
  roomCode,
  roomPhase,
}: HandCricketBoardProps) {
  // selfId is guaranteed non-null by the picker's guard.
  const sid = selfId as string;
  const tut = useTutorialGate(HANDCRICKET_TUTORIAL.key);
  return (
    <div
      className="rounded-2xl p-3 sm:p-4 space-y-3"
      style={{
        background: "radial-gradient(ellipse at 50% 30%, #14532d 0%, #052e16 80%)",
        border: "2px solid #166534",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <MatchHeader state={state} players={players} selfId={sid} />
        </div>
        <TutorialButton onClick={() => tut.setOpen(true)} />
      </div>

      <InlineRoomRail
        code={roomCode}
        game="handcricket"
        phase={roomPhase}
        players={players}
        selfId={sid}
        messages={messages}
      />

      <HcPhaseBody state={state} selfId={sid} players={players} />

      <HcCelebrationLayer state={state} players={players} selfId={sid} />

      {tut.open && (
        <GameTutorial
          slides={HANDCRICKET_TUTORIAL.slides}
          storageKey={HANDCRICKET_TUTORIAL.key}
          accent={HANDCRICKET_TUTORIAL.accent}
          onClose={() => tut.setOpen(false)}
        />
      )}
    </div>
  );
}
