import GameTutorial, { useTutorialGate, TutorialButton } from "../../components/GameTutorial";
import { HANDCRICKET_TUTORIAL } from "../tutorials";
import {
  HcCelebrationLayer,
  TeamSelectPhase,
  TossPhase,
  TossChoicePhase,
  InningsPhase,
  MatchSummary,
  type HandCricketBoardProps,
} from "./hc-shared";
import {
  HcNotebookPage,
  HcNotebookHeader,
  HcCountryPickerNotebook,
  HcFranchisePickerNotebook,
  HcPhaseCard,
} from "./hc-notebook";

/**
 * Hand Cricket — desktop notebook shell.
 *
 * Two-panel layout that matches the reference screenshot:
 *
 *  • teamSelect  — full-width parchment country/franchise picker.
 *  • All other phases — left column holds the active phase content (toss,
 *    innings, summary); right column keeps the room rail and a match
 *    status strip. This reuses the right-panel visual the reference shows
 *    during the XI selection phase.
 *
 * The header ("HAND CRICKET" + format pills + matchup chips + room rail)
 * spans full width at the top of every phase.
 */
export default function HandCricketBoardDesktop({
  state,
  players,
  selfId,
  messages,
  roomCode,
  roomPhase,
}: HandCricketBoardProps) {
  const sid = selfId as string;
  const tut = useTutorialGate(HANDCRICKET_TUTORIAL.key);

  const isTeamSelect = state.phase === "teamSelect";
  const isIpl = state.options.category === "ipl";

  return (
    <HcNotebookPage>
      {/* ── Full-width header ── */}
      <HcNotebookHeader
        state={state}
        players={players}
        selfId={sid}
        roomCode={roomCode}
        roomPhase={roomPhase}
        messages={messages}
        onHelp={() => tut.setOpen(true)}
      />

      {/* ── Phase content ── */}
      {isTeamSelect ? (
        /* Country/franchise picker — full width */
        isIpl ? (
          <HcFranchisePickerNotebook state={state} selfId={sid} players={players} />
        ) : (
          <HcCountryPickerNotebook state={state} selfId={sid} players={players} />
        )
      ) : (
        /* Two-column: content left, info right */
        <div
          className="grid gap-5 px-5 pb-6 pt-2"
          style={{ gridTemplateColumns: "minmax(0,1.65fr) minmax(280px,1fr)" }}
        >
          {/* Left column — active phase body */}
          <div className="space-y-4 min-w-0">
            {(state.phase === "toss") && (
              <HcPhaseCard>
                <TossPhase state={state} selfId={sid} players={players} />
              </HcPhaseCard>
            )}
            {state.phase === "tossChoice" && (
              <HcPhaseCard>
                <TossChoicePhase state={state} selfId={sid} players={players} />
              </HcPhaseCard>
            )}
            {(state.phase === "innings1" || state.phase === "innings2") && (
              <HcPhaseCard>
                <InningsPhase state={state} selfId={sid} players={players} />
              </HcPhaseCard>
            )}
            {state.phase === "finished" && (
              <HcPhaseCard>
                <MatchSummary state={state} players={players} selfId={sid} />
              </HcPhaseCard>
            )}
          </div>

          {/* Right column — cricket doodles placeholder (InlineRoomRail
              is already embedded in the header; this keeps visual balance). */}
          <aside className="hidden lg:flex flex-col items-center justify-end gap-3 pointer-events-none select-none pb-4" aria-hidden>
            <RightPanelDoodles />
          </aside>
        </div>
      )}

      <HcCelebrationLayer state={state} players={players} selfId={sid} />

      {tut.open && (
        <GameTutorial
          slides={HANDCRICKET_TUTORIAL.slides}
          storageKey={HANDCRICKET_TUTORIAL.key}
          accent={HANDCRICKET_TUTORIAL.accent}
          onClose={() => tut.setOpen(false)}
        />
      )}
    </HcNotebookPage>
  );
}

/** Cricket-themed sketch doodles for the right panel (matches reference). */
function RightPanelDoodles() {
  return (
    <svg
      viewBox="0 0 200 280"
      width={200}
      height={280}
      fill="none"
      aria-hidden
      style={{ opacity: 0.20 }}
    >
      {/* Trophy */}
      <path
        d="M76 200 Q76 216 100 216 Q124 216 124 200"
        stroke="#1a2952" strokeWidth={2.5} strokeLinejoin="round"
      />
      <path
        d="M76 136 Q62 136 62 156 Q62 176 78 178 Q78 188 76 200 L124 200 Q122 188 122 178 Q138 176 138 156 Q138 136 124 136 Z"
        stroke="#1a2952" strokeWidth={2.5} strokeLinejoin="round"
      />
      <line x1={90} y1={216} x2={90} y2={230} stroke="#1a2952" strokeWidth={2} strokeLinecap="round" />
      <line x1={110} y1={216} x2={110} y2={230} stroke="#1a2952" strokeWidth={2} strokeLinecap="round" />
      <line x1={82} y1={230} x2={118} y2={230} stroke="#1a2952" strokeWidth={2} strokeLinecap="round" />

      {/* Cricket ball */}
      <circle cx={162} cy={52} r={24} stroke="#c0392b" strokeWidth={2.5} />
      <path d="M144 40 Q148 52 144 64" stroke="#c0392b" strokeWidth={2} fill="none" strokeLinecap="round" />
      <path d="M180 40 Q176 52 180 64" stroke="#c0392b" strokeWidth={2} fill="none" strokeLinecap="round" />

      {/* Stumps + bat */}
      {[28, 44, 60].map((x, i) => (
        <g key={i}>
          <line x1={x} y1={30} x2={x} y2={90} stroke="#1a2952" strokeWidth={3} strokeLinecap="round" />
          <rect x={x - 3} y={28} width={6} height={5} rx={1} fill="#1a2952" />
        </g>
      ))}
      <line x1={27} y1={38} x2={45} y2={38} stroke="#1a2952" strokeWidth={2.5} strokeLinecap="round" />
      <line x1={43} y1={38} x2={61} y2={38} stroke="#1a2952" strokeWidth={2.5} strokeLinecap="round" />
      {/* Bat */}
      <path d="M72 32 L68 88" stroke="#1a2952" strokeWidth={4} strokeLinecap="round" />
      <path d="M68 76 Q68 96 80 96 Q92 96 92 76 Z" fill="#1a2952" opacity={0.7} />

      {/* Scattered stars */}
      {([[100, 58, 14], [40, 130, 11], [160, 168, 12], [75, 260, 10], [145, 240, 9]] as const).map(
        ([x, y, s], i) => (
          <text key={i} x={x} y={y} fontSize={s} fill="#E4B128" textAnchor="middle">★</text>
        )
      )}

      {/* Bag / backpack */}
      <rect x={130} y={230} width={36} height={44} rx={8} stroke="#1a2952" strokeWidth={2} />
      <path d="M142 230 Q148 218 154 230" stroke="#1a2952" strokeWidth={2} fill="none" strokeLinecap="round" />
      <line x1={130} y1={246} x2={166} y2={246} stroke="#1a2952" strokeWidth={1.5} />
    </svg>
  );
}
