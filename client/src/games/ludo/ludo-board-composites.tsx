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
import PolygonBoardSVG from "./PolygonBoardSVG";
import { COLOR_HEX } from "./board-layout";
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

export function LudoStatusBar({ m, state }: { m: LudoBoardModel; state: LudoState }) {
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
      <div className="flex items-center gap-1.5">
        <button
          onClick={m.toggleSound}
          className="rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 px-2.5 py-1.5 text-sm transition"
          title={m.soundOn ? "Mute sounds" : "Enable sounds"}
        >
          {m.soundOn ? "🔊" : "🔈"}
        </button>
        <button
          onClick={() => m.setShowSettings(true)}
          className="rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 px-2.5 py-1.5 text-sm transition"
          title="Display settings (theme, color-blind, hover preview)"
        >
          ⚙
        </button>
        <button
          onClick={() => m.setShowInstructions(true)}
          className="rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 px-2.5 py-1.5 text-sm transition"
          title="How to play"
        >
          ❔ Rules
        </button>
      </div>
    </div>
  );
}

export function LudoDiceTray({ m, state }: { m: LudoBoardModel; state: LudoState }) {
  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5 rounded-2xl border border-slate-700/70 bg-slate-950/70 p-3 transition ${
        m.myTurn ? "" : "opacity-60"
      }`}
    >
      <div className="flex flex-col items-center gap-1">
        <span
          className="text-[10px] uppercase tracking-wider font-bold"
          style={{ color: COLOR_HEX[state.playerColors[state.turnPlayerId]] ?? "#94a3b8" }}
        >
          {m.myTurn ? "Your dice" : `${m.nameOf(state.turnPlayerId)}'s dice`}
        </span>
        <Dice value={state.diceValue} rolling={m.rolling} highlight={m.myTurn && m.canRoll} />
      </div>
      {m.myTurn ? (
        <button
          onClick={m.roll}
          disabled={!m.canRoll || m.rolling}
          className="rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-40 px-5 py-3 font-bold transition"
        >
          🎲 Roll
        </button>
      ) : (
        <div className="text-sm text-slate-300 max-w-[12rem]">
          <span className="block font-semibold">{m.nameOf(state.turnPlayerId)}'s turn</span>
          <span className="block text-xs text-slate-400">
            {state.turnPhase === "rolling" ? "Waiting for them to roll…" : "Waiting for them to move…"}
          </span>
        </div>
      )}
      {state.consecutiveSixes > 0 && state.consecutiveSixes < 3 && (
        <span className="text-amber-300 text-xs whitespace-nowrap">
          {state.consecutiveSixes}/3 sixes
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
        <PolygonBoardSVG
          geo={m.polygonGeo}
          players={players}
          playerOrder={state.playerOrder}
          playerColors={state.playerColors}
          activeColors={m.activeColors}
          hasCaptured={state.hasCaptured ?? {}}
          unlockBurst={m.unlockBurst}
        />
      ) : (
        <BoardSVG
          playerColorsInRoom={Object.values(state.playerColors)}
          players={players}
          playerOrder={state.playerOrder}
          playerColors={state.playerColors}
          hasCaptured={state.hasCaptured ?? {}}
          unlockBurst={m.unlockBurst}
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
          return (
            <Token
              key={token.id}
              color={state.playerColors[pid]}
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
      {m.toast && <Toast text={m.toast.text} emoji={m.toast.emoji} color={m.toast.color} />}
      {Date.now() < m.confettiUntil && <Confetti />}
      <FloatingReactionsLayer
        reactions={m.reactions}
        anchorOf={m.reactionAnchor}
        playerColors={state.playerColors}
      />
      {m.rains.map((r) => (
        <EmojiRain key={r.id} emoji={r.emoji} />
      ))}
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
