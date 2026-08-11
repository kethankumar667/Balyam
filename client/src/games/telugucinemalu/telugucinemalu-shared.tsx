import { useEffect, useState } from "react";
import type {
  TcDifficulty,
  TcRole,
  TcRoundKind,
  TeluguCinemaluPlayerState,
} from "@shared/types";
import { TC_DIFFICULTY_POINTS, TC_ROLE_LABELS } from "@shared/types";

/* ─────────────────────────── Palette ─────────────────────────── */
const T = {
  bg: "#140B1F",
  card: "#221333",
  cardSoft: "#2C1A42",
  border: "#3E2559",
  gold: "#F5C542",
  goldDark: "#C79A1E",
  text: "#F6EFFA",
  textDim: "#B9A6CC",
  right: "#2BB673",
  wrong: "#E0555B",
} as const;

export const DIFFICULTY_META: Record<TcDifficulty, { label: string; color: string }> = {
  easy: { label: "Easy", color: "#2BB673" },
  moderate: { label: "Moderate", color: "#E8B23A" },
  hard: { label: "Hard", color: "#E8803A" },
  extreme: { label: "Extreme", color: "#E0555B" },
};

export const ROUND_META: Record<TcRoundKind, { title: string; blurb: string }> = {
  personality: { title: "Personality", blurb: "Questions about the star you picked" },
  narration: { title: "Narration", blurb: "Read the story, name the film" },
  dialogue: { title: "Dialogue", blurb: "Guess the film, actor, or missing words" },
  combination: { title: "Combinations", blurb: "Cast and crew — name the missing piece" },
};

const ROLE_ORDER: TcRole[] = ["hero", "heroine", "director", "musicDirector"];

/* ─────────────────────────── Role selection ─────────────────────────── */
export function RoleSelect({
  onPick,
  dense,
}: {
  onPick: (role: TcRole) => void;
  dense: boolean;
}) {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6">
      <h2
        className="text-center font-black uppercase tracking-wider mb-1"
        style={{ color: T.gold, fontSize: dense ? 18 : 22 }}
      >
        Round 1 · Personality
      </h2>
      <p className="text-center text-sm mb-6" style={{ color: T.textDim }}>
        Pick a category, then choose who you want to be quizzed on.
      </p>
      <div className={`grid gap-3 ${dense ? "grid-cols-2" : "grid-cols-4"}`}>
        {ROLE_ORDER.map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => onPick(role)}
            className="rounded-2xl p-4 text-left transition-transform active:scale-95 hover:-translate-y-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2"
            style={{
              background: `linear-gradient(160deg, ${T.cardSoft}, ${T.card})`,
              border: `1.5px solid ${T.border}`,
              color: T.text,
              minHeight: 96,
            }}
          >
            <div className="text-base font-black">{TC_ROLE_LABELS[role]}</div>
            <div className="text-[11px] mt-1" style={{ color: T.textDim }}>
              {role === "musicDirector" ? "Composers & their films" : "Stars & their films"}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── Person selection ─────────────────────────── */
export function PersonSelect({
  state,
  onPick,
  dense,
}: {
  state: TeluguCinemaluPlayerState;
  onPick: (personId: string) => void;
  dense: boolean;
}) {
  const cards = state.personChoices ?? [];
  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6">
      <h2
        className="text-center font-black uppercase tracking-wider mb-1"
        style={{ color: T.gold, fontSize: dense ? 18 : 22 }}
      >
        Choose a {state.selectedRole ? TC_ROLE_LABELS[state.selectedRole] : "name"}
      </h2>
      <p className="text-center text-sm mb-6" style={{ color: T.textDim }}>
        Five questions will be about whoever you pick.
      </p>
      <div className={`grid gap-3 ${dense ? "grid-cols-2" : "grid-cols-3"}`}>
        {cards.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onPick(c.id)}
            className="rounded-2xl p-4 text-left transition-transform active:scale-95 hover:-translate-y-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2"
            style={{
              background: `linear-gradient(160deg, ${T.cardSoft}, ${T.card})`,
              border: `1.5px solid ${T.border}`,
              color: T.text,
              minHeight: 88,
            }}
          >
            <div className="font-black text-sm leading-tight">{c.name}</div>
            <div className="text-[11px] mt-1.5" style={{ color: T.textDim }}>
              {c.knownFor}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── Progress HUD ─────────────────────────── */
export function QuizHud({ state }: { state: TeluguCinemaluPlayerState }) {
  const me = state.players.find((p) => p.id === state.seatOrder[0]);
  const meta = ROUND_META[state.roundKind];
  return (
    <div
      className="w-full flex items-center justify-between gap-3 px-4 py-2.5"
      style={{ background: T.card, borderBottom: `1.5px solid ${T.border}` }}
    >
      <div className="min-w-0">
        <div className="text-[10px] font-black uppercase tracking-wider" style={{ color: T.gold }}>
          Round {state.round}/{state.totalRounds} · {meta.title}
        </div>
        <div className="text-[11px] truncate" style={{ color: T.textDim }}>
          {state.selectedPersonName && state.roundKind === "personality"
            ? state.selectedPersonName
            : meta.blurb}
        </div>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="text-right">
          <div className="text-[9px] font-bold uppercase" style={{ color: T.textDim }}>
            Question
          </div>
          <div className="text-sm font-black tabular-nums" style={{ color: T.text }}>
            {state.questionInRound}/{state.questionsInRound}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] font-bold uppercase" style={{ color: T.textDim }}>
            Score
          </div>
          <div className="text-sm font-black tabular-nums" style={{ color: T.gold }}>
            {me?.score ?? 0}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Countdown ─────────────────────────── */
function Countdown({ deadline }: { deadline: number | null }) {
  const [left, setLeft] = useState(() =>
    deadline ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) : 0
  );
  useEffect(() => {
    if (!deadline) return;
    const tick = () => setLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const t = window.setInterval(tick, 250);
    return () => window.clearInterval(t);
  }, [deadline]);
  if (!deadline) return null;
  return (
    <span
      className="text-xs font-black tabular-nums px-2 py-0.5 rounded-full"
      style={{
        background: left <= 5 ? `${T.wrong}22` : `${T.border}66`,
        color: left <= 5 ? T.wrong : T.textDim,
      }}
    >
      {left}s
    </span>
  );
}

/* ─────────────────────────── Question ─────────────────────────── */
export function QuestionCard({
  state,
  onAnswer,
  onNext,
  dense,
}: {
  state: TeluguCinemaluPlayerState;
  onAnswer: (index: number) => void;
  onNext: () => void;
  dense: boolean;
}) {
  const q = state.currentQuestion;
  if (!q) return null;

  const revealed = state.correctIndex != null;
  const mine = state.mySelectedIndex;
  const diff = DIFFICULTY_META[q.difficulty];

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={{ background: `${diff.color}22`, color: diff.color, border: `1px solid ${diff.color}55` }}
        >
          {diff.label} · {TC_DIFFICULTY_POINTS[q.difficulty]} pts
        </span>
        {!revealed && <Countdown deadline={state.deadline} />}
      </div>

      {q.body && (
        <div
          className="rounded-xl px-4 py-3 text-sm leading-relaxed"
          style={{
            background: T.cardSoft,
            border: `1.5px solid ${T.border}`,
            color: T.text,
            fontSize: dense ? 13 : 15,
          }}
        >
          {q.body}
        </div>
      )}

      <h3 className="font-bold" style={{ color: T.text, fontSize: dense ? 15 : 17 }}>
        {q.prompt}
      </h3>

      <div className="grid gap-2">
        {q.options.map((opt, i) => {
          const isAnswer = revealed && i === state.correctIndex;
          const isMyWrong = revealed && i === mine && i !== state.correctIndex;
          let bg: string = T.card;
          let border: string = T.border;
          const color: string = T.text;
          if (isAnswer) {
            bg = `${T.right}22`;
            border = T.right;
          } else if (isMyWrong) {
            bg = `${T.wrong}22`;
            border = T.wrong;
          } else if (!revealed && i === mine) {
            border = T.gold;
          }
          return (
            <button
              key={opt}
              type="button"
              disabled={revealed || mine != null}
              onClick={() => onAnswer(i)}
              className="rounded-xl px-4 py-3 text-left text-sm font-semibold transition-transform active:scale-[0.99] disabled:cursor-default cursor-pointer focus-visible:outline-none focus-visible:ring-2"
              style={{ background: bg, border: `1.5px solid ${border}`, color, minHeight: 48 }}
            >
              <span className="opacity-50 mr-2 font-black">{String.fromCharCode(65 + i)}</span>
              {opt}
            </button>
          );
        })}
      </div>

      {revealed && (
        <div className="flex flex-col gap-3">
          {q.trivia && (
            <p className="text-[12px] leading-relaxed" style={{ color: T.textDim }}>
              {q.trivia}
            </p>
          )}
          <button
            type="button"
            onClick={onNext}
            className="self-end rounded-xl px-5 py-2.5 text-sm font-black uppercase tracking-wider cursor-pointer active:scale-95 transition"
            style={{ background: T.gold, color: "#241407" }}
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Round summary ─────────────────────────── */
export function RoundSummary({
  state,
  onNext,
}: {
  state: TeluguCinemaluPlayerState;
  onNext: () => void;
}) {
  const last = state.roundResults[state.roundResults.length - 1];
  if (!last) return null;
  return (
    <div className="w-full max-w-md mx-auto px-4 py-8 text-center">
      <div className="text-[11px] font-black uppercase tracking-widest mb-2" style={{ color: T.textDim }}>
        Round complete
      </div>
      <h2 className="text-2xl font-black mb-6" style={{ color: T.gold }}>
        {ROUND_META[last.kind].title}
      </h2>
      <div
        className="rounded-2xl px-6 py-5 mb-6"
        style={{ background: T.card, border: `1.5px solid ${T.border}` }}
      >
        <div className="text-4xl font-black tabular-nums" style={{ color: T.text }}>
          {last.correct}
          <span style={{ color: T.textDim }}>/{last.asked}</span>
        </div>
        <div className="text-sm mt-1" style={{ color: T.textDim }}>
          correct · <span style={{ color: T.gold }}>+{last.points} points</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onNext}
        className="rounded-xl px-6 py-3 text-sm font-black uppercase tracking-wider cursor-pointer active:scale-95 transition"
        style={{ background: T.gold, color: "#241407" }}
      >
        Next round
      </button>
    </div>
  );
}

/* ─────────────────────────── Final scorecard ─────────────────────────── */
export function FinalCard({ state }: { state: TeluguCinemaluPlayerState }) {
  const me = state.players[0];
  const maxPossible =
    state.roundResults.length > 0
      ? state.roundResults.reduce((n, r) => n + r.asked, 0)
      : state.totalQuestions;
  return (
    <div className="w-full max-w-md mx-auto px-4 py-8 text-center">
      <h2 className="text-2xl font-black mb-1" style={{ color: T.gold }}>
        Quiz complete
      </h2>
      <p className="text-sm mb-6" style={{ color: T.textDim }}>
        {me?.correctCount ?? 0} of {maxPossible} correct
      </p>
      <div
        className="rounded-2xl px-6 py-6 mb-6"
        style={{ background: T.card, border: `1.5px solid ${T.border}` }}
      >
        <div className="text-[11px] font-black uppercase tracking-widest" style={{ color: T.textDim }}>
          Final score
        </div>
        <div className="text-5xl font-black tabular-nums mt-1" style={{ color: T.gold }}>
          {me?.score ?? 0}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {state.roundResults.map((r) => (
          <div
            key={r.kind}
            className="flex items-center justify-between rounded-xl px-4 py-2.5 text-sm"
            style={{ background: T.card, border: `1px solid ${T.border}`, color: T.text }}
          >
            <span className="font-semibold">{ROUND_META[r.kind].title}</span>
            <span className="tabular-nums" style={{ color: T.textDim }}>
              {r.correct}/{r.asked} · <span style={{ color: T.gold }}>{r.points}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── Shell ─────────────────────────── */
export function TeluguCinemaluShell({
  state,
  onMove,
  dense,
}: {
  state: TeluguCinemaluPlayerState;
  onMove: (type: string, data?: unknown) => void;
  dense: boolean;
}) {
  const showHud =
    state.phase === "playing" || state.phase === "questionSummary" || state.phase === "roundSummary";

  return (
    <div
      className="h-full min-h-0 overflow-y-auto flex flex-col font-sans"
      style={{ background: `linear-gradient(180deg, ${T.bg}, #0C0714)` }}
    >
      {showHud && <QuizHud state={state} />}

      {state.phase === "roleSelection" && (
        <RoleSelect dense={dense} onPick={(role) => onMove("selectRole", { role })} />
      )}
      {state.phase === "personSelection" && (
        <PersonSelect
          state={state}
          dense={dense}
          onPick={(personId) => onMove("selectPerson", { personId })}
        />
      )}
      {(state.phase === "playing" || state.phase === "questionSummary") && (
        <QuestionCard
          state={state}
          dense={dense}
          onAnswer={(optionIndex) => onMove("submitAnswer", { optionIndex })}
          onNext={() => onMove("next")}
        />
      )}
      {state.phase === "roundSummary" && (
        <RoundSummary state={state} onNext={() => onMove("next")} />
      )}
      {state.phase === "finished" && <FinalCard state={state} />}
    </div>
  );
}
