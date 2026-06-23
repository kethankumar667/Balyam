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
import { useTurnHaptics } from "../../hooks/useHaptics";
import { type RemoteCursor } from "./CursorLayer";
import { useLudoSettings, type LudoSettings } from "./settings";
import { predictDestination } from "./predict";
import { sfx, setSoundEnabled, isSoundEnabled } from "./sound";
import { computeStepPath, isSameTokenState } from "./animation";
import { buildPolygonGeometry, type PolygonBoardGeometry } from "./polygon-board";
import {
  COLOR_HEX,
  HOME_SLOTS,
  STRETCH_CELLS,
  TRACK_CELLS,
  YARD_CELLS,
} from "./board-layout";
import { cellToPct, colorOffset, type LudoHoverPreview } from "./ludo-board-shared";

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
}

export type LudoToast = { text: string; emoji: string; color?: string };
export type LudoCaptureFace = { id: string; left: number; top: number };
export type LudoHomeBurst = { id: string; left: number; top: number; color: LudoColor };
export type LudoTokenPos = { left: number; top: number };

/**
 * Everything both Ludo shells render. Named contract (no ReturnType<>) so the
 * shared presentational components can consume it by importing this type.
 */
export interface LudoBoardModel {
  selfId: string | null;
  myTurn: boolean;
  canRoll: boolean;
  rolling: boolean;
  showInstructions: boolean;
  setShowInstructions: (v: boolean) => void;
  showSettings: boolean;
  setShowSettings: (v: boolean) => void;
  settings: LudoSettings;
  soundOn: boolean;
  toggleSound: () => void;
  toast: LudoToast | null;
  confettiUntil: number;
  reactions: ReactionRecvPayload[];
  reactionAnchor: (playerId: string) => { left: number; top: number } | null;
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
  unlockBurst: Record<string, number>;
  allTokens: { pid: string; token: LudoToken }[];
  playerCount: number;
  usePolygon: boolean;
  activeColors: LudoColor[];
  polygonGeo: PolygonBoardGeometry | null;
  tokenPosition: (pid: string, token: LudoToken) => LudoTokenPos;
  nameOf: (id: string) => string;
  roll: () => void;
  move: (tokenId: string) => void;
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
  // messages/roomCode/roomPhase are forwarded to InlineRoomRail by the shells.
}: LudoBoardProps): LudoBoardModel {
  const myTurn = state.turnPlayerId === selfId;
  // 1-second "settle" gap between consecutive rolls.
  const [rollCooldown, setRollCooldown] = useState(false);
  const prevTurnIdRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevTurnIdRef.current;
    prevTurnIdRef.current = state.turnPlayerId;
    if (prev !== null && prev !== state.turnPlayerId) {
      setRollCooldown(true);
      const t = window.setTimeout(() => setRollCooldown(false), 1000);
      return () => window.clearTimeout(t);
    }
  }, [state.turnPlayerId]);
  const canRoll =
    myTurn &&
    state.turnPhase === "rolling" &&
    state.phase === "playing" &&
    !rollCooldown;
  useTurnHaptics(state.phase === "playing" ? state.turnPlayerId : null, selfId);

  const [rolling, setRolling] = useState(false);
  const prevDice = useRef<number | null>(state.diceValue);
  useEffect(() => {
    if (state.diceValue != null && state.diceValue !== prevDice.current) {
      setRolling(true);
      const t = setTimeout(() => setRolling(false), 550);
      prevDice.current = state.diceValue;
      return () => clearTimeout(t);
    }
    prevDice.current = state.diceValue;
  }, [state.diceValue]);

  const [showInstructions, setShowInstructions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings] = useLudoSettings();
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [toast, setToast] = useState<LudoToast | null>(null);
  const [confettiUntil, setConfettiUntil] = useState<number>(0);

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

  // ---- Floating reactions + emoji rain ----
  const [reactions, setReactions] = useState<ReactionRecvPayload[]>([]);
  const [rains, setRains] = useState<{ id: string; emoji: string }[]>([]);
  const playerCardRefs = useRef<Map<string, HTMLElement>>(new Map());
  useEffect(() => {
    const socket = getSocket();
    const onReaction = (r: ReactionRecvPayload) => {
      setReactions((prev) => [...prev, r]);
      setRains((prev) => [...prev.slice(-2), { id: r.id, emoji: r.emoji }]);
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
    const color = state.playerColors[pid];
    const hasCap = state.hasCaptured?.[pid] ?? false;
    const trackLen = polygonGeo ? polygonGeo.N * 13 : 52;
    const dest = predictDestination(token, state.diceValue, color, hasCap, trackLen);
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
        const target = `${state.playerColors[selfId ?? ""] ?? ""}-${Number(ev.key) - 1}`;
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
    setRolling(true);
    // Include playerId so the server can proxy moves when Room.tsx has
    // overridden `selfId` to a local pass-and-play seat.
    getSocket().emit("game:move", { type: "roll", playerId: selfId ?? undefined });
    setTimeout(() => setRolling(false), 550);
  }
  function move(tokenId: string) {
    getSocket().emit("game:move", { type: "move", data: { tokenId }, playerId: selfId ?? undefined });
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
  const STEP_MS = 160;

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

      clearTimeout(animationTimersRef.current.get(id));
      animationTimersRef.current.delete(id);

      const color = state.playerColors[pid];
      const trackLen = polygonGeo ? polygonGeo.N * 13 : 52;
      const path = computeStepPath(cur, serverToken, color, trackLen);
      if (path.length === 0) {
        setDisplayed((s) => ({ ...s, [id]: serverToken }));
        continue;
      }

      let i = 0;
      const playStep = () => {
        if (i >= path.length) {
          animationTimersRef.current.delete(id);
          return;
        }
        const next = path[i];
        i += 1;
        setDisplayed((s) => ({ ...s, [id]: next }));
        if (soundOn && next.state === "track") {
          // gentle chirp per step — only on the track to avoid noise during home stretch
          sfx.tokenMove();
        }
        if (i < path.length) {
          const t = setTimeout(playStep, STEP_MS);
          animationTimersRef.current.set(id, t);
        }
      };
      playStep();
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
        const pos = posFromState(before, state.playerColors[pid]);
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
  const activeColors = useMemo(
    () =>
      state.playerOrder
        .map((pid) => state.playerColors[pid])
        .filter((c): c is LudoColor => !!c),
    [state.playerOrder, state.playerColors]
  );
  const polygonGeo: PolygonBoardGeometry | null = useMemo(
    () => (usePolygon ? buildPolygonGeometry(playerCount, activeColors) : null),
    [usePolygon, playerCount, activeColors]
  );

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
    const color = state.playerColors[pid];
    const tokenIdx = parseInt(token.id.split("-")[1] ?? "0", 10) % 4;

    if (polygonGeo) {
      if (token.state === "yard") {
        const slot = polygonGeo.yardSlots[color]?.[tokenIdx];
        if (slot) return { left: slot.x, top: slot.y };
      }
      if (token.state === "home") {
        // Spread 4 home tokens around the center wedge for this color
        const pts = polygonGeo.centerTriangles[color]
          ?.split(" ")
          .map((s) => {
            const [x, y] = s.split(",").map(Number);
            return { x, y };
          });
        if (pts && pts.length >= 3) {
          const cx = (pts[0].x + pts[1].x + pts[2].x) / 3;
          const cy = (pts[0].y + pts[1].y + pts[2].y) / 3;
          const offX = (tokenIdx % 2 === 0 ? -1 : 1) * 1.4;
          const offY = (tokenIdx < 2 ? -1 : 1) * 1.4;
          return { left: cx + offX, top: cy + offY };
        }
      }
      if (token.state === "stretch") {
        const cell = polygonGeo.stretchCells[color]?.[token.stretchPos ?? 0];
        if (cell) return { left: cell.x, top: cell.y };
      }
      if (token.state === "track") {
        const cell = polygonGeo.trackCells[token.trackPos ?? 0];
        if (cell) return { left: cell.x, top: cell.y };
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
    if (token.state === "stretch") {
      const cell = STRETCH_CELLS[color][token.stretchPos ?? 0];
      return cellToPct(cell.row, cell.col);
    }
    const cell = TRACK_CELLS[token.trackPos ?? 0];
    const off = colorOffset(color);
    return cellToPct(cell.row + off.r * 0.18, cell.col + off.c * 0.18);
  }

  return {
    selfId,
    myTurn,
    canRoll,
    rolling,
    showInstructions,
    setShowInstructions,
    showSettings,
    setShowSettings,
    settings,
    soundOn,
    toggleSound,
    toast,
    confettiUntil,
    reactions,
    reactionAnchor,
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
    unlockBurst,
    allTokens,
    playerCount,
    usePolygon,
    activeColors,
    polygonGeo,
    tokenPosition,
    nameOf,
    roll,
    move,
  };
}
