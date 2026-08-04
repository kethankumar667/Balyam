import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ChatMessage,
  LudoColor,
  LudoEvent,
  LudoState,
  LudoToken,
  Player,
  ReactionRecvPayload,
  CursorRecvPayload,
} from "@shared/types";
import { getSocket } from "../../lib/socket";
import { useHaptics, useTurnHaptics } from "../../hooks/useHaptics";
import { type RemoteCursor } from "./CursorLayer";
import { useLudoSettings, prefersReducedMotion, type LudoSettings } from "./settings";
import { predictDestination } from "./predict";
import { sfx, setSoundEnabled, isSoundEnabled } from "./sound";
import { computeStepPath, isSameTokenState } from "./animation";
import { getPrintBoard, type PrintBoardGeometry } from "./print-board";
import { DICE_ROLL_MS } from "./Dice";
import { ROLL_COOLDOWN_MS, stepMsFor } from "@shared/ludo-pacing";
import {
  COLOR_HEX,
  HOME_SLOTS,
  STRETCH_CELLS,
  TRACK_CELLS,
  YARD_CELLS,
  PLAYER_COLORS_ORDER,
} from "./board-layout";
import { cellToPct, fanSlot, type LudoHoverPreview } from "./ludo-board-shared";

/**
 * Shared props for every Ludo shell (picker, mobile, desktop). Identical to
 * what Room.tsx forwards (selfId may be a pass-and-play proxy id).
 */
export interface LudoBoardProps {
  state: LudoState;
  players: Player[];
  selfId: string | null;
  messages: ChatMessage[];
  roomCode: string;
  roomPhase: string;
  onLeave?: () => void;
}

export type LudoToast = { text: string; emoji: string; color?: string };
export type LudoCaptureFace = { id: string; left: number; top: number };
export type LudoHomeBurst = { id: string; left: number; top: number; color: LudoColor };
/** Identity of the cell a token occupies, for stack detection. Track cells are
 *  global (any player can share one); stretch cells belong to a single colour.
 *  Yard/home return null — those slots are indexed per token and never
 *  collide. */
function stackKeyOf(token: LudoToken, color: LudoColor): string | null {
  if (token.state === "track" && token.trackPos != null) return `t:${token.trackPos}`;
  if (token.state === "stretch" && token.stretchPos != null) return `s:${color}:${token.stretchPos}`;
  return null;
}

/** Screen angle (clockwise from up, matching print-board's `P()`) of each
 *  cross-board yard quadrant: red top-left, green top-right, yellow
 *  bottom-right, blue bottom-left. Only these four ever appear on a 2-4 player
 *  board — the engine hands out `PLAYER_COLORS_ORDER.slice(0, n)`. */
const CROSS_YARD_ANGLE: Partial<Record<LudoColor, number>> = {
  red: 315,
  green: 45,
  yellow: 135,
  blue: 225,
};

export type LudoTokenPos = {
  left: number;
  top: number;
  /** <1 when this token shares its cell — see `fanSlot`. */
  scale?: number;
};

/**
 * Everything both Ludo shells render. Named contract (no ReturnType<>) so the
 * shared presentational components can consume it by importing this type.
 */
export interface LudoBoardModel {
  selfId: string | null;
  myTurn: boolean;
  canRoll: boolean;
  rolling: boolean;
  /** Turn owner/phase for ANNOUNCEMENTS — held at the previous value while
   *  the dice is still tumbling so the banner never names the next player
   *  before you have seen your own result. Never gate controls on these. */
  displayTurnPlayerId: string;
  displayTurnPhase: LudoState["turnPhase"];
  displayMyTurn: boolean;
  showInstructions: boolean;
  setShowInstructions: (v: boolean) => void;
  showSettings: boolean;
  setShowSettings: (v: boolean) => void;
  settings: LudoSettings;
  reduceMotion: boolean;
  soundOn: boolean;
  toggleSound: () => void;
  toast: LudoToast | null;
  confettiUntil: number;
  reactions: ReactionRecvPayload[];
  reactionAnchor: (playerId: string) => { left: number; top: number } | null;
  registerPlayerCard: (playerId: string, el: Element | null) => void;
  /** Aim a reaction at another player (opens the emoji tray targeted). */
  targetPlayer: (playerId: string) => void;
  rains: { id: string; emoji: string }[];
  cursors: Record<string, RemoteCursor>;
  boardWrapRef: React.RefObject<HTMLDivElement>;
  onBoardMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  onBoardMouseLeave: () => void;
  showCelebration: boolean;
  showEndCard: boolean;
  setShowEndCard: (v: boolean) => void;
  rematch: () => void;
  captureFaces: LudoCaptureFace[];
  homeBursts: LudoHomeBurst[];
  celebratingIds: Set<string>;
  hoverPreview: LudoHoverPreview | null;
  onHoverToken: (pid: string, token: LudoToken) => void;
  clearHoverPreview: () => void;
  luckyBanner: string | null;
  cutFlash: number | null;
  unlockBurst: Record<string, number>;
  allTokens: { pid: string; token: LudoToken }[];
  playerCount: number;
  usePolygon: boolean;
  activeColors: LudoColor[];
  /** Board ARM per player — geometry. */
  arms: Record<string, LudoColor>;
  /** Arm -> the color its occupant is painted in. Unoccupied arms are absent
   *  and keep their own color, so an empty wedge still reads as a wedge. */
  armPaint: Partial<Record<LudoColor, LudoColor>>;
  polygonGeo: PrintBoardGeometry | null;
  /** Degrees the board view is spun so the local player sits at the bottom. */
  boardRotation: number;
  tokenPosition: (pid: string, token: LudoToken) => LudoTokenPos;
  nameOf: (id: string) => string;
  roll: () => void;
  move: (tokenId: string) => void;
  onLeave?: () => void;
}
/**
 * useLudoBoard — the entire Ludo board logic, layout-free.
 *
 * Mounted exactly once (in whichever shell the picker selects). Owns the dice
 * roll cooldown, the step-by-step token animation engine (per-token timers),
 * the reaction/cursor socket listeners, the capture/home/celebration sequences
 * and every derived value. The declaration order mirrors the original
 * single-file board so the effect/closure dependency relationships are
 * preserved verbatim.
 */
export function useLudoBoard({
  state,
  players,
  selfId,
  onLeave,
  // messages/roomCode/roomPhase are forwarded to InlineRoomRail by the shells.
}: LudoBoardProps): LudoBoardModel {
  /**
   * The board ARM a player sits on — the key for ALL geometry (track start,
   * home stretch, yard slots, token ids, board rotation). Distinct from
   * `state.playerColors`, which is now purely the color they are painted in
   * and may be any of the 8 even on a four-arm board.
   *
   * Falls back to the paint color for states produced before the split, where
   * the two were the same field.
   */
  const armOf = (pid: string): LudoColor => state.playerArms?.[pid] ?? state.playerColors[pid];

  const myTurn = state.turnPlayerId === selfId;
  // Brief settle gap between consecutive rolls — see ROLL_COOLDOWN_MS.
  const [rollCooldown, setRollCooldown] = useState(false);
  const prevTurnIdRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevTurnIdRef.current;
    prevTurnIdRef.current = state.turnPlayerId;
    if (prev !== null && prev !== state.turnPlayerId) {
      setRollCooldown(true);
      const t = window.setTimeout(() => setRollCooldown(false), ROLL_COOLDOWN_MS);
      return () => window.clearTimeout(t);
    }
  }, [state.turnPlayerId]);
  const canRoll =
    myTurn &&
    state.turnPhase === "rolling" &&
    state.phase === "playing" &&
    !rollCooldown;
  useTurnHaptics(state.phase === "playing" ? state.turnPlayerId : null, selfId);
  const haptics = useHaptics();

  /**
   * Roll animation, driven by a roll COUNTER rather than the dice value.
   *
   * This used to fire on `state.diceValue !== prev`, which silently skipped
   * the animation whenever a roll repeated the previous number — and in Ludo
   * that is not an edge case: rolling a 6 grants another turn, so back-to-back
   * 6s are routine, and the die simply sat there showing a stale face while
   * play carried on. Any repeated value (4 then 4) did the same.
   *
   * `rollCount` is per-player and monotonic, so its sum changes on EVERY roll
   * by anyone, regardless of what came up.
   */
  const rollTick = useMemo(
    () =>
      Object.values(state.stats?.rollCount ?? {}).reduce<number>((a, b) => a + b, 0),
    [state.stats?.rollCount],
  );
  const [rolling, setRolling] = useState(false);
  const prevRollTick = useRef(rollTick);
  useEffect(() => {
    if (rollTick === prevRollTick.current) return;
    prevRollTick.current = rollTick;
    setRolling(true);
    const t = setTimeout(() => setRolling(false), DICE_ROLL_MS);
    return () => clearTimeout(t);
  }, [rollTick]);

  /**
   * Turn identity for ANNOUNCEMENTS only, held still until the dice settles.
   *
   * A roll that isn't a 6 passes play immediately, and the server sends the
   * new dice value and the new turn owner in the SAME state update. The dice
   * then tumbles locally for DICE_ROLL_MS — so every banner had already
   * switched to the next player before you were shown the number that took
   * your turn away. It read as the game skipping you, which is exactly what
   * the player reported ("status message was coming before the dice result").
   *
   * `rolling` alone cannot gate this: it is set by an effect, so the render
   * that first carries the new turn still has `rolling === false` and would
   * flash the next player for a frame — and would also poison the held value.
   * Comparing against `prevDice` (which the effect above advances) detects the
   * change during that very render instead.
   *
   * Controls are deliberately NOT gated on this: `myTurn` / `canRoll` stay
   * live, so nothing becomes less responsive. Only the words wait.
   */
  const diceChanging = rollTick !== prevRollTick.current;
  const settlingDice = rolling || diceChanging;
  const settledTurn = useRef({ pid: state.turnPlayerId, phase: state.turnPhase });
  if (!settlingDice) settledTurn.current = { pid: state.turnPlayerId, phase: state.turnPhase };
  const displayTurnPlayerId = settlingDice ? settledTurn.current.pid : state.turnPlayerId;
  const displayTurnPhase = settlingDice ? settledTurn.current.phase : state.turnPhase;
  const displayMyTurn = displayTurnPlayerId === selfId;

  const LUDO_TUTORIAL_KEY = "ludo.tutorial.completed.v1";
  const [showInstructions, setShowInstructionsRaw] = useState<boolean>(() => {
    // Auto-open "How to play" once per browser — parity with every other game.
    try {
      return localStorage.getItem(LUDO_TUTORIAL_KEY) !== "1";
    } catch {
      return false;
    }
  });
  const setShowInstructions = useCallback(
    (v: boolean) => {
      // Closing it (auto-opened or via the Rules button) marks it seen so it
      // won't auto-open again — same contract as the shared GameTutorial.
      if (!v) {
        try {
          localStorage.setItem(LUDO_TUTORIAL_KEY, "1");
        } catch {
          /* localStorage unavailable — silent */
        }
      }
      setShowInstructionsRaw(v);
    },
    [],
  );
  const [showSettings, setShowSettings] = useState(false);
  const [settings] = useLudoSettings();
  const reduceMotion = prefersReducedMotion(settings);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [toast, setToast] = useState<LudoToast | null>(null);
  const [confettiUntil, setConfettiUntil] = useState<number>(0);
  const [cutFlash, setCutFlash] = useState<number | null>(null);

  // React to server events: play sound, show toast, confetti on win
  const lastEventTs = useRef<number>(0);
  useEffect(() => {
    const e: LudoEvent | null = state.lastEvent;
    if (!e || e.ts <= lastEventTs.current) return;
    lastEventTs.current = e.ts;
    handleEvent(e);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.lastEvent?.ts]);

  function handleEvent(e: LudoEvent): void {
    const byName = e.byPlayerId ? nameOf(e.byPlayerId) : "";
    const victimName = e.victimPlayerId ? nameOf(e.victimPlayerId) : "";
    const byColor = e.byPlayerId ? COLOR_HEX[state.playerColors[e.byPlayerId]] : undefined;
    switch (e.kind) {
      case "capture":
        if (soundOn) sfx.capture();
        setCutFlash(e.ts);
        setToast({
          text: `${byName} captured ${victimName}'s token! Home column unlocked 🔓`,
          emoji: "💥",
          color: byColor,
        });
        break;
      case "home":
        if (soundOn) sfx.home();
        setToast({ text: `${byName} brought a token home!`, emoji: "🏠", color: byColor });
        break;
      case "win":
        if (soundOn) sfx.win();
        haptics.win();
        setConfettiUntil(Date.now() + 5000);
        setToast({ text: `${byName} wins the game! 🎉`, emoji: "🏆", color: byColor });
        break;
      case "forfeit":
        setToast({ text: `${byName} rolled three 6s — turn forfeited`, emoji: "⛔", color: byColor });
        break;
      case "noMove":
        setToast({ text: `${byName} couldn't move — turn passed`, emoji: "↪", color: byColor });
        break;
    }
  }

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(id);
  }, [toast]);

  /**
   * Announce departures.
   *
   * `RoomManager.leaveRoom` deletes the player and re-broadcasts the room, so
   * a seat simply vanished from the table with no explanation — mid-game that
   * looks like a rendering glitch, and the remaining players have no idea why
   * the turn order suddenly changed.
   *
   * Derived from the roster rather than a new socket event: the removal is
   * already in the broadcast, so every client (including one that reconnects
   * a moment later) reaches the same conclusion without new server surface.
   * Bots are skipped — the host removing a bot in the lobby is not news.
   */
  const knownPlayersRef = useRef<Map<string, { name: string; isBot: boolean }> | null>(null);
  useEffect(() => {
    const now = new Map(
      players.map((p) => [p.id, { name: p.name, isBot: p.isBot === true }] as const),
    );
    const before = knownPlayersRef.current;
    knownPlayersRef.current = now;
    // Skip the first roster we ever see: everyone would look "new".
    if (!before || before.size === 0) return;
    const goneNames: string[] = [];
    for (const [id, info] of before) {
      if (!now.has(id) && id !== selfId && !info.isBot) goneNames.push(info.name);
    }
    if (goneNames.length === 0) return;
    const label =
      goneNames.length === 1
        ? `${goneNames[0]} left the game`
        : `${goneNames.length} players left the game`;
    setToast({ text: label, emoji: "🚪", color: "#8A6D4B" });
  }, [players, selfId]);

  // Auto-clear the capture "CUT!" callout (the lucky banner takes over the
  // center for the rarer 6-then-capture case — see render guard).
  useEffect(() => {
    if (cutFlash == null) return;
    const id = setTimeout(() => setCutFlash(null), 1300);
    return () => clearTimeout(id);
  }, [cutFlash]);

  // ---- Floating reactions + emoji rain ----
  const [reactions, setReactions] = useState<ReactionRecvPayload[]>([]);
  const [rains, setRains] = useState<{ id: string; emoji: string }[]>([]);
  const playerCardRefs = useRef<Map<string, Element>>(new Map());
  const registerPlayerCard = useCallback((playerId: string, el: Element | null) => {
    if (el) playerCardRefs.current.set(playerId, el);
    else playerCardRefs.current.delete(playerId);
  }, []);
  useEffect(() => {
    const socket = getSocket();
    const onReaction = (r: ReactionRecvPayload) => {
      setReactions((prev) => [...prev, r]);
      // Targeted "shoot at one player" reactions stay exclusive to that
      // player's floating reaction - a screen-wide rain would defeat the
      // point of aiming it at one person. Untargeted reactions keep the rain.
      if (!r.targetPlayerId) {
        setRains((prev) => [...prev.slice(-2), { id: r.id, emoji: r.emoji }]);
      } else {
        // Make the hit land: the struck card flinches as the emoji arrives
        // (720ms of flight). Driven imperatively off the registered element so
        // no card has to subscribe to the reaction stream just to twitch.
        const hitId = r.targetPlayerId;
        window.setTimeout(() => {
          const el = playerCardRefs.current.get(hitId);
          if (!el) return;
          el.classList.remove("ludo-hit-shake");
          // Force a reflow so re-adding the class restarts the animation for
          // rapid-fire hits on the same card.
          void (el as HTMLElement).offsetWidth;
          el.classList.add("ludo-hit-shake");
          window.setTimeout(() => el.classList.remove("ludo-hit-shake"), 460);
        }, 700);
      }
      setTimeout(() => {
        setReactions((prev) => prev.filter((x) => x.id !== r.id));
      }, 2000);
      setTimeout(() => {
        setRains((prev) => prev.filter((x) => x.id !== r.id));
      }, 3200);
    };
    socket.on("room:reaction", onReaction);
    return () => {
      socket.off("room:reaction", onReaction);
    };
  }, []);
  /** Aim the room rail's emoji tray at one player. Reuses the existing
   *  `bhalyam:react-at-player` bridge InlineRoomRail already listens on, so a
   *  tapped seat card and the cross board's yard badge open the same tray. */
  const targetPlayer = useCallback((playerId: string) => {
    if (!playerId || playerId === selfId) return;
    window.dispatchEvent(
      new CustomEvent("bhalyam:react-at-player", { detail: { playerId } }),
    );
  }, [selfId]);

  function reactionAnchor(playerId: string): { left: number; top: number } | null {
    const el = playerCardRefs.current.get(playerId);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      left: ((rect.left + rect.width / 2) / window.innerWidth) * 100,
      top: (rect.top / window.innerHeight) * 100,
    };
  }

  // ---- Live cursors ----
  const [cursors, setCursors] = useState<Record<string, RemoteCursor>>({});
  const boardWrapRef = useRef<HTMLDivElement>(null);
  const lastCursorEmitRef = useRef<number>(0);

  useEffect(() => {
    const socket = getSocket();
    const onCursor = (c: CursorRecvPayload) => {
      setCursors((prev) => {
        if (c.x == null || c.y == null) {
          const { [c.fromPlayerId]: _, ...rest } = prev;
          return rest;
        }
        return {
          ...prev,
          [c.fromPlayerId]: {
            playerId: c.fromPlayerId,
            x: c.x,
            y: c.y,
            lastSeenTs: Date.now(),
          },
        };
      });
    };
    socket.on("room:cursor", onCursor);
    return () => {
      socket.off("room:cursor", onCursor);
    };
  }, []);

  // Auto-prune cursors that haven't moved in 2s
  useEffect(() => {
    const id = setInterval(() => {
      setCursors((prev) => {
        const cutoff = Date.now() - 2000;
        const out: Record<string, RemoteCursor> = {};
        for (const [pid, c] of Object.entries(prev)) {
          if (c.lastSeenTs >= cutoff) out[pid] = c;
        }
        return Object.keys(out).length === Object.keys(prev).length ? prev : out;
      });
    }, 600);
    return () => clearInterval(id);
  }, []);

  const onBoardMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = boardWrapRef.current;
    if (!el) return;
    const now = Date.now();
    if (now - lastCursorEmitRef.current < 50) return; // throttle to ~20Hz
    lastCursorEmitRef.current = now;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    getSocket().emit("room:cursor", { x, y });
  }, []);
  const onBoardMouseLeave = useCallback(() => {
    getSocket().emit("room:cursor", { x: null, y: null });
  }, []);

  // ---- Winner celebration + end-game card sequence ----
  const [showCelebration, setShowCelebration] = useState(false);
  const [showEndCard, setShowEndCard] = useState(false);
  useEffect(() => {
    if (state.phase !== "finished" || !state.winnerId) {
      setShowCelebration(false);
      setShowEndCard(false);
      return;
    }
    setShowCelebration(true);
    const tCard = setTimeout(() => setShowEndCard(true), 3000);
    const tCelebrationEnd = setTimeout(() => setShowCelebration(false), 3300);
    return () => {
      clearTimeout(tCard);
      clearTimeout(tCelebrationEnd);
    };
  }, [state.phase, state.winnerId]);

  function rematch() {
    getSocket().emit("room:setReady", false);
    setShowEndCard(false);
  }

  // ---- Capture sad-face + per-home confetti + token celebration ----
  const prevTokens = useRef<Record<string, LudoToken>>({});
  const [captureFaces, setCaptureFaces] = useState<LudoCaptureFace[]>([]);
  const [homeBursts, setHomeBursts] = useState<LudoHomeBurst[]>([]);
  const [celebratingIds, setCelebratingIds] = useState<Set<string>>(new Set());

  // ---- Hover preview: glow the destination cell for the hovered token ----
  const [hoverPreview, setHoverPreview] = useState<LudoHoverPreview | null>(null);

  function onHoverToken(pid: string, token: LudoToken): void {
    if (!settings.showHoverPreview) return;
    if (pid !== selfId || !myTurn || state.diceValue == null) return;
    if (!state.movableTokenIds.includes(token.id)) return;
    const color = armOf(pid);
    const hasCap = state.hasCaptured?.[pid] ?? false;
    const trackLen = polygonGeo ? polygonGeo.N * 13 : 52;
    // Pass the room's REAL Mandatory Capture setting. The preview used to
    // assume it was always on, so in a room with it off it showed the token
    // bypassing its own home entrance — a move the engine would not make.
    const dest = predictDestination(
      token,
      state.diceValue,
      color,
      hasCap,
      trackLen,
      state.options?.mandatoryCapture ?? true,
    );
    if (!dest) return setHoverPreview(null);
    if (dest.state === "track") {
      setHoverPreview({ kind: "track", trackPos: dest.trackPos });
    } else if (dest.state === "stretch") {
      setHoverPreview({ kind: "stretch", stretchPos: dest.stretchPos, color });
    } else {
      setHoverPreview({ kind: "home", color });
    }
  }
  function clearHoverPreview(): void {
    setHoverPreview(null);
  }

  // ---- Lucky moment detection ----
  const [luckyBanner, setLuckyBanner] = useState<string | null>(null);
  const lastSixTurnRef = useRef<{ pid: string; ts: number } | null>(null);
  useEffect(() => {
    if (state.diceValue === 6 && state.turnPlayerId) {
      lastSixTurnRef.current = { pid: state.turnPlayerId, ts: Date.now() };
    }
  }, [state.diceValue, state.turnPlayerId]);
  useEffect(() => {
    const e = state.lastEvent;
    if (!e) return;
    if (e.kind === "capture" && e.byPlayerId) {
      const six = lastSixTurnRef.current;
      if (six && six.pid === e.byPlayerId && Date.now() - six.ts < 4000) {
        const name = players.find((p) => p.id === e.byPlayerId)?.name ?? "?";
        setLuckyBanner(`🎰 LUCKY! ${name} rolled a 6 and captured! 🎰`);
        setTimeout(() => setLuckyBanner(null), 1800);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.lastEvent?.ts]);

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if (
        ev.target instanceof HTMLElement &&
        (ev.target.tagName === "INPUT" || ev.target.tagName === "TEXTAREA")
      ) {
        return;
      }
      if (ev.key === "r" || ev.key === "R") {
        if (canRoll && !rolling) roll();
      } else if (/^[1-4]$/.test(ev.key)) {
        if (!myTurn || state.turnPhase !== "moving") return;
        const target = `${(selfId ? armOf(selfId) : "") ?? ""}-${Number(ev.key) - 1}`;
        if (state.movableTokenIds.includes(target)) move(target);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRoll, rolling, myTurn, state.turnPhase, state.movableTokenIds, selfId, state.playerColors]);

  // ---- Per-player background tint ----
  useEffect(() => {
    const myColor = selfId ? state.playerColors[selfId] : null;
    if (!myColor) return;
    const hex = COLOR_HEX[myColor];
    const prev = document.body.style.backgroundImage;
    document.body.style.backgroundImage = `radial-gradient(circle at 50% 0%, ${hex}1a 0%, transparent 35%)`;
    return () => {
      document.body.style.backgroundImage = prev;
    };
  }, [selfId, state.playerColors]);

  // ---- Mandatory-capture unlock burst ----
  const prevHasCaptured = useRef<Record<string, boolean>>({});
  const [unlockBurst, setUnlockBurst] = useState<Record<string, number>>({});
  useEffect(() => {
    const next: Record<string, number> = { ...unlockBurst };
    let changed = false;
    for (const pid of state.playerOrder) {
      const before = prevHasCaptured.current[pid] ?? false;
      const now = state.hasCaptured?.[pid] ?? false;
      if (!before && now) {
        next[pid] = Date.now();
        changed = true;
        setTimeout(() => {
          setUnlockBurst((cur) => {
            const { [pid]: _, ...rest } = cur;
            return rest;
          });
        }, 1000);
      }
      prevHasCaptured.current[pid] = now;
    }
    if (changed) setUnlockBurst(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.hasCaptured, state.playerOrder]);

  function nameOf(id: string): string {
    return players.find((p) => p.id === id)?.name ?? "?";
  }
  function roll() {
    if (!canRoll) return;
    if (soundOn) sfx.diceRoll();
    haptics.subtle();
    setRolling(true);
    // Include playerId so the server can proxy moves when Room.tsx has
    // overridden `selfId` to a local pass-and-play seat.
    getSocket().emit("game:move", { type: "roll", playerId: selfId ?? undefined });
    setTimeout(() => setRolling(false), DICE_ROLL_MS);
  }
  function move(tokenId: string) {
    getSocket().emit("game:move", { type: "move", data: { tokenId }, playerId: selfId ?? undefined });

    /**
     * OPTIMISTIC: start the token moving now, rather than after the round
     * trip. Tapping a token used to do nothing visible until the server
     * answered, so on a slow link the game felt unresponsive and players
     * tapped again.
     *
     * This is only safe because the client and the server now resolve a move
     * with the SAME function (shared/ludo-rules.ts#resolveDestination) — see
     * the contract test, which sweeps the whole move space to prove they
     * agree. Predicting with a hand-written mirror, as this code used to do,
     * would have made a wrong guess visible as a snap-back.
     *
     * Reconciliation is free: the effect above already animates any
     * difference between what is displayed and what the server says. If the
     * prediction was right it sees no difference and does nothing; if it was
     * wrong it walks the piece to the truth from wherever it currently is.
     */
    if (reduceMotion || state.diceValue == null || !selfId) return;
    const mine = state.tokens[selfId] ?? [];
    const token = mine.find((t) => t.id === tokenId);
    const from = displayed[tokenId] ?? token;
    if (!token || !from) return;
    const color = armOf(selfId);
    const trackLen = polygonGeo ? polygonGeo.N * 13 : 52;
    const dest = predictDestination(
      token,
      state.diceValue,
      color,
      state.hasCaptured?.[selfId] ?? false,
      trackLen,
      state.options?.mandatoryCapture ?? true,
    );
    if (!dest) return;
    const target: LudoToken = {
      ...token,
      state: dest.state,
      trackPos: dest.state === "track" ? dest.trackPos : undefined,
      stretchPos: dest.state === "stretch" ? dest.stretchPos : undefined,
    };
    playPathRef.current(tokenId, computeStepPath(from, target, color, trackLen));
  }
  function toggleSound() {
    const next = !soundOn;
    setSoundEnabled(next);
    setSoundOn(next);
  }

  // --- Step-by-step token movement animation ------------------------------
  const [displayed, setDisplayed] = useState<Record<string, LudoToken>>({});
  const animationTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const initialisedRef = useRef(false);

  /**
   * Walk one token along `path`, one cell per tick. Shared by the
   * server-reconcile effect below and by the OPTIMISTIC path in `move()`.
   *
   * Restarting a token that is already mid-flight is safe and intended: the
   * previous timer is cleared and the new path continues from wherever the
   * piece currently is, so an optimistic hop that the server later confirms
   * simply finishes, and one it contradicts is corrected without a jump.
   */
  const playPathRef = useRef<(id: string, path: LudoToken[]) => void>(() => {});
  playPathRef.current = (id: string, path: LudoToken[]) => {
    clearTimeout(animationTimersRef.current.get(id));
    animationTimersRef.current.delete(id);
    if (path.length === 0) return;
    const stepMs = stepMsFor(path.length);
    let i = 0;
    const playStep = () => {
      if (i >= path.length) {
        animationTimersRef.current.delete(id);
        return;
      }
      const next = path[i];
      i += 1;
      setDisplayed((cur) => ({ ...cur, [id]: next }));
      if (soundOn && next.state === "track") sfx.tokenMove();
      if (i < path.length) {
        animationTimersRef.current.set(id, setTimeout(playStep, stepMs));
      }
    };
    playStep();
  };

  // Cleanup all timers on unmount
  useEffect(() => {
    const timers = animationTimersRef.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
    };
  }, []);

  useEffect(() => {
    // Snapshot every server token
    const snapshot: { pid: string; token: LudoToken }[] = [];
    for (const pid of state.playerOrder) {
      for (const t of state.tokens[pid] ?? []) snapshot.push({ pid, token: t });
    }

    if (!initialisedRef.current) {
      // First load: snap displayed to server state without animation
      const initial: Record<string, LudoToken> = {};
      for (const { token } of snapshot) initial[token.id] = token;
      setDisplayed(initial);
      initialisedRef.current = true;
      return;
    }

    for (const { pid, token: serverToken } of snapshot) {
      const id = serverToken.id;
      const cur = displayed[id];
      if (!cur) {
        setDisplayed((s) => ({ ...s, [id]: serverToken }));
        continue;
      }
      if (isSameTokenState(cur, serverToken)) continue;
      if (reduceMotion) {
        clearTimeout(animationTimersRef.current.get(id));
        animationTimersRef.current.delete(id);
        setDisplayed((s) => ({ ...s, [id]: serverToken }));
        continue;
      }

      const color = armOf(pid);
      const trackLen = polygonGeo ? polygonGeo.N * 13 : 52;
      const path = computeStepPath(cur, serverToken, color, trackLen);
      if (path.length === 0) {
        setDisplayed((s) => ({ ...s, [id]: serverToken }));
        continue;
      }
      playPathRef.current(id, path);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.tokens]);

  const allTokens = useMemo(() => {
    const arr: { pid: string; token: LudoToken }[] = [];
    for (const pid of state.playerOrder) {
      for (const t of state.tokens[pid] ?? []) {
        arr.push({ pid, token: displayed[t.id] ?? t });
      }
    }
    return arr;
  }, [state.tokens, state.playerOrder, displayed]);

  // Which tokens share each cell, so they can be fanned out instead of drawn
  // on top of one another. Only track and stretch cells can be shared — yard
  // and home slots are indexed per token, so they never collide.
  const stacks = useMemo(() => {
    const byCell = new Map<string, string[]>();
    for (const { pid, token } of allTokens) {
      const key = stackKeyOf(token, armOf(pid));
      if (!key) continue;
      const list = byCell.get(key);
      if (list) list.push(token.id);
      else byCell.set(key, [token.id]);
    }
    // Stable slot assignment — without sorting, tokens would swap places
    // whenever playerOrder iteration produced a different arrival order.
    for (const list of byCell.values()) list.sort();
    return byCell;
  }, [allTokens, state.playerColors]);

  /** Fan data for a token, in CELL units (caller scales to its board). */
  function fanFor(token: LudoToken, color: LudoColor) {
    const key = stackKeyOf(token, color);
    if (!key) return { dx: 0, dy: 0, scale: 1 };
    const group = stacks.get(key);
    if (!group || group.length < 2) return { dx: 0, dy: 0, scale: 1 };
    return fanSlot(Math.max(0, group.indexOf(token.id)), group.length);
  }

  // Detect capture / home-arrival transitions on the displayed token snapshot.
  useEffect(() => {
    const prev = prevTokens.current;
    for (const { pid, token: cur } of allTokens) {
      const before = prev[cur.id];
      if (!before) {
        prev[cur.id] = cur;
        continue;
      }
      // Captured: was on track → now in yard
      if (before.state === "track" && cur.state === "yard") {
        const pos = posFromState(before, armOf(pid));
        if (pos) {
          const id = `cf_${cur.id}_${Date.now()}`;
          setCaptureFaces((curArr) => [...curArr, { id, ...pos }]);
          setTimeout(() => {
            setCaptureFaces((curArr) => curArr.filter((c) => c.id !== id));
          }, 950);
        }
      }
      // Home arrival: just reached "home" state
      if (before.state !== "home" && cur.state === "home") {
        const pos = tokenPosition(pid, cur);
        const id = `hb_${cur.id}_${Date.now()}`;
        const color = state.playerColors[pid];
        setHomeBursts((curArr) => [...curArr, { id, left: pos.left, top: pos.top, color }]);
        setTimeout(() => {
          setHomeBursts((curArr) => curArr.filter((c) => c.id !== id));
        }, 800);
        setCelebratingIds((curSet) => {
          const next = new Set(curSet);
          next.add(cur.id);
          return next;
        });
        setTimeout(() => {
          setCelebratingIds((curSet) => {
            const next = new Set(curSet);
            next.delete(cur.id);
            return next;
          });
        }, 750);
      }
      prev[cur.id] = cur;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTokens]);

  // Decide cross (≤4) vs polygon (≥5) board mode
  const playerCount = state.playerOrder.length;
  const usePolygon = playerCount >= 5;
  const arms = useMemo(() => {
    const r: Record<string, LudoColor> = {};
    for (const pid of state.playerOrder) {
      const a = armOf(pid);
      if (a) r[pid] = a;
    }
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.playerOrder, state.playerArms, state.playerColors]);

  const armPaint = useMemo(() => {
    const r: Partial<Record<LudoColor, LudoColor>> = {};
    for (const pid of state.playerOrder) {
      const a = armOf(pid);
      const paint = state.playerColors[pid];
      if (a && paint) r[a] = paint;
    }
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.playerOrder, state.playerArms, state.playerColors]);

  const activeColors = useMemo(
    () =>
      state.playerOrder
        .map((pid) => armOf(pid))
        .filter((c): c is LudoColor => !!c),
    [state.playerOrder, state.playerColors]
  );
  // 5-8 players all use the reference-exact print-design boards
  // (print-board.ts). They fulfil the PolygonBoardGeometry contract, so
  // token/hover/animation positioning below is unchanged.
  const polygonGeo: PrintBoardGeometry | null = useMemo(
    () => (usePolygon ? getPrintBoard(playerCount) : null),
    [usePolygon, playerCount]
  );

  /**
   * Degrees to spin the board so the LOCAL player's own yard sits at the
   * bottom, nearest them. Purely a client-side view transform — every engine
   * index, track position and colour→arm mapping is untouched, so two players
   * looking at differently-rotated boards still agree on the game state.
   *
   * print-board.ts measures angles CLOCKWISE FROM UP (`P()`), arm `i` sits on
   * axis `i·360/N`, and its yard is on that arm's bisector, half a wedge
   * further round. Bottom of screen is 180°, hence `180 − bisector`.
   */
  const targetRotation = useMemo(() => {
    if (!selfId) return 0;
    const color = armOf(selfId);
    if (!color) return 0;
    // Normalised to (-180, 180] so the CSS transition always takes the short
    // way round instead of unwinding through a full turn.
    const norm = (d: number) => ((((d % 360) + 540) % 360)) - 180;
    if (polygonGeo) {
      const arm = PLAYER_COLORS_ORDER.indexOf(color);
      if (arm < 0) return 0;
      return norm(180 - (arm + 0.5) * (360 / polygonGeo.N));
    }
    // Cross board (2-4 players): four fixed quadrants rather than arms, so it
    // is a 90° step. Target is BOTTOM-LEFT (225°) — blue's home corner, and
    // where you'd naturally sit at a physical board.
    const at = CROSS_YARD_ANGLE[color];
    return at == null ? 0 : norm(225 - at);
  }, [polygonGeo, selfId, state.playerColors]);

  /**
   * The board starts square-on and turns to face you a beat after it mounts —
   * the digital echo of sliding a real board round so your colour is in front
   * of you before the first roll. Skipped entirely under reduced motion, where
   * it snaps straight to the final orientation.
   */
  const [rotationSettled, setRotationSettled] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setRotationSettled(true), 80);
    return () => window.clearTimeout(t);
  }, []);
  const boardRotation = reduceMotion || rotationSettled ? targetRotation : 0;

  function posFromState(t: LudoToken, color: LudoColor): { left: number; top: number } | null {
    if (polygonGeo) {
      if (t.state === "track" && t.trackPos != null) {
        const p = polygonGeo.trackCells[t.trackPos];
        if (p) return { left: p.x, top: p.y };
      }
      if (t.state === "stretch" && t.stretchPos != null) {
        const p = polygonGeo.stretchCells[color]?.[t.stretchPos];
        if (p) return { left: p.x, top: p.y };
      }
      return null;
    }
    if (t.state === "track" && t.trackPos != null) {
      const cell = TRACK_CELLS[t.trackPos];
      return cellToPct(cell.row, cell.col);
    }
    if (t.state === "stretch" && t.stretchPos != null) {
      const cell = STRETCH_CELLS[color][t.stretchPos];
      return cellToPct(cell.row, cell.col);
    }
    return null;
  }

  function tokenPosition(pid: string, token: LudoToken): LudoTokenPos {
    const color = armOf(pid);
    const tokenIdx = parseInt(token.id.split("-")[1] ?? "0", 10) % 4;

    if (polygonGeo) {
      if (token.state === "yard") {
        const slot = polygonGeo.yardSlots[color]?.[tokenIdx];
        if (slot) return { left: slot.x, top: slot.y };
      }
      if (token.state === "home") {
        const slot = polygonGeo.homeSlots[color]?.[tokenIdx];
        if (slot) return { left: slot.x, top: slot.y };
      }
      // Track/stretch cells can hold several tokens at once — fan them so a
      // block of 2-4 doesn't render as one visible piece.
      const fan = fanFor(token, color);
      const u = polygonGeo.cellSize;
      if (token.state === "stretch") {
        const cell = polygonGeo.stretchCells[color]?.[token.stretchPos ?? 0];
        if (cell) return { left: cell.x + fan.dx * u, top: cell.y + fan.dy * u, scale: fan.scale };
      }
      if (token.state === "track") {
        const cell = polygonGeo.trackCells[token.trackPos ?? 0];
        if (cell) return { left: cell.x + fan.dx * u, top: cell.y + fan.dy * u, scale: fan.scale };
      }
      return { left: 50, top: 50 };
    }

    // Cross-board (N <= 4) layout
    const palette = YARD_CELLS[color];
    const yardSlot = palette[tokenIdx];
    if (token.state === "yard") {
      return cellToPct(yardSlot.row, yardSlot.col);
    }
    if (token.state === "home") {
      const slot = HOME_SLOTS[color][tokenIdx];
      return cellToPct(slot.row, slot.col);
    }
    // Same occupancy-aware fan as the polygon board. `fanSlot` works in cell
    // units, and one cross-board cell is this many percent of the board.
    const fan = fanFor(token, color);
    const u = cellToPct(1, 1).left - cellToPct(0, 0).left;
    if (token.state === "stretch") {
      const cell = STRETCH_CELLS[color][token.stretchPos ?? 0];
      const p = cellToPct(cell.row, cell.col);
      return { left: p.left + fan.dx * u, top: p.top + fan.dy * u, scale: fan.scale };
    }
    const cell = TRACK_CELLS[token.trackPos ?? 0];
    const p = cellToPct(cell.row, cell.col);
    return { left: p.left + fan.dx * u, top: p.top + fan.dy * u, scale: fan.scale };
  }

  return {
    selfId,
    myTurn,
    canRoll,
    rolling,
    displayTurnPlayerId,
    displayTurnPhase,
    displayMyTurn,
    showInstructions,
    setShowInstructions,
    showSettings,
    setShowSettings,
    settings,
    reduceMotion,
    soundOn,
    toggleSound,
    toast,
    confettiUntil,
    reactions,
    reactionAnchor,
    registerPlayerCard,
    targetPlayer,
    rains,
    cursors,
    boardWrapRef,
    onBoardMouseMove,
    onBoardMouseLeave,
    showCelebration,
    showEndCard,
    setShowEndCard,
    rematch,
    captureFaces,
    homeBursts,
    celebratingIds,
    hoverPreview,
    onHoverToken,
    clearHoverPreview,
    luckyBanner,
    cutFlash,
    unlockBurst,
    allTokens,
    playerCount,
    usePolygon,
    activeColors,
    arms,
    armPaint,
    polygonGeo,
    boardRotation,
    tokenPosition,
    nameOf,
    roll,
    move,
    onLeave,
  };
}
