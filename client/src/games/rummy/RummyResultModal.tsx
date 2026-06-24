import type { Card, Player, Rank, RummyPlayerState } from "@shared/types";
import { PlayingCard } from "./Card";
import { classifyMeld, sumCardPoints } from "./meldCheck";
import { suggestArrangement } from "./autoArrange";
import RematchPanel from "../../components/RematchPanel";

/**
 * End-of-round result modal for single-mode Rummy, styled after the
 * Junglee-style results table the user supplied: a deep-red landscape modal
 * with a RANK · USERNAME · CARDS · POINTS · CHIPS WON table, each player on
 * one row, their hand shown as real meld groups with per-group point badges,
 * a crown on the winner, a ▶ marker on "you", and a joker / table-id / mode
 * footer. Shared by both the mobile and desktop Rummy shells (the board is
 * landscape on both, so the same table fits).
 */
export default function RummyResultModal({
  state,
  players,
  selfId,
  roomCode,
  onClose,
  onLeave,
}: {
  state: RummyPlayerState;
  players: Player[];
  selfId: string | null;
  roomCode?: string;
  onClose: () => void;
  onLeave?: () => void;
}) {
  const winnerId = state.winnerId ?? null;
  const wrongShowerId = state.invalidDeclareBy ?? null;
  const isWrongShow = wrongShowerId !== null;
  const wildRank = state.wildJoker.rank;

  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? "?";
  const lossOf = (id: string) => Math.max(0, state.scores?.[id] ?? 0);

  // Chips: normal round → winner takes Σ(losers' hand values), each loser pays
  // their own; wrong show → mis-declarer eats −80 split across opponents.
  const chipsOf = (id: string): number => {
    if (isWrongShow) {
      if (id === wrongShowerId) return -80;
      const opp = state.playerOrder.filter((p) => p !== wrongShowerId);
      return opp.length > 0 ? Math.round(80 / opp.length) : 0;
    }
    if (id === winnerId) {
      return state.playerOrder.reduce(
        (s, p) => (p === winnerId ? s : s + lossOf(p)),
        0,
      );
    }
    return -lossOf(id);
  };

  const ranked = [...state.playerOrder].sort((a, b) => {
    if (isWrongShow) {
      if (a === wrongShowerId) return 1;
      if (b === wrongShowerId) return -1;
      return 0;
    }
    if (a === winnerId) return -1;
    if (b === winnerId) return 1;
    return lossOf(a) - lossOf(b);
  });
  const selfRank = selfId ? ranked.indexOf(selfId) + 1 : null;

  const disconnectedId = state.endedByDisconnect ?? null;
  const headerText = disconnectedId
    ? disconnectedId === selfId
      ? "You disconnected"
      : `${nameOf(disconnectedId)} disconnected`
    : isWrongShow
      ? wrongShowerId === selfId
        ? "Wrong show — −80!"
        : `${nameOf(wrongShowerId!)} mis-declared`
      : selfRank
        ? `You finished ${ordinal(selfRank)}!`
        : "Round complete";

  const matchLabel =
    state.matchMode === "pool101" ? "101 Pool"
    : state.matchMode === "pool201" ? "201 Pool"
    : "Points";

  // Shared grid template so the header labels line up with every row.
  const COLS =
    "grid-cols-[40px_minmax(84px,1.3fr)_minmax(0,4fr)_56px_84px] sm:grid-cols-[52px_minmax(120px,1.3fr)_minmax(0,4fr)_72px_104px]";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4"
      style={{ background: "rgba(0,0,0,0.74)" }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-[1120px] rounded-2xl text-white"
        style={{
          background:
            "radial-gradient(120% 130% at 50% 0%, #b6291f 0%, #8c1a14 48%, #5c0f0c 100%)",
          border: "2px solid rgba(0,0,0,0.5)",
          boxShadow:
            "0 26px 70px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,210,120,0.3) inset",
        }}
      >
        {/* Close ✕ — overlapping the top-right corner */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute -top-3 -right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center
                     text-white text-lg font-black shadow-lg active:translate-y-px"
          style={{ background: "radial-gradient(circle at 35% 30%, #ff5b4d, #c5160c)", border: "2px solid #fff" }}
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-4 sm:px-6 pt-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <DiamondCardIcon className="w-8 h-9 flex-shrink-0 drop-shadow" />
            <span className="italic font-black text-[18px] sm:text-[24px] leading-tight drop-shadow">
              {headerText}
            </span>
          </div>
          {onLeave && (
            <button
              type="button"
              onClick={onLeave}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800/90 hover:bg-zinc-700
                         text-zinc-100 text-[12px] sm:text-[13px] font-bold px-3 py-1.5 flex-shrink-0
                         active:translate-y-px transition-colors"
              aria-label="Leave game"
            >
              <LeaveIcon className="w-3.5 h-3.5" />
              Leave Game
            </button>
          )}
        </div>

        {/* Column headers */}
        <div
          className={`grid ${COLS} items-center gap-x-2 px-3 sm:px-5 mt-3 py-2
                      text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.12em] text-amber-100/75`}
          style={{ background: "rgba(0,0,0,0.22)" }}
        >
          <div>Rank</div>
          <div>Username</div>
          <div>Cards</div>
          <div className="text-right">Points</div>
          <div className="text-right">Chips Won</div>
        </div>

        {/* Rows */}
        <div className="max-h-[58vh] overflow-y-auto">
          {ranked.map((id, idx) => {
            const rank = idx + 1;
            const isWin = id === winnerId && !isWrongShow;
            const isWrongShower = id === wrongShowerId;
            const isMe = id === selfId;
            const points = lossOf(id);
            const chips = chipsOf(id);
            const hand = state.finalHands?.[id] ?? [];

            const rowStyle: React.CSSProperties = isWrongShower
              ? { background: "rgba(24,24,27,0.7)" }
              : isMe
                ? { background: "linear-gradient(90deg,#e23120 0%,#c01a10 100%)" }
                : isWin
                  ? {
                      background: "linear-gradient(90deg,#f0641f 0%,#d8331a 100%)",
                      borderLeft: "4px solid #ffd23c",
                    }
                  : { background: "rgba(70,8,8,0.4)" };

            return (
              <div
                key={id}
                className={`grid ${COLS} items-center gap-x-2 px-3 sm:px-5 py-2.5 border-t border-black/15`}
                style={rowStyle}
              >
                {/* Rank */}
                <div className="flex items-center gap-1 font-black tabular-nums text-[15px] sm:text-[18px]">
                  {isMe && <span className="text-amber-300 text-[10px] sm:text-xs">▶</span>}
                  <span>{isWrongShower ? "—" : rank}</span>
                </div>

                {/* Username */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-black italic truncate text-[13px] sm:text-[16px]">
                    {isMe ? "You" : nameOf(id)}
                  </span>
                  {isWin && (
                    <span className="inline-flex items-center gap-0.5 flex-shrink-0 text-[11px] sm:text-[13px] font-extrabold italic text-amber-300">
                      <CrownIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Winner
                    </span>
                  )}
                  {isWrongShower && (
                    <span className="rounded px-1 py-0.5 text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wide bg-rose-700 text-rose-100 flex-shrink-0">
                      Wrong Show
                    </span>
                  )}
                </div>

                {/* Cards */}
                <div className="min-w-0 overflow-x-auto scrollbar-none py-0.5">
                  <MeldGroups hand={hand} declaredMelds={state.finalMelds?.[id]} wildRank={wildRank} isWrongShower={isWrongShower} />
                </div>

                {/* Points */}
                <div className="text-right font-black tabular-nums text-[14px] sm:text-[18px]">
                  {points}
                </div>

                {/* Chips won */}
                <div className="text-right font-black tabular-nums text-[14px] sm:text-[18px]">
                  {chips > 0 ? `+${chips}` : chips}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer: joker + table id + mode */}
        <div className="flex items-center gap-3 px-4 sm:px-6 py-3 border-t border-amber-300/20" style={{ background: "rgba(0,0,0,0.25)" }}>
          <div className="flex-shrink-0">
            <PlayingCard card={state.wildJoker} isWildJoker small />
          </div>
          <div className="text-amber-100/90 text-[12px] sm:text-[13px] font-bold">Joker</div>
          <div className="w-px h-5 bg-amber-100/20" />
          {roomCode && (
            <div className="text-amber-100/55 text-[11px] sm:text-[12px] font-mono">#{roomCode}</div>
          )}
          <div className="w-px h-5 bg-amber-100/20" />
          <div className="text-amber-100/70 text-[11px] sm:text-[12px] font-semibold">{matchLabel}</div>
        </div>

        {/* Rematch — host requests / others accept / countdown when active */}
        <div className="px-4 sm:px-6 pb-4 pt-1">
          <RematchPanel players={players} selfId={selfId} />
        </div>
      </div>
    </div>
  );
}

/* ── Meld groups (one player's hand → grouped cards + point badges) ───────── */

function MeldGroups({
  hand,
  declaredMelds,
  wildRank,
  isWrongShower,
}: {
  hand: Card[];
  declaredMelds: string[][] | undefined;
  wildRank: string;
  isWrongShower: boolean;
}) {
  if (hand.length === 0) return <span className="text-amber-100/50 text-[11px] italic">—</span>;
  const byId = new Map(hand.map((c) => [c.id, c]));

  let groups: Card[][] = [];
  let ungrouped: Card[] = [];
  if (declaredMelds && declaredMelds.length > 0) {
    const seen = new Set<string>();
    for (const g of declaredMelds) {
      const cards: Card[] = [];
      for (const cid of g) {
        const c = byId.get(cid);
        if (c && !seen.has(cid)) { cards.push(c); seen.add(cid); }
      }
      if (cards.length > 0) groups.push(cards);
    }
    ungrouped = hand.filter((c) => !seen.has(c.id));
  } else {
    const arr = suggestArrangement(hand, wildRank as Rank);
    groups = arr.groups;
    ungrouped = arr.ungrouped;
  }

  // Whether sets are "unlocked" (pure required, sets need 2 sequences total).
  let hasPure = false;
  let seqCount = 0;
  for (const g of groups) {
    const cls = classifyMeld(g, wildRank as Rank);
    if (!cls.valid) continue;
    if (cls.kind === "pureSequence") { hasPure = true; seqCount += 1; }
    else if (cls.kind === "impureSequence") seqCount += 1;
  }
  const pointsForGroup = (g: Card[]): number => {
    const cls = classifyMeld(g, wildRank as Rank);
    if (!cls.valid) return sumCardPoints(g, wildRank as Rank);
    if (cls.kind === "pureSequence") return 0;
    if (cls.kind === "impureSequence") return hasPure ? 0 : sumCardPoints(g, wildRank as Rank);
    if (cls.kind === "set") return hasPure && seqCount >= 2 ? 0 : sumCardPoints(g, wildRank as Rank);
    return sumCardPoints(g, wildRank as Rank);
  };

  return (
    <div className="flex items-center gap-2 w-max">
      {groups.map((g, gi) => (
        <ScoreGroup key={gi} cards={g} points={pointsForGroup(g)} wildRank={wildRank} />
      ))}
      {ungrouped.length > 0 && (
        <ScoreGroup cards={ungrouped} points={sumCardPoints(ungrouped, wildRank as Rank)} wildRank={wildRank} isWrongShower={isWrongShower} />
      )}
    </div>
  );
}

function ScoreGroup({
  cards,
  points,
  wildRank,
  isWrongShower,
}: {
  cards: Card[];
  points: number;
  wildRank: string;
  isWrongShower?: boolean;
}) {
  if (cards.length === 0) return null;
  const credited = points === 0;
  const badgeBg = credited
    ? "linear-gradient(135deg,#22c55e,#16a34a)"
    : isWrongShower
      ? "linear-gradient(135deg,#ef4444,#b91c1c)"
      : "linear-gradient(135deg,#f59e0b,#d97706)";
  return (
    <div className="relative flex-shrink-0" title={credited ? "Valid meld" : `${points} points`}>
      <div className="flex">
        {cards.map((c, i) => (
          <span key={c.id} className="flex-shrink-0" style={{ marginLeft: i === 0 ? 0 : -16 }}>
            <PlayingCard card={c} isWildJoker={c.rank === wildRank} small />
          </span>
        ))}
      </div>
      <span
        className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-extrabold tabular-nums"
        style={{ background: badgeBg, color: "#fff", border: "1.5px solid #fff", boxShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
      >
        {points}
      </span>
    </div>
  );
}

/* ── Icons ────────────────────────────────────────────────────────────────── */

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"] as const;
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function DiamondCardIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 32" className={className} aria-hidden>
      <rect x="3" y="2" width="22" height="28" rx="3" fill="#f6c722" stroke="#b8870c" strokeWidth="1.2" />
      <path d="M14 8 L19 16 L14 24 L9 16 Z" fill="#d11" />
    </svg>
  );
}

function CrownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M3 18h18l-1.5-9-3.5 4-3-5-3 5-3.5-4L3 18ZM3 20h18v2H3z" />
    </svg>
  );
}

function LeaveIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </svg>
  );
}
