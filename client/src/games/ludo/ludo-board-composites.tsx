import type { ReactNode } from "react";
import type { LudoState, Player } from "@shared/types";
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
import { COLOR_HEX, PLAYER_COLORS_ORDER } from "./board-layout";
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

export function LudoStatusBar({ m, state, rightSlot }: { m: LudoBoardModel; state: LudoState; rightSlot?: ReactNode }) {
  return (
    <div className="flex justify-between items-center flex-wrap gap-2">
      <h2 className="text-xl font-black tracking-tight">Ludo</h2>
      <div className="text-sm flex-1 text-center px-2">
        {state.phase === "finished" ? (
          <span className="text-emerald-300 font-semibold">
            🏆 {state.winnerId ? `${m.nameOf(state.winnerId)} wins!` : "Game over"}
          </span>
        ) : m.myTurn ? (
          <span className="text-emerald-300">
            Your turn — {state.turnPhase === "rolling" ? "roll the dice 🎲" : "pick a token"}
          </span>
        ) : (
          <span className="text-slate-400">Waiting for {m.nameOf(state.turnPlayerId)}…</span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap justify-end">
        {rightSlot && (
          <div className="rounded-full bg-slate-900/55 border border-slate-700/60 px-1.5 py-1">
            {rightSlot}
          </div>
        )}

        <div className="h-6 w-px bg-slate-600/60" aria-hidden />

        <div className="inline-flex items-center rounded-xl bg-slate-900/75 border border-slate-700/70 overflow-hidden">
          {m.onLeave && (
            <button
              onClick={m.onLeave}
              className="px-3 py-1.5 text-sm font-semibold text-rose-200 hover:bg-rose-900/40 active:scale-95 transition"
              title="Leave room"
            >
              Leave
            </button>
          )}
          <div className="h-5 w-px bg-slate-600/60" aria-hidden />
          <button
            onClick={m.toggleSound}
            className="px-2.5 py-1.5 text-sm text-slate-100 hover:bg-slate-700/80 active:scale-95 transition"
            title={m.soundOn ? "Mute sounds" : "Enable sounds"}
          >
            {m.soundOn ? "🔊" : "🔈"}
          </button>
          <div className="h-5 w-px bg-slate-600/60" aria-hidden />
          <button
            onClick={() => m.setShowSettings(true)}
            className="px-2.5 py-1.5 text-sm text-slate-100 hover:bg-slate-700/80 active:scale-95 transition"
            title="Display settings (theme, color-blind, hover preview)"
          >
            ⚙
          </button>
          <div className="h-5 w-px bg-slate-600/60" aria-hidden />
          <button
            onClick={() => m.setShowInstructions(true)}
            className="px-2.5 py-1.5 text-sm text-slate-100 hover:bg-slate-700/80 active:scale-95 transition"
            title="How to play"
          >
            ❔ Rules
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The dice "sits on the board" - a compact overlay pinned to the board's
 * center cross (the same spot a physical Ludo board's home triangles meet),
 * not a separate bordered toolbar above/beside the felt. Turn text already
 * lives in LudoStatusBar, so this stays purely the dice (now the roll control itself) + streak.
 */
export function LudoDiceTray({ m, state }: { m: LudoBoardModel; state: LudoState }) {
  const sixesActive = state.consecutiveSixes > 0 && state.consecutiveSixes < 3;
  const traySize = m.polygonGeo
    ? "clamp(36px, 8.5%, 64px)"
    : "clamp(44px, 12%, 92px)";
  return (
    <div
      className="absolute left-1/2 top-1/2 z-30 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5 pointer-events-none"
      style={{ width: traySize }}
    >
      <div className="pointer-events-auto w-full" style={{ aspectRatio: "1" }}>
        <Dice
          value={state.diceValue}
          rolling={m.rolling}
          highlight={m.myTurn && m.canRoll}
          wooden={m.settings.woodenDice}
          size="100%"
          onClick={m.canRoll && !m.rolling ? m.roll : undefined}
        />
      </div>
      {sixesActive && (
        <span className="pointer-events-auto rounded-full bg-amber-200/95 border border-amber-500 px-2.5 py-1 text-[11px] font-extrabold text-amber-900 shadow">
          Six streak {state.consecutiveSixes}/3
        </span>
      )}
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

      {/* The dice "sits on" the board's center cross like a real board. */}
      <LudoDiceTray m={m} state={state} />

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
