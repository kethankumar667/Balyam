import type { Card, Player, Rank, RummyPlayerState } from "@shared/types";
import type { ReactNode } from "react";
import { useRef } from "react";
import { PlayingCard, SUIT_GLYPHS } from "./Card";
import { classifyMeld, sumCardPoints } from "./meldCheck";
import { suggestArrangement } from "./autoArrange";
import RematchPanel from "../../components/RematchPanel";
import NotebookSheet from "../../components/nostalgia/NotebookSheet";
import { svgToPngBlob } from "../../lib/svgExport";

/**
 * End-of-round result for single-mode Rummy — drawn as a notebook page in
 * Caveat handwriting: one ruled line per player, the winner's name circled
 * in red pen, no trophy/confetti/chip-ticker theatrics. Replaces the prior
 * Junglee-style red-felt table per docs/rummy/anti-patterns.md ("no
 * competitor cloning") and the nostalgia-brief decision table ("the score
 * sheet quietly circles a name"). All scoring math below (chips, ranks,
 * melds) is unchanged from the previous version — only the presentation
 * changed.
 *
 * Shared by both the mobile and desktop Rummy shells via Tailwind `sm:`
 * breakpoints — same pattern the rest of this file already used, so
 * there's no separate desktop variant to keep in sync.
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

  // Shared grid template so the column labels line up with every row.
  const COLS =
    "grid-cols-[40px_minmax(84px,1.3fr)_minmax(0,4fr)_56px_84px] sm:grid-cols-[52px_minmax(120px,1.3fr)_minmax(0,4fr)_72px_104px]";

  // One derived row per player — shared by the live HTML table below and
  // the printable score-sheet SVG (docs/rummy/roadmap.md B.4) so neither
  // re-derives rank/winner/chips on its own.
  const rows = ranked.map((id, idx) => ({
    id,
    rank: idx + 1,
    isWin: id === winnerId && !isWrongShow,
    isWrongShower: id === wrongShowerId,
    isMe: id === selfId,
    name: id === selfId ? "You" : nameOf(id),
    points: lossOf(id),
    chips: chipsOf(id),
    hand: state.finalHands?.[id] ?? [],
  }));

  const svgRef = useRef<SVGSVGElement>(null);

  // Printable score sheet — a standalone notebook-styled SVG (not the live
  // HTML table above) rasterised via the shared `svgToPngBlob` lifted from
  // Ludo's EndGameCard. "Save the sheet" — one button, OS share sheet
  // first (carries the PNG straight into WhatsApp/Photos), falls back to
  // a direct download. No new server route — client-only per the roadmap.
  async function saveSheet() {
    const svg = svgRef.current;
    if (!svg) return;
    const blob = await svgToPngBlob(svg, window.devicePixelRatio || 2);
    if (!blob) return;
    const file = new File([blob], `bhalyam-rummy-${Date.now()}.png`, { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
    if (nav.canShare?.({ files: [file] }) && typeof navigator.share === "function") {
      try {
        await navigator.share({ files: [file], title: "BHALYAM Rummy score sheet" });
        return;
      } catch {
        /* dismissed or failed - fall through to direct download */
      }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(file);
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  const sheetW = 720;
  const sheetRowH = 46;
  const sheetRowsTop = 118;
  const sheetH = sheetRowsTop + rows.length * sheetRowH + 56;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4"
      style={{ background: "rgba(20,14,8,0.62)" }}
      role="dialog"
      aria-modal="true"
    >
      {/* Soft overhead-bulb wash behind the page — not a casino spotlight. */}
      <div className="absolute inset-0 bg-nostalgia-lamp pointer-events-none" aria-hidden />

      {/* Hidden export-only SVG — notebook-styled score sheet rasterised to
          PNG by `saveSheet()` via the shared svgToPngBlob (docs/rummy/roadmap.md
          B.4). Not the same markup as the live HTML table above; this is a
          purpose-built, self-contained drawing so it serialises cleanly
          without needing the page's Tailwind/Google-Fonts styles. */}
      <div className="hidden">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${sheetW} ${sheetH}`}
          width={sheetW}
          height={sheetH}
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="0" y="0" width={sheetW} height={sheetH} rx="14" fill="#F5E9C9" />

          <text x="32" y="44" fontFamily="cursive" fontWeight="700" fontSize="28" fill="#2E2419">
            BHALYAM Rummy
          </text>
          <text x="32" y="68" fontFamily="system-ui, sans-serif" fontSize="12" fill="#2E2419" opacity="0.65">
            {[
              roomCode ? `Table #${roomCode}` : null,
              matchLabel,
              new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }),
            ]
              .filter(Boolean)
              .join("  ·  ")}
          </text>

          <line x1="24" y1={sheetRowsTop - 16} x2={sheetW - 24} y2={sheetRowsTop - 16} stroke="#E0CC9C" strokeWidth="1.5" />
          <text x="32" y={sheetRowsTop - 28} fontFamily="system-ui, sans-serif" fontSize="11" fontWeight="700" letterSpacing="0.08em" fill="#2E2419" opacity="0.55">RANK</text>
          <text x="80" y={sheetRowsTop - 28} fontFamily="system-ui, sans-serif" fontSize="11" fontWeight="700" letterSpacing="0.08em" fill="#2E2419" opacity="0.55">NAME</text>
          <text x={sheetW - 200} y={sheetRowsTop - 28} textAnchor="end" fontFamily="system-ui, sans-serif" fontSize="11" fontWeight="700" letterSpacing="0.08em" fill="#2E2419" opacity="0.55">POINTS</text>
          <text x={sheetW - 32} y={sheetRowsTop - 28} textAnchor="end" fontFamily="system-ui, sans-serif" fontSize="11" fontWeight="700" letterSpacing="0.08em" fill="#2E2419" opacity="0.55">CHIPS</text>

          {rows.map((row, idx) => {
            const cy = sheetRowsTop + idx * sheetRowH + sheetRowH / 2;
            const textY = cy + 6;
            const nameColor = row.isWrongShower ? "#A8332B" : "#2E2419";
            // No live DOM to measure against (this SVG only exists for export) —
            // approximate the name's width from its length, good enough to size
            // a hand-drawn ellipse that reads as "circled", not pixel-exact.
            const estHalfW = row.name.length * 5 + 10;
            const ellipseCx = 80 + estHalfW;
            return (
              <g key={row.id}>
                {idx > 0 && (
                  <line
                    x1="24"
                    y1={sheetRowsTop + idx * sheetRowH}
                    x2={sheetW - 24}
                    y2={sheetRowsTop + idx * sheetRowH}
                    stroke="#E0CC9C"
                    strokeWidth="1"
                    opacity="0.6"
                  />
                )}
                {row.isWin && (
                  <ellipse
                    cx={ellipseCx}
                    cy={cy - 1}
                    rx={estHalfW + 14}
                    ry="19"
                    fill="none"
                    stroke="#A8332B"
                    strokeWidth="2.5"
                    transform={`rotate(-4 ${ellipseCx} ${cy - 1})`}
                  />
                )}
                <text x="32" y={textY} fontFamily="system-ui, sans-serif" fontWeight="700" fontSize="15" fill="#2E2419" opacity="0.7">
                  {row.isWrongShower ? "—" : row.rank}
                </text>
                <text x="80" y={textY} fontFamily="cursive" fontWeight="700" fontSize="18" fill={nameColor}>
                  {row.name}
                </text>
                {row.isWrongShower && (
                  <text
                    x={80 + estHalfW * 2 + 14}
                    y={textY}
                    fontFamily="system-ui, sans-serif"
                    fontSize="10"
                    fontWeight="700"
                    letterSpacing="0.06em"
                    fill="#A8332B"
                    opacity="0.85"
                  >
                    WRONG SHOW
                  </text>
                )}
                <text x={sheetW - 200} y={textY} textAnchor="end" fontFamily="system-ui, sans-serif" fontWeight="700" fontSize="15" fill="#2E2419">
                  {row.points}
                </text>
                <text x={sheetW - 32} y={textY} textAnchor="end" fontFamily="system-ui, sans-serif" fontWeight="700" fontSize="15" fill="#2E2419">
                  {row.chips > 0 ? `+${row.chips}` : row.chips}
                </text>
              </g>
            );
          })}

          <line
            x1="24"
            y1={sheetRowsTop + rows.length * sheetRowH + 14}
            x2={sheetW - 24}
            y2={sheetRowsTop + rows.length * sheetRowH + 14}
            stroke="#E0CC9C"
            strokeWidth="1.5"
          />
          <text x="32" y={sheetRowsTop + rows.length * sheetRowH + 38} fontFamily="system-ui, sans-serif" fontSize="12" fill="#2E2419" opacity="0.7">
            {`Joker ${state.wildJoker.rank}${SUIT_GLYPHS[state.wildJoker.suit] ?? ""}`}
          </text>
          <text x={sheetW / 2} y={sheetH - 14} textAnchor="middle" fontFamily="cursive" fontStyle="italic" fontSize="11" fill="#9C7A3C" opacity="0.85">
            BHALYAM · Relive Childhood
          </text>
        </svg>
      </div>

      <NotebookSheet layout="mobile" className="relative w-full max-w-[1120px] shadow-lift-3">
        {/* Close ✕ — small ink-circle tab, top-right corner */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center
                     text-nostalgia-paper text-base font-black shadow-lift-2 active:translate-y-px font-sans"
          style={{ background: "#2E2419" }}
        >
          ✕
        </button>

        {/* Header — the handwritten note at the top of the page */}
        <div className="flex items-start justify-between gap-3 pr-6">
          <span className="text-[22px] sm:text-[28px] leading-tight">{headerText}</span>
          {onLeave && (
            <button
              type="button"
              onClick={onLeave}
              className="inline-flex items-center gap-1.5 rounded-md border border-nostalgia-paper-edge
                         text-nostalgia-pen/80 text-[11px] sm:text-[12px] font-sans font-semibold px-2.5 py-1.5
                         flex-shrink-0 active:translate-y-px hover:bg-nostalgia-paper-edge/30 transition-colors"
              aria-label="Leave game"
            >
              <LeaveIcon className="w-3.5 h-3.5" />
              Leave
            </button>
          )}
        </div>

        {/* Column labels — system voice (Poppins), small and muted */}
        <div
          className={`grid ${COLS} items-center gap-x-2 mt-3 py-1.5 px-1
                      text-[10px] sm:text-[11px] font-sans font-bold uppercase tracking-[0.1em]
                      text-nostalgia-pen/55 border-b border-nostalgia-paper-edge`}
        >
          <div>Rank</div>
          <div>Name</div>
          <div>Cards</div>
          <div className="text-right">Points</div>
          <div className="text-right">Chips</div>
        </div>

        {/* Rows — one ruled line per player */}
        <div className="max-h-[58vh] overflow-y-auto">
          {rows.map((row) => {
            const { id, rank, isWin, isWrongShower, isMe, name, points, chips, hand } = row;

            return (
              <div
                key={id}
                className={`grid ${COLS} items-center gap-x-2 px-1 py-2.5 border-b border-nostalgia-paper-edge/60
                            ${isMe ? "bg-nostalgia-paper-edge/25" : ""}`}
              >
                {/* Rank */}
                <div className="flex items-center gap-1 font-sans font-bold tabular-nums text-[14px] sm:text-[16px] text-nostalgia-pen/70">
                  {isMe && <span className="text-nostalgia-brass text-[10px] sm:text-xs">»</span>}
                  <span>{isWrongShower ? "—" : rank}</span>
                </div>

                {/* Name — winner circled in red pen, no crown/badge */}
                <div className="flex items-center gap-1.5 min-w-0">
                  {isWin ? (
                    <WinnerCircle>
                      <span className="font-bold truncate text-[16px] sm:text-[19px]">{name}</span>
                    </WinnerCircle>
                  ) : (
                    <span className="font-bold truncate text-[16px] sm:text-[19px]">{name}</span>
                  )}
                  {isWrongShower && (
                    <span className="rounded px-1 py-0.5 text-[9px] sm:text-[10px] font-sans font-bold uppercase tracking-wide
                                      bg-nostalgia-pen-red/15 text-nostalgia-pen-red flex-shrink-0">
                      Wrong Show
                    </span>
                  )}
                </div>

                {/* Cards */}
                <div className="min-w-0 overflow-x-auto scrollbar-none py-0.5">
                  <MeldGroups hand={hand} declaredMelds={state.finalMelds?.[id]} wildRank={wildRank} isWrongShower={isWrongShower} />
                </div>

                {/* Points */}
                <div className="text-right font-sans font-bold tabular-nums text-[14px] sm:text-[17px] text-nostalgia-pen">
                  {points}
                </div>

                {/* Chips */}
                <div className="text-right font-sans font-bold tabular-nums text-[14px] sm:text-[17px] text-nostalgia-pen">
                  {chips > 0 ? `+${chips}` : chips}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer: joker + table id + mode — quiet, system voice */}
        <div className="flex items-center flex-wrap gap-3 pt-3 mt-1 border-t border-nostalgia-paper-edge font-sans">
          <div className="flex-shrink-0">
            <PlayingCard card={state.wildJoker} isWildJoker small />
          </div>
          <div className="text-nostalgia-pen/70 text-[11px] sm:text-[12px] font-semibold">Joker</div>
          <div className="w-px h-5 bg-nostalgia-paper-edge" />
          {roomCode && (
            <div className="text-nostalgia-pen/50 text-[11px] sm:text-[12px] font-mono">#{roomCode}</div>
          )}
          <div className="w-px h-5 bg-nostalgia-paper-edge" />
          <div className="text-nostalgia-pen/60 text-[11px] sm:text-[12px] font-semibold">{matchLabel}</div>
          <button
            type="button"
            onClick={saveSheet}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-nostalgia-paper-edge
                       text-nostalgia-pen/80 text-[11px] sm:text-[12px] font-sans font-semibold px-2.5 py-1.5
                       flex-shrink-0 active:translate-y-px hover:bg-nostalgia-paper-edge/30 transition-colors"
          >
            <SaveIcon className="w-3.5 h-3.5" />
            Save the sheet
          </button>
        </div>

        {/* Rematch — host requests / others accept / countdown when active */}
        <div className="pt-3 font-sans">
          <RematchPanel players={players} selfId={selfId} />
        </div>
      </NotebookSheet>
    </div>
  );
}

/**
 * Hand-drawn red-pen ellipse around the winner's name — the brief's own
 * "brief-aligned instinct" example, replacing the prior crown icon + amber
 * "Winner" pill.
 */
function WinnerCircle({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-flex px-2 py-0.5">
      <svg
        viewBox="0 0 100 44"
        preserveAspectRatio="none"
        aria-hidden
        className="absolute -inset-x-2 -inset-y-1.5 w-[calc(100%+1rem)] h-[calc(100%+0.75rem)]"
      >
        <ellipse cx="50" cy="22" rx="47" ry="19" fill="none" stroke="#A8332B" strokeWidth="2.5" transform="rotate(-4 50 22)" />
      </svg>
      <span className="relative">{children}</span>
    </span>
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



function LeaveIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </svg>
  );
}

function SaveIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}
