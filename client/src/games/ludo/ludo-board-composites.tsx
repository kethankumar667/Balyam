import type { ReactNode } from "react";
import type { LudoColor, LudoState, Player } from "@shared/types";
import { Dice } from "./Dice";
import { Token } from "./Token";
import InstructionsModal from "./InstructionsModal";
import Toast from "./Toast";
import Confetti from "./Confetti";
import FloatingReactionsLayer from "./FloatingReactionsLayer";
import CursorLayer from "./CursorLayer";
import EndGameCard from "./EndGameCard";
import EmojiRain from "./EmojiRain";
import WinnerCelebration from "./WinnerCelebration";
import SettingsMenu from "./SettingsMenu";
import PrintBoardSVG from "./PrintBoardSVG";
import { seatColor, seatColorDark } from "./print-board";
import { TurnTimeWarning } from "../../components/TurnTimeWarning";
import { COLOR_HEX, COLOR_HEX_DARK, PLAYER_COLORS_ORDER } from "./board-layout";
import { Avatar } from "./Avatar";
import { BoardSVG, HoverPreviewMarker, MiniBurst, polygonTokenSize } from "./ludo-board-shared";
import type { LudoBoardModel } from "./useLudoBoard";

/**
 * Ludo — shared composite layout pieces.
 *
 * Each composite takes the full board model (`m`) plus the raw state/players
 * Room.tsx hands the picker, so both shells render the identical functional
 * surface and only their surrounding column arrangement differs. Imports
 * `LudoBoardModel` as a type only — erased at compile time, so this does not
 * form a runtime import cycle with useLudoBoard.ts (which imports VALUES from
 * ludo-board-shared.tsx, never from this file).
 */

/** Crayon "LUDO" wordmark on a taped sticky-note — the reference header
 *  motif. Purely decorative; each letter tinted a play-color with a wax-
 *  crayon outline and a hand-drawn tilt. */
function LudoLogo() {
  const letters: ReadonlyArray<[string, string]> = [
    ["L", "#E4572E"], ["U", "#F2A900"], ["D", "#2E86DE"], ["O", "#3FA34D"],
  ];
  return (
    <div className="relative select-none flex-shrink-0" style={{ transform: "rotate(-3deg)" }} aria-label="Ludo">
      <span
        aria-hidden
        className="absolute -top-2 left-1/2 -translate-x-1/2 w-9 h-3.5 rounded-sm"
        style={{ background: "rgba(228,177,40,0.35)", border: "1px solid rgba(154,110,26,0.4)", transform: "rotate(4deg)" }}
      />
      <div className="flex items-end leading-none font-display" style={{ fontSize: "1.7rem" }}>
        {letters.map(([ch, col], i) => (
          <span
            key={i}
            className="font-black"
            style={{
              color: col,
              WebkitTextStroke: "1.4px rgba(63,36,18,0.55)",
              textShadow: "0 2px 0 rgba(63,36,18,0.22)",
              transform: `rotate(${(i % 2 ? 1 : -1) * 4}deg)`,
            }}
          >
            {ch}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Paper header: menu · LUDO logo · turn banner · sound · Rules · Leave.
 *  `rightSlot` lets the desktop shell dock the room rail inline. */
export function LudoStatusBar({ m, state, rightSlot }: { m: LudoBoardModel; state: LudoState; rightSlot?: ReactNode }) {
  const finished = state.phase === "finished";
  const chip =
    "flex-shrink-0 h-9 px-3 rounded-full flex items-center justify-center text-sm font-bold active:scale-95 transition";
  const chipStyle = { background: "#F7E8C4", border: "2px solid #C8A66B", color: "#6D4323" } as const;
  return (
    <div className="flex items-center flex-wrap gap-2">
      <button
        onClick={() => m.setShowSettings(true)}
        aria-label="Settings"
        title="Settings (theme, color-blind, hover preview)"
        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-lg active:scale-95 transition"
        style={chipStyle}
      >
        ☰
      </button>
      <LudoLogo />
      <div className="flex-1 min-w-[8rem] text-center px-1">
        {finished ? (
          <div className="font-script text-lg font-bold" style={{ color: "#2E7D32" }}>
            🏆 {state.winnerId ? `${m.nameOf(state.winnerId)} wins!` : "Game over"}
          </div>
        ) : m.myTurn ? (
          <>
            <div className="font-script text-sm font-bold leading-tight" style={{ color: "#2E7D32" }}>Your turn</div>
            <div className="font-display text-base leading-tight" style={{ color: "#6D4323" }}>
              {state.turnPhase === "rolling" ? "Roll the dice" : "Pick a token"}
            </div>
          </>
        ) : (
          <div className="font-script text-sm" style={{ color: "#8A6D4B" }}>
            {m.nameOf(state.turnPlayerId)}&rsquo;s turn…
          </div>
        )}
      </div>
      <button onClick={m.toggleSound} className={chip} style={chipStyle} title={m.soundOn ? "Mute" : "Unmute"} aria-label="Toggle sound">
        {m.soundOn ? "🔊" : "🔈"}
      </button>
      <button onClick={() => m.setShowInstructions(true)} className={chip} style={chipStyle} title="How to play">
        ❔ Rules
      </button>
      {m.onLeave && (
        <button
          onClick={m.onLeave}
          className={chip}
          style={{ background: "#D64541", border: "2px solid #A5302C", color: "#fff" }}
          title="Leave room"
        >
          Leave ⇥
        </button>
      )}
      {rightSlot}
    </div>
  );
}

/** Real, in-game per-seat status — no fabricated scores/levels/rewards
 *  (dropped by design). Shows the player's name, seat-colored rim + avatar
 *  ring, a live online dot (isConnected), and 4 pips = tokens home
 *  (finishedCount). The active seat gets a colored glow. */
type LudoSeatMeta = {
  pid: string;
  name: string;
  color: LudoColor;
  online: boolean;
  isBot: boolean;
  tokensHome: number;
  active: boolean;
};

const CARD_COLOR_ORDER: LudoColor[] = ["red", "green", "blue", "yellow"];

function orderedSeats(state: LudoState, players: Player[]): LudoSeatMeta[] {
  const byId = new Map(players.map((p) => [p.id, p]));
  return state.playerOrder
    .map((pid) => {
      const color = state.playerColors[pid];
      const p = byId.get(pid);
      return {
        pid,
        color,
        name: p?.name ?? "Player",
        online: p?.isConnected !== false,
        isBot: p?.isBot === true,
        tokensHome: state.finishedCount?.[pid] ?? 0,
        active: state.turnPlayerId === pid && state.phase !== "finished",
      };
    })
    .filter((s): s is LudoSeatMeta => !!s.color)
    .sort((a, b) => CARD_COLOR_ORDER.indexOf(a.color) - CARD_COLOR_ORDER.indexOf(b.color));
}

function LudoPlayerCard({ seat }: { seat: LudoSeatMeta }) {
  const rim = COLOR_HEX_DARK[seat.color];
  const tint = COLOR_HEX[seat.color];
  return (
    <div
      className="flex-1 min-w-0 flex items-center gap-2 rounded-2xl px-2 py-1.5"
      style={{
        background: "rgba(255,251,240,0.94)",
        border: `2.5px solid ${rim}`,
        boxShadow: seat.active
          ? `0 0 0 3px ${tint}66, 0 6px 14px rgba(0,0,0,0.18)`
          : "0 4px 10px rgba(0,0,0,0.12)",
      }}
    >
      <div className="relative flex-shrink-0 rounded-full" style={{ padding: 2, background: tint }}>
        <Avatar name={seat.name} color={seat.color} size={36} />
        <span
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full"
          style={{ background: seat.online ? "#37B24D" : "#9AA0A6", border: "2px solid #FFFBF0" }}
          title={seat.online ? "Online" : "Away"}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-black text-[12px] uppercase tracking-wide" style={{ color: rim }}>
          {seat.name}
          {seat.isBot && <span className="ml-1 text-[8px] opacity-60">BOT</span>}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="w-2.5 h-2.5 rounded-full"
              style={{
                background: i < seat.tokensHome ? tint : "rgba(109,67,35,0.16)",
                border: `1px solid ${i < seat.tokensHome ? rim : "rgba(109,67,35,0.25)"}`,
              }}
            />
          ))}
          <span className="ml-1 text-[9px] font-bold" style={{ color: "rgba(109,67,35,0.65)" }}>
            {seat.tokensHome}/4 home
          </span>
        </div>
      </div>
    </div>
  );
}

/** A row (or column) of player cards. `row="top"` shows the first half of
 *  the color-ordered seats, `row="bottom"` the rest — 2/2 for a 4-player
 *  game, matching the reference's above/below-board split. `orientation`
 *  is "row" on mobile (cards flow across above/below the board) and "col"
 *  on desktop (cards stack in a side rail flanking the board). */
export function LudoPlayerCards({
  state,
  players,
  row,
  orientation = "row",
}: {
  state: LudoState;
  players: Player[];
  row: "top" | "bottom";
  orientation?: "row" | "col";
}) {
  const seats = orderedSeats(state, players);
  const mid = Math.ceil(seats.length / 2);
  const shown = row === "top" ? seats.slice(0, mid) : seats.slice(mid);
  if (shown.length === 0) return null;
  return (
    <div className={orientation === "col" ? "flex flex-col gap-3" : "flex justify-between gap-2"}>
      {shown.map((s) => (
        <LudoPlayerCard key={s.pid} seat={s} />
      ))}
    </div>
  );
}

/** The bottom roll "cup" — a felt-green dice tray with a rope rim and a
 *  paper ribbon. The whole cup is the roll control (Dice stays visual so we
 *  never nest a button in a button). Streak badge shows the live six-run. */
export function LudoRollTray({ m, state }: { m: LudoBoardModel; state: LudoState }) {
  const streak = state.consecutiveSixes > 0 && state.consecutiveSixes < 3;
  const canRoll = m.myTurn && m.canRoll && !m.rolling;
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={canRoll ? m.roll : undefined}
        disabled={!canRoll}
        aria-label="Roll the dice"
        className="relative rounded-full flex items-center justify-center active:scale-95 transition disabled:cursor-default"
        style={{
          width: 92,
          height: 92,
          background: "radial-gradient(circle at 50% 35%, #57B65B, #2E7D32)",
          border: "5px solid #1B5E20",
          boxShadow: canRoll
            ? "0 0 0 4px rgba(87,182,91,0.4), 0 8px 18px rgba(0,0,0,0.3)"
            : "0 6px 14px rgba(0,0,0,0.22)",
        }}
      >
        <div style={{ width: 58, height: 58 }}>
          <Dice value={state.diceValue} rolling={m.rolling} highlight={canRoll} wooden={m.settings.woodenDice} size="100%" />
        </div>
        {streak && (
          <span
            className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full text-[11px] font-black flex items-center justify-center"
            style={{ background: "#DC2626", color: "#fff", border: "2px solid #FFFBF0" }}
          >
            {state.consecutiveSixes}
          </span>
        )}
      </button>
      <div
        className="px-4 py-0.5 text-[12px] font-black"
        style={{ background: "#F7E8C4", border: "2px solid #C8A66B", color: "#6D4323", borderRadius: 6 }}
      >
        {state.phase === "finished"
          ? "Game over"
          : m.myTurn
          ? state.turnPhase === "rolling"
            ? "Tap to roll"
            : "Pick a token"
          : "Waiting…"}
      </div>
    </div>
  );
}

/** Bottom action bar: Emoji · Voice · [roll cup] · Invite. The side buttons
 *  reuse the room rail's panels via the `bhalyam:open-room-panel` bridge —
 *  no duplicated panel logic. (Reference's "Rewards" is dropped: no rewards
 *  system exists.) */
export function LudoBottomBar({ m, state }: { m: LudoBoardModel; state: LudoState }) {
  const openPanel = (panel: string) =>
    window.dispatchEvent(new CustomEvent("bhalyam:open-room-panel", { detail: { panel } }));
  const NavBtn = ({ label, glyph, panel }: { label: string; glyph: string; panel: string }) => (
    <button type="button" onClick={() => openPanel(panel)} className="flex flex-col items-center gap-0.5" aria-label={label}>
      <span
        className="w-12 h-12 rounded-full flex items-center justify-center text-xl active:scale-95 transition"
        style={{ background: "#F7E8C4", border: "2px solid #C8A66B" }}
      >
        {glyph}
      </span>
      <span className="text-[10px] font-semibold" style={{ color: "#6D4323" }}>{label}</span>
    </button>
  );
  return (
    <div className="flex items-end justify-center gap-3 sm:gap-5">
      <NavBtn label="Emoji" glyph="😊" panel="emoji" />
      <NavBtn label="Voice" glyph="🎙️" panel="voice" />
      <LudoRollTray m={m} state={state} />
      <NavBtn label="Invite" glyph="🔗" panel="room" />
    </div>
  );
}

/**
 * The board wrap: SVG board (cross or polygon), live cursors, hover preview,
 * the token overlay, capture sad-faces and per-home mini-bursts. `maxWidth`
 * is a shell-supplied CSS value so mobile/desktop can size it differently
 * without duplicating the markup.
 */
export function LudoBoardArea({
  m,
  state,
  players,
  maxWidth,
}: {
  m: LudoBoardModel;
  state: LudoState;
  players: Player[];
  maxWidth: string;
}) {
  return (
    <div
      ref={m.boardWrapRef}
      onMouseMove={m.onBoardMouseMove}
      onMouseLeave={() => {
        m.onBoardMouseLeave();
        m.clearHoverPreview();
      }}
      className={`ludo-board relative w-full mx-auto aspect-square select-none rounded-2xl border-4 border-slate-950 bg-white shadow-[0_24px_60px_rgba(0,0,0,0.45)] theme-${m.settings.theme} ${m.settings.highContrast ? "hc" : ""}`}
      style={{ maxWidth }}
    >
      {m.polygonGeo ? (
        <PrintBoardSVG
          geo={m.polygonGeo}
          players={players}
          playerOrder={state.playerOrder}
          playerColors={state.playerColors}
          activeColors={m.activeColors}
          hasCaptured={state.hasCaptured ?? {}}
        />
      ) : (
        <BoardSVG
          playerColorsInRoom={Object.values(state.playerColors)}
          players={players}
          playerOrder={state.playerOrder}
          playerColors={state.playerColors}
          hasCaptured={state.hasCaptured ?? {}}
          unlockBurst={m.unlockBurst}
          registerCard={m.registerPlayerCard}
          selfId={m.selfId}
          finishedCount={state.finishedCount}
        />
      )}
      {/* Live opponent cursors */}
      <CursorLayer
        cursors={Object.values(m.cursors).filter((c) => c.playerId !== m.selfId)}
        players={players}
        playerColors={state.playerColors}
      />
      {/* Hover-preview glow on destination cell */}
      {m.hoverPreview && <HoverPreviewMarker preview={m.hoverPreview} geo={m.polygonGeo} />}

      {/* Token overlay */}
      <div className="absolute inset-0">
        {m.allTokens.map(({ pid, token }) => {
          const pos = m.tokenPosition(pid, token);
          const movable = pid === m.selfId && m.myTurn && state.movableTokenIds.includes(token.id);
          const idx = parseInt(token.id.split("-")[1] ?? "0", 10);
          // Print boards recolor each seat by its arm's flat sector color —
          // tokens must match their yard/lane, not the canonical LudoColor.
          const armIdx = m.polygonGeo
            ? PLAYER_COLORS_ORDER.indexOf(state.playerColors[pid])
            : -1;
          return (
            <Token
              key={token.id}
              color={state.playerColors[pid]}
              hex={armIdx >= 0 ? seatColor(armIdx) : undefined}
              hexDark={armIdx >= 0 ? seatColorDark(armIdx) : undefined}
              left={pos.left}
              top={pos.top}
              size={
                m.polygonGeo
                  ? polygonTokenSize(token.state, m.polygonGeo.cellSize)
                  : token.state === "yard"
                  ? 7
                  : token.state === "home"
                  ? 4.2
                  : 6
              }
              movable={movable}
              onClick={movable ? () => m.move(token.id) : undefined}
              onMouseEnter={() => m.onHoverToken(pid, token)}
              onMouseLeave={m.clearHoverPreview}
              label={String(idx + 1)}
              cbMode={m.settings.colorBlindMode}
              golden={m.settings.goldenTokens}
              celebrating={m.celebratingIds.has(token.id)}
            />
          );
        })}
      </div>
      {/* Capture sad-faces (briefly visible at the victim's last position) */}
      {m.captureFaces.map((cf) => (
        <span key={cf.id} className="capture-face" style={{ left: `${cf.left}%`, top: `${cf.top}%` }}>
          😵
        </span>
      ))}

      {/* Per-home mini confetti bursts */}
      {m.homeBursts.map((b) => (
        <MiniBurst key={b.id} left={b.left} top={b.top} color={b.color} />
      ))}
    </div>
  );
}

/** Every modal/overlay layer the board can show. Mounted once per shell. */
export function LudoOverlays({
  m,
  state,
  players,
}: {
  m: LudoBoardModel;
  state: LudoState;
  players: Player[];
}) {
  return (
    <>
      <TurnTimeWarning deadline={state.turnDeadline} active={m.myTurn && state.phase === "playing"} />
      {m.showInstructions && <InstructionsModal onClose={() => m.setShowInstructions(false)} />}
      {m.showSettings && <SettingsMenu onClose={() => m.setShowSettings(false)} />}
      {m.luckyBanner && (
        <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center">
          <div
            className="lucky-banner bg-gradient-to-r from-amber-500 via-rose-500 to-fuchsia-500 text-white text-2xl font-black px-8 py-4 rounded-2xl shadow-2xl"
            style={{ textShadow: "0 2px 4px rgba(0,0,0,0.4)" }}
          >
            {m.luckyBanner}
          </div>
        </div>
      )}
      {m.cutFlash != null && !m.luckyBanner && (
        <div key={m.cutFlash} className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center">
          <div
            className="ludo-cut-flash bg-gradient-to-r from-rose-600 via-red-500 to-orange-500 text-white text-5xl font-black px-10 py-5 rounded-2xl shadow-2xl"
            style={{ textShadow: "0 3px 8px rgba(0,0,0,0.5)" }}
          >
            💥 CUT!
          </div>
        </div>
      )}
      {m.toast && <Toast text={m.toast.text} emoji={m.toast.emoji} color={m.toast.color} />}
      {!m.reduceMotion && Date.now() < m.confettiUntil && <Confetti />}
      <FloatingReactionsLayer
        reactions={m.reactions}
        anchorOf={m.reactionAnchor}
        playerColors={state.playerColors}
      />
      {!m.reduceMotion &&
        m.rains.map((r) => <EmojiRain key={r.id} emoji={r.emoji} />)}
      {m.showCelebration && state.winnerId && (
        <WinnerCelebration
          winner={
            players.find((p) => p.id === state.winnerId) ??
            { id: state.winnerId, name: "Winner", isHost: false, isReady: false, isConnected: true }
          }
          color={state.playerColors[state.winnerId] ?? "red"}
        />
      )}
      {m.showEndCard && state.phase === "finished" && (
        <EndGameCard
          winnerId={state.winnerId ?? null}
          players={players}
          playerColors={state.playerColors}
          stats={state.stats}
          finishedCount={state.finishedCount}
          onClose={() => m.setShowEndCard(false)}
          onRematch={m.rematch}
        />
      )}
    </>
  );
}
