import { Crown, LogOut, Moon, Sun } from "lucide-react";
import type { BingoLetter, BingoPlayerPublic, Player } from "@shared/types";
import SeatAvatar from "../../components/profile/SeatAvatar";
import SeatTargetReactionWheel from "../../components/reactions/SeatTargetReactionWheel";
import type { BingoSkin } from "./bingoSkin";

/**
 * The frame around a Bingo table: backdrop, title card, theme switch, turn banner and the players. The 5x5 grid and the claim / mark controls stay in `bingo-shared.tsx`; the two board shells assemble both.
 *
 * Nothing here knows the rules. It is handed names, numbers and flags by `useBingoBoard`.
 */

/* ── Backdrop ───────────────────────────────────────────────────────── */

interface Speck {
  left: string;
  top: string;
  size: number;
  kind: "star" | "dot";
  /** Index into the skin's speck colours. */
  tone: number;
}

/** Fixed positions, so the table does not shuffle on every render. Kept to the edges, clear of the play area. */
const SPECKS: readonly Speck[] = [
  { left: "6%", top: "9%", size: 18, kind: "star", tone: 0 },
  { left: "90%", top: "6%", size: 14, kind: "dot", tone: 1 },
  { left: "94%", top: "27%", size: 20, kind: "star", tone: 2 },
  { left: "3%", top: "33%", size: 12, kind: "dot", tone: 2 },
  { left: "8%", top: "58%", size: 16, kind: "star", tone: 1 },
  { left: "95%", top: "62%", size: 12, kind: "dot", tone: 0 },
  { left: "5%", top: "84%", size: 14, kind: "dot", tone: 1 },
  { left: "91%", top: "88%", size: 18, kind: "star", tone: 0 },
];

const SPECK_TONES_LIGHT = ["#F2B84B", "#E8745A", "#5AA9E6"] as const;
const SPECK_TONES_DARK = ["#FFD84D", "#E9A23B", "#C98B3C"] as const;

function BingoSpecks({ isDark }: { isDark: boolean }) {
  const tones = isDark ? SPECK_TONES_DARK : SPECK_TONES_LIGHT;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
      {SPECKS.map((speck, index) => (
        <svg
          key={index}
          viewBox="0 0 24 24"
          width={speck.size}
          height={speck.size}
          className="absolute max-w-none"
          style={{ left: speck.left, top: speck.top, opacity: isDark ? 0.45 : 0.6 }}
        >
          {speck.kind === "star" ? (
            <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.8-6.3 3.8 1.7-7L2 9.2l7.1-.6z" fill={tones[speck.tone]} />
          ) : (
            <circle cx="12" cy="12" r="7" fill={tones[speck.tone]} />
          )}
        </svg>
      ))}
    </div>
  );
}

export function BingoBackdrop({ skin, className = "", children }: { skin: BingoSkin; className?: string; children: React.ReactNode }) {
  return (
    <div className={`relative isolate flex min-h-screen select-none flex-col transition-colors duration-300 ${skin.page} ${className}`}>
      <BingoSpecks isDark={skin.isDark} />
      <div className="relative z-10 flex flex-1 flex-col">{children}</div>
    </div>
  );
}

/* ── Title card ─────────────────────────────────────────────────────── */

/** A die on a slight tilt: the mark of the game, drawn instead of an emoji so it matches on every device. */
export function BingoDiceIcon({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <g transform="rotate(-10 24 24)">
        <rect x="7" y="7" width="34" height="34" rx="9" fill="#FFFDF4" stroke="#C9A55C" strokeWidth="2.5" />
        <circle cx="17" cy="17" r="3.3" fill="#C81E1E" />
        <circle cx="31" cy="17" r="3.3" fill="#2F2A24" />
        <circle cx="24" cy="24" r="3.3" fill="#2F2A24" />
        <circle cx="17" cy="31" r="3.3" fill="#2F2A24" />
        <circle cx="31" cy="31" r="3.3" fill="#C81E1E" />
      </g>
    </svg>
  );
}

export function BingoTitleCard({
  skin,
  roomCode,
  onLeave,
  compact = false,
}: {
  skin: BingoSkin;
  roomCode: string;
  onLeave: () => void;
  compact?: boolean;
}) {
  return (
    <header className={`flex items-center gap-3 rounded-[1.75rem] ${compact ? "px-3 py-2.5" : "px-5 py-3.5"} ${skin.card}`}>
      {/* The die is decoration: below 360px the title and Leave need its room. */}
      <span className={`hidden shrink-0 place-items-center rounded-2xl min-[360px]:grid ${compact ? "h-12 w-12" : "h-14 w-14"} ${skin.well}`}>
        <BingoDiceIcon className={compact ? "h-9 w-9" : "h-10 w-10"} />
      </span>
      <div className="min-w-0 flex-1">
        <h1 className={`whitespace-nowrap font-display leading-none tracking-wide ${compact ? "text-xl" : "text-3xl"} ${skin.isDark ? "text-[#FFD84D]" : "text-[#4A2C12]"}`}>
          BINGO (1–25)
        </h1>
        <p className={`mt-1.5 inline-flex max-w-full items-center truncate rounded-full px-2.5 py-0.5 text-xs font-bold ${skin.well} ${skin.inkSoft}`}>
          Room: {roomCode}
        </p>
      </div>
      <button
        type="button"
        onClick={onLeave}
        className={`inline-flex min-h-[44px] shrink-0 cursor-pointer items-center gap-1.5 rounded-2xl bg-gradient-to-b from-[#FF5A4F] to-[#D9232D] px-3.5 text-sm font-black text-white shadow-[0_4px_0_rgba(140,20,25,0.45)] transition active:translate-y-0.5 active:shadow-none ${skin.focus}`}
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Leave
      </button>
    </header>
  );
}

export function BingoThemeSwitch({ skin, onToggle }: { skin: BingoSkin; onToggle: () => void }) {
  const Icon = skin.isDark ? Sun : Moon;
  const label = skin.isDark ? "Switch to light theme" : "Switch to dark theme";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      title={label}
      className={`grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full transition active:translate-y-0.5 ${skin.iconButton} ${skin.focus}`}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}

/* ── Turn banner ────────────────────────────────────────────────────── */

export function BingoTurnBanner({
  skin,
  isMyTurn,
  callerName,
  compact = false,
}: {
  skin: BingoSkin;
  isMyTurn: boolean;
  /** Who is calling, when it is not me. */
  callerName: string | null;
  compact?: boolean;
}) {
  const title = isMyTurn ? "YOUR TURN!" : callerName ? `${callerName}'s turn` : "Get ready";
  const detail = isMyTurn ? "Pick a number to call out" : callerName ? "Calling a number…" : "Waiting for the next call";
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex w-full items-center justify-center gap-3 rounded-2xl text-center transition-colors duration-300 ${compact ? "px-3 py-2.5" : "px-6 py-3.5"} ${isMyTurn ? skin.bannerTurn : skin.bannerWait}`}
    >
      {isMyTurn && <BingoDiceIcon className={compact ? "h-9 w-9 shrink-0" : "h-11 w-11 shrink-0"} />}
      <div className="min-w-0">
        <p className={`truncate font-display leading-tight ${compact ? "text-[1.35rem]" : "text-2xl"}`}>{title}</p>
        <p className={`truncate text-sm font-semibold ${skin.inkSoft}`}>{detail}</p>
      </div>
    </div>
  );
}

/* ── Players ────────────────────────────────────────────────────────── */

export interface BingoSeatView {
  id: string;
  name: string;
  avatar?: string;
  isSelf: boolean;
  isHost: boolean;
  isBot: boolean;
  isConnected: boolean;
  /** It is this seat's turn to call a number. */
  isCaller: boolean;
  hasWon: boolean;
  lines: number;
  letters: BingoLetter[];
}

/**
 * One view per seat, joining what the game state knows (lines, letters, bot) with what the room knows
 * (host, picture, who is still connected). The room's connection flag wins when it has one: it is the fresher of the two.
 */
export function buildBingoSeats(
  seats: readonly BingoPlayerPublic[],
  roster: readonly Player[],
  selfId: string | null,
  callerId: string | null,
): BingoSeatView[] {
  const rosterById = new Map(roster.map((player) => [player.id, player] as const));
  return seats.map((seat) => {
    const member = rosterById.get(seat.id);
    return {
      id: seat.id,
      name: seat.name,
      avatar: member?.avatar,
      isSelf: seat.id === selfId,
      isHost: member?.isHost === true,
      isBot: seat.isBot,
      isConnected: member?.isConnected ?? seat.isConnected,
      isCaller: seat.id === callerId,
      hasWon: seat.hasWon,
      lines: seat.completedLinesCount,
      letters: seat.completedLetters,
    };
  });
}

interface PlayersStripProps {
  skin: BingoSkin;
  seats: readonly BingoSeatView[];
  /** `row` is the phone's strip of faces; `list` is the desktop side panel with each seat's progress. */
  layout: "row" | "list";
  viewingAllTables: boolean;
  canInspectBoards?: boolean;
  onToggleTables: () => void;
  registerCardRef?: (playerId: string | null) => (el: HTMLElement | null) => void;
  onTarget?: (playerId: string) => void;
  activeTargetId?: string | null;
  onCloseTarget?: () => void;
}

function OnlineDot({ skin, isConnected }: { skin: BingoSkin; isConnected: boolean }) {
  return (
    <span
      role="img"
      aria-label={isConnected ? "Online" : "Away"}
      className={`absolute bottom-0.5 right-0.5 z-20 h-3.5 w-3.5 rounded-full border-2 ${isConnected ? "bg-[#22C55E]" : "bg-[#9CA3AF]"} ${skin.isDark ? "border-[#2D1B10]" : "border-[#FFF9E8]"}`}
    />
  );
}

function Chip({ children, tone }: { children: React.ReactNode; tone: "host" | "calling" }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[0.65rem] font-extrabold uppercase leading-none tracking-wide ${tone === "host" ? "bg-gradient-to-b from-[#FFE066] to-[#F5B400] text-[#3A2200]" : "bg-[#3A2200] text-[#FFE066]"}`}
    >
      {children}
    </span>
  );
}

export function BingoPlayersStrip(props: PlayersStripProps) {
  const { skin, seats, layout, viewingAllTables, onToggleTables, registerCardRef, onTarget, activeTargetId, onCloseTarget } = props;
  const reactable = (seat: BingoSeatView) => !seat.isSelf && onTarget != null;
  const seatLabel = (seat: BingoSeatView) => (reactable(seat) ? `React at ${seat.name}` : seat.isSelf ? `${seat.name} (you)` : seat.name);

  const wheel = (seat: BingoSeatView) =>
    activeTargetId === seat.id && onCloseTarget ? (
      <SeatTargetReactionWheel game="bingo" targetPlayerId={seat.id} targetPlayerName={seat.name} onClose={onCloseTarget} position="top" />
    ) : null;

  return (
    <section aria-label="Players" className={`rounded-3xl px-3 pb-3 pt-2 ${skin.card}`}>
      <div className="mb-1 flex items-center justify-between gap-2 px-1">
        <h2 className={`text-sm font-extrabold ${skin.ink}`}>Players ({seats.length})</h2>
        {props.canInspectBoards && <button
          type="button"
          onClick={onToggleTables}
          className={`min-h-[44px] cursor-pointer rounded-xl px-3 text-xs font-extrabold ${skin.link} ${skin.focus}`}
        >
          {viewingAllTables ? "Back to my board" : "View all tables"}
        </button>}
      </div>

      {layout === "row" ? (
        <ul className="flex items-start justify-around gap-2 overflow-x-auto pt-3">
          {seats.map((seat) => (
            <li key={seat.id} ref={registerCardRef?.(seat.id)} className="relative flex w-[4.25rem] shrink-0 flex-col items-center gap-1">
              {seat.isHost && <Crown className="absolute -top-3.5 z-30 h-5 w-5 fill-[#FFD84D] text-[#C98B00]" aria-label="Host" role="img" />}
              <button
                type="button"
                disabled={!reactable(seat)}
                onClick={() => onTarget?.(seat.id)}
                aria-label={seatLabel(seat)}
                className={`relative h-14 w-14 rounded-full ${reactable(seat) ? "cursor-pointer" : "cursor-default"} ${skin.focus}`}
              >
                <SeatAvatar
                  avatar={seat.avatar}
                  playerId={seat.id}
                  name={seat.name}
                  className={`h-14 w-14 ring-[3px] ${seat.isCaller ? "ring-[#F5B400]" : skin.isDark ? "ring-[#5C3B20]" : "ring-[#E8D3A2]"}`}
                  textClassName="text-lg"
                />
                <OnlineDot skin={skin} isConnected={seat.isConnected} />
              </button>
              <span className={`w-full truncate text-center text-xs font-extrabold ${skin.ink}`}>{seat.isSelf ? "You" : seat.name}</span>
              {seat.isHost && <Chip tone="host">Host</Chip>}
              {seat.isCaller && !seat.isSelf && <Chip tone="calling">Calling</Chip>}
              {wheel(seat)}
            </li>
          ))}
        </ul>
      ) : (
        <ul className={`divide-y ${skin.divider}`}>
          {seats.map((seat) => (
            <li key={seat.id} ref={registerCardRef?.(seat.id)} className="relative">
              <button
                type="button"
                disabled={!reactable(seat)}
                onClick={() => onTarget?.(seat.id)}
                aria-label={seatLabel(seat)}
                className={`flex min-h-[56px] w-full items-center gap-3 rounded-xl px-2 py-2 text-left ${reactable(seat) ? "cursor-pointer" : "cursor-default"} ${skin.focus}`}
              >
                <span className="relative h-11 w-11 shrink-0">
                  <SeatAvatar
                    avatar={seat.avatar}
                    playerId={seat.id}
                    name={seat.name}
                    className={`h-11 w-11 ring-[3px] ${seat.isCaller ? "ring-[#F5B400]" : skin.isDark ? "ring-[#5C3B20]" : "ring-[#E8D3A2]"}`}
                    textClassName="text-base"
                  />
                  <OnlineDot skin={skin} isConnected={seat.isConnected} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`flex items-center gap-1.5 text-sm font-extrabold ${skin.ink}`}>
                    {seat.isHost && <Crown className="h-4 w-4 shrink-0 fill-[#FFD84D] text-[#C98B00]" aria-label="Host" role="img" />}
                    <span className="truncate">{seat.isSelf ? `${seat.name} (you)` : seat.name}</span>
                    {seat.isBot && <span className={`text-[0.65rem] font-bold uppercase ${skin.inkSoft}`}>bot</span>}
                  </span>
                  <span className={`block text-xs font-semibold ${skin.inkSoft}`}>
                    {seat.lines} {seat.lines === 1 ? "line" : "lines"}
                    {seat.letters.length > 0 ? ` · ${seat.letters.join("")}` : ""}
                  </span>
                </span>
                {seat.isCaller && <Chip tone="calling">Calling</Chip>}
              </button>
              {wheel(seat)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
