import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

/* ──────────────────────────────────────────────────────────────────────────
 * GameArena — premium mobile-first responsive shell.
 *
 * Wraps a vector game board (LudoBoard today, others later) inside a
 * thumb-driven UI shell tuned for iOS Safari + Android Chrome:
 *
 *   - Locks the viewport so rubber-banding, pinch-to-zoom, and accidental
 *     pull-to-refresh never interrupt the game.
 *   - Scales the board with `max-w-[min(90vw,90vh)] aspect-square` so it
 *     stays fully visible on short devices (iPhone SE) without warping on
 *     tall ones (Pixel 9 Pro XL).
 *   - Pushes ALL high-frequency controls (player list + ROLL DICE) into a
 *     glass dashboard within the bottom thumb-reach zone.
 *
 * Demo / wiring:
 *   - Drop a real <LudoBoard /> as `children`. Without it, a placeholder
 *     concentric-rings board renders so the shell is previewable cold.
 *   - The internal `activeTurn` + `playerCount` useState pair makes the
 *     ROLL DICE interaction work end-to-end without props. When you wire
 *     this to live game state, feed the real turn via `controlledActiveId`
 *     and the real roster via `controlledPlayers` — the dashboard switches
 *     to controlled mode automatically.
 * ───────────────────────────────────────────────────────────────────────── */

export interface ArenaPlayer {
  id: string;
  name: string;
  /** Hex string — the player's seat colour. */
  color: string;
  /** Optional avatar / initial override. Defaults to first letter of name. */
  initial?: string;
}

const DEMO_COLORS = [
  "#ef4444", // ruby
  "#3b82f6", // sapphire
  "#10b981", // emerald
  "#f59e0b", // topaz
  "#a855f7", // amethyst
  "#ec4899", // rose
  "#14b8a6", // turquoise
  "#fb7185", // coral
];

function buildDemoPlayers(count: number): ArenaPlayer[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `demo-p${i + 1}`,
    name: `Player ${i + 1}`,
    color: DEMO_COLORS[i % DEMO_COLORS.length],
  }));
}

export default function GameArena({
  children,
  roomCode = "TABLE-ARENA",
  onLeave,
  onRollDice,
  controlledPlayers,
  controlledActiveId,
  defaultPlayerCount = 4,
}: {
  children?: ReactNode;
  roomCode?: string;
  onLeave?: () => void;
  onRollDice?: () => void;
  controlledPlayers?: ArenaPlayer[];
  controlledActiveId?: string;
  defaultPlayerCount?: number;
}) {
  // -------- Dummy state (demo when no controlled props) -----------
  const [activeTurn, setActiveTurn] = useState(0);
  const [playerCount, setPlayerCount] = useState(defaultPlayerCount);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const [diceFlash, setDiceFlash] = useState(false);
  const rollTimer = useRef<number | null>(null);

  const isControlled = !!controlledPlayers;
  const players = useMemo<ArenaPlayer[]>(
    () => controlledPlayers ?? buildDemoPlayers(playerCount),
    [controlledPlayers, playerCount],
  );
  const activeIndex = isControlled
    ? Math.max(0, players.findIndex((p) => p.id === controlledActiveId))
    : activeTurn;
  const activePlayer = players[activeIndex] ?? players[0];

  // Cleanup tumble timer on unmount.
  useEffect(() => {
    return () => {
      if (rollTimer.current !== null) window.clearTimeout(rollTimer.current);
    };
  }, []);

  function handleRoll() {
    if (rolling) return;
    setRolling(true);
    setDiceFlash(true);
    setDiceValue(null);
    onRollDice?.();
    let ticks = 0;
    const tick = () => {
      setDiceValue(1 + Math.floor(Math.random() * 6));
      ticks += 1;
      if (ticks >= 8) {
        rollTimer.current = window.setTimeout(() => {
          setRolling(false);
          if (!isControlled) {
            setActiveTurn((t) => (t + 1) % Math.max(1, players.length));
          }
          window.setTimeout(() => setDiceFlash(false), 200);
        }, 250);
        return;
      }
      rollTimer.current = window.setTimeout(tick, 60 + ticks * 18);
    };
    tick();
  }

  return (
    <div
      // Lock the viewport. `touch-none` kills double-tap zoom + pinch +
      // pull-to-refresh on iOS; `overflow-hidden` blocks Safari rubber-band.
      // We DO allow `pan-x` selectively below on the player roster so it
      // can be flick-scrolled — `touch-none` only applies to this root.
      className="fixed inset-0 overflow-hidden select-none touch-none
                 bg-slate-950 text-white antialiased"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at 50% -10%, rgba(99,102,241,0.18) 0%, transparent 45%)," +
          "radial-gradient(ellipse at 50% 110%, rgba(16,185,129,0.12) 0%, transparent 45%)," +
          "linear-gradient(180deg, #020617 0%, #0b1220 100%)",
      }}
    >
      {/* Decorative mesh dots — sub-1% opacity, GPU-cheap */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.045]"
        style={{
          backgroundImage:
            "radial-gradient(circle, white 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <ArenaHeader
        roomCode={roomCode}
        activePlayer={activePlayer}
        onLeave={onLeave}
      />

      <BoardZone>
        {children ?? <PlaceholderBoard players={players} />}
      </BoardZone>

      <BottomDashboard
        players={players}
        activeIndex={activeIndex}
        diceValue={diceValue}
        rolling={rolling}
        diceFlash={diceFlash}
        onRoll={handleRoll}
        playerCount={playerCount}
        setPlayerCount={isControlled ? undefined : setPlayerCount}
      />
    </div>
  );
}

/* ───────────────────────────── Header ───────────────────────────── */

function ArenaHeader({
  roomCode,
  activePlayer,
  onLeave,
}: {
  roomCode: string;
  activePlayer?: ArenaPlayer;
  onLeave?: () => void;
}) {
  return (
    <header
      className="absolute top-0 left-0 right-0 h-14
                 flex items-center justify-between gap-2 px-3
                 z-20"
    >
      <button
        onClick={onLeave}
        className="h-10 w-10 rounded-full flex items-center justify-center
                   bg-slate-900/80 backdrop-blur-md border border-white/10
                   text-rose-300 hover:text-rose-200
                   active:scale-95 transition-all duration-150"
        aria-label="Leave game"
      >
        <LeaveIcon className="w-5 h-5" />
      </button>

      <div
        className="px-3 py-1.5 rounded-full
                   bg-slate-900/80 backdrop-blur-md border border-white/10
                   inline-flex items-center gap-2 font-mono text-xs font-bold tracking-widest"
      >
        <DotIcon className="w-2 h-2 text-emerald-400 animate-pulse" />
        <span className="text-slate-300">ROOM</span>
        <span className="text-white">{roomCode}</span>
      </div>

      <div className="h-10 min-w-10 px-3 rounded-full bg-slate-900/80 backdrop-blur-md
                      border border-white/10 inline-flex items-center gap-2">
        <span
          className="inline-flex w-6 h-6 rounded-full items-center justify-center
                     text-[10px] font-black text-slate-950"
          style={{
            background: activePlayer?.color ?? "#64748b",
            boxShadow: `0 0 10px ${activePlayer?.color ?? "#64748b"}aa`,
          }}
          aria-hidden
        >
          {(activePlayer?.initial ?? activePlayer?.name?.[0] ?? "?").toUpperCase()}
        </span>
        <span className="text-[10px] font-bold tracking-widest text-slate-300 uppercase">
          On move
        </span>
      </div>
    </header>
  );
}

/* ───────────────────────────── Board zone ───────────────────────────── */

function BoardZone({ children }: { children: ReactNode }) {
  return (
    <main
      className="absolute left-0 right-0 flex items-center justify-center px-3
                 z-10"
      style={{
        top: "3.5rem", // header height
        // Reserve room for the dashboard below. Bottom 30% of viewport is the
        // thumb-reach zone; we cap at 240px so on very tall screens the
        // dashboard doesn't grow comically large.
        bottom: "clamp(180px, 30dvh, 240px)",
      }}
    >
      <div
        className="relative w-full aspect-square
                   max-w-[min(90vw,90vh)]
                   rounded-3xl border border-white/10
                   overflow-hidden"
        style={{
          background:
            "radial-gradient(circle at 50% 30%, rgba(15,23,42,0.4) 0%, rgba(2,6,23,0.9) 80%)",
          boxShadow:
            "0 30px 80px -20px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.03)",
        }}
      >
        {children}
      </div>
    </main>
  );
}

/* ───────────────────────────── Bottom dashboard ───────────────────────────── */

function BottomDashboard({
  players,
  activeIndex,
  diceValue,
  rolling,
  diceFlash,
  onRoll,
  playerCount,
  setPlayerCount,
}: {
  players: ArenaPlayer[];
  activeIndex: number;
  diceValue: number | null;
  rolling: boolean;
  diceFlash: boolean;
  onRoll: () => void;
  playerCount: number;
  setPlayerCount?: (n: number) => void;
}) {
  const activePlayer = players[activeIndex];
  return (
    <footer
      className="absolute left-0 right-0 bottom-0
                 backdrop-blur-md bg-slate-900/90 border-t border-white/10
                 z-20"
      // Respect iOS home-bar safe area
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="px-3 pt-3 pb-2 space-y-3">
        {/* ----- Active player banner ----- */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Turn
            </span>
            <span
              className="text-sm font-bold truncate"
              style={{ color: activePlayer?.color ?? "#fff" }}
            >
              {activePlayer?.name ?? "—"}
            </span>
          </div>

          {/* Optional demo control: cycle through player counts.
              Only rendered when uncontrolled. */}
          {setPlayerCount && (
            <PlayerCountStepper count={playerCount} setCount={setPlayerCount} />
          )}
        </div>

        {/* ----- Horizontal player roster (touch-scrollable) ----- */}
        <PlayerRoster players={players} activeIndex={activeIndex} />

        {/* ----- ROLL DICE primary action ----- */}
        <RollDiceButton
          onClick={onRoll}
          disabled={rolling}
          rolling={rolling}
          diceValue={diceValue}
          flash={diceFlash}
          accentColor={activePlayer?.color ?? "#10b981"}
        />
      </div>
    </footer>
  );
}

function PlayerCountStepper({
  count,
  setCount,
}: {
  count: number;
  setCount: (n: number) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/70
                    border border-white/10 px-2 py-1">
      <button
        onClick={() => setCount(Math.max(2, count - 1))}
        className="w-5 h-5 rounded-full bg-slate-700 text-white text-xs font-black
                   active:scale-95 transition-all duration-150 flex items-center justify-center"
        aria-label="Decrease players"
      >
        −
      </button>
      <span className="text-[10px] font-bold tracking-widest text-slate-300 tabular-nums">
        {count} SEATS
      </span>
      <button
        onClick={() => setCount(Math.min(8, count + 1))}
        className="w-5 h-5 rounded-full bg-slate-700 text-white text-xs font-black
                   active:scale-95 transition-all duration-150 flex items-center justify-center"
        aria-label="Increase players"
      >
        +
      </button>
    </div>
  );
}

function PlayerRoster({
  players,
  activeIndex,
}: {
  players: ArenaPlayer[];
  activeIndex: number;
}) {
  return (
    <div
      // Horizontal touch scroll. `pan-x` re-enables horizontal panning that
      // the parent's `touch-none` blanket disables. `overscroll-x-contain`
      // prevents back-swipe gesture hijack on iOS.
      className="overflow-x-auto overscroll-x-contain
                 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ touchAction: "pan-x" }}
    >
      <ul className="flex items-center gap-2 min-w-min">
        {players.map((p, i) => (
          <PlayerChip key={p.id} player={p} active={i === activeIndex} />
        ))}
      </ul>
    </div>
  );
}

function PlayerChip({ player, active }: { player: ArenaPlayer; active: boolean }) {
  const initial = (player.initial ?? player.name[0] ?? "?").toUpperCase();
  return (
    <li
      className={`relative flex-shrink-0 rounded-2xl px-2.5 py-1.5
                  flex items-center gap-2 border transition-all duration-200
                  ${active
                    ? "bg-slate-800/90 border-white/20 scale-[1.04]"
                    : "bg-slate-800/40 border-white/10 scale-100 opacity-80"}`}
      style={{
        boxShadow: active ? `0 0 28px ${player.color}55` : undefined,
      }}
    >
      {active && (
        <span
          aria-hidden
          className="absolute -inset-0.5 rounded-2xl pointer-events-none animate-pulse"
          style={{
            boxShadow: `0 0 0 2px ${player.color}, 0 0 22px ${player.color}88`,
          }}
        />
      )}
      <span
        className="relative w-8 h-8 rounded-full inline-flex items-center justify-center
                   text-xs font-black text-slate-950 flex-shrink-0"
        style={{
          background: `linear-gradient(135deg, ${player.color}, ${shade(player.color, -0.25)})`,
        }}
      >
        {initial}
      </span>
      <span className="relative text-xs font-bold whitespace-nowrap pr-1
                       max-w-[7rem] truncate text-slate-100">
        {player.name}
      </span>
    </li>
  );
}

function RollDiceButton({
  onClick,
  disabled,
  rolling,
  diceValue,
  flash,
  accentColor,
}: {
  onClick: () => void;
  disabled: boolean;
  rolling: boolean;
  diceValue: number | null;
  flash: boolean;
  accentColor: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label="Roll the dice"
      className={`relative w-full h-16 rounded-2xl
                  flex items-center justify-center gap-3
                  font-black tracking-widest text-base uppercase
                  border border-white/15
                  active:scale-95 transition-all duration-150
                  disabled:cursor-wait
                  text-white`}
      style={{
        background: rolling
          ? "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(2,6,23,1))"
          : `linear-gradient(135deg, ${accentColor}, ${shade(accentColor, -0.35)})`,
        boxShadow: flash
          ? `0 0 0 3px ${accentColor}55, 0 16px 36px -8px ${accentColor}66`
          : `0 12px 28px -8px ${accentColor}55`,
      }}
    >
      <DiceFace value={diceValue ?? 0} rolling={rolling} />
      <span>{rolling ? "Rolling…" : "Roll Dice"}</span>
      {!rolling && diceValue !== null && (
        <span
          className="absolute right-4 top-1/2 -translate-y-1/2
                     w-9 h-9 rounded-full bg-white/95 text-slate-900
                     inline-flex items-center justify-center font-black text-base
                     tabular-nums shadow-md"
        >
          {diceValue}
        </span>
      )}
    </button>
  );
}

function DiceFace({ value, rolling }: { value: number; rolling: boolean }) {
  // 3x3 pip grid. Each position is true if the die face shows a pip there.
  // Positions:  0 1 2
  //             3 4 5
  //             6 7 8
  const pipPositions: Record<number, number[]> = {
    0: [],
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  const pips = pipPositions[Math.max(0, Math.min(6, value))] ?? [];
  return (
    <span
      className={`relative inline-flex w-10 h-10 rounded-md
                  bg-white/95 ring-1 ring-black/10 ${rolling ? "animate-spin" : ""}`}
      aria-hidden
    >
      <span className="absolute inset-1 grid grid-cols-3 grid-rows-3 gap-[2px]">
        {Array.from({ length: 9 }).map((_, i) => (
          <span
            key={i}
            className={`rounded-full ${
              pips.includes(i) ? "bg-slate-900" : "bg-transparent"
            }`}
          />
        ))}
      </span>
    </span>
  );
}

/* ───────────────────────────── Placeholder board ───────────────────────────── */

function PlaceholderBoard({ players }: { players: ArenaPlayer[] }) {
  // Renders four (or N) seat-coloured rings so the shell is visually complete
  // when no real <LudoBoard /> is mounted. Pure SVG — no extra deps.
  const colors = players.slice(0, 4).map((p) => p.color);
  while (colors.length < 4) colors.push("#475569");
  return (
    <svg
      viewBox="0 0 100 100"
      className="absolute inset-0 w-full h-full"
      aria-hidden
    >
      <defs>
        <radialGradient id="bgGlow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="rgba(99,102,241,0.18)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill="url(#bgGlow)" />
      {/* Four corner yards */}
      <rect x="6"  y="6"  width="32" height="32" rx="5" fill={colors[0]} fillOpacity="0.18" stroke={colors[0]} strokeWidth="0.6" />
      <rect x="62" y="6"  width="32" height="32" rx="5" fill={colors[1]} fillOpacity="0.18" stroke={colors[1]} strokeWidth="0.6" />
      <rect x="6"  y="62" width="32" height="32" rx="5" fill={colors[2]} fillOpacity="0.18" stroke={colors[2]} strokeWidth="0.6" />
      <rect x="62" y="62" width="32" height="32" rx="5" fill={colors[3]} fillOpacity="0.18" stroke={colors[3]} strokeWidth="0.6" />
      {/* Cross arms */}
      <rect x="40" y="6"  width="20" height="88" fill="rgba(255,255,255,0.04)" />
      <rect x="6"  y="40" width="88" height="20" fill="rgba(255,255,255,0.04)" />
      {/* Center home */}
      <polygon points="50,42 58,50 50,58 42,50" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.18)" strokeWidth="0.4" />
      <text x="50" y="52" textAnchor="middle" fontSize="3.5"
            fontWeight="900" fill="rgba(255,255,255,0.5)"
            style={{ letterSpacing: "0.2em" }}>
        LUDO
      </text>
    </svg>
  );
}

/* ───────────────────────────── Icons ───────────────────────────── */

type IconProps = { className?: string };

function LeaveIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </svg>
  );
}

function DotIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 8 8" className={className} aria-hidden>
      <circle cx="4" cy="4" r="4" fill="currentColor" />
    </svg>
  );
}

/* ───────────────────────────── Utility ───────────────────────────── */

/** Lighten (amt > 0) or darken (amt < 0) a hex color in sRGB. */
function shade(hex: string, amt: number): string {
  const m = hex.replace("#", "").match(/.{2}/g);
  if (!m || m.length < 3) return hex;
  const [r, g, b] = m.map((h) => parseInt(h, 16));
  const adj = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v + 255 * amt)));
  return (
    "#" +
    [adj(r), adj(g), adj(b)]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}
