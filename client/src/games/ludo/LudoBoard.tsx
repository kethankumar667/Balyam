import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type {
  LudoColor,
  LudoEvent,
  LudoState,
  LudoToken,
  Player,
  ReactionRecvPayload,
  CursorRecvPayload,
} from "@shared/types";
import { getSocket } from "../../lib/socket";
import { Dice } from "./Dice";
import { Token } from "./Token";
import InstructionsModal from "./InstructionsModal";
import Toast from "./Toast";
import Confetti from "./Confetti";
import ReactionBar from "./ReactionBar";
import FloatingReactionsLayer from "./FloatingReactionsLayer";
import CursorLayer, { type RemoteCursor } from "./CursorLayer";
import EndGameCard from "./EndGameCard";
import EmojiRain from "./EmojiRain";
import WinnerCelebration from "./WinnerCelebration";
import { Avatar } from "./Avatar";
import SettingsMenu from "./SettingsMenu";
import { useLudoSettings } from "./settings";
import { predictDestination } from "./predict";
import { sfx, setSoundEnabled, isSoundEnabled } from "./sound";
import { computeStepPath, isSameTokenState } from "./animation";
import PolygonBoardSVG from "./PolygonBoardSVG";
import { buildPolygonGeometry, type PolygonBoardGeometry } from "./polygon-board";
import {
  COLOR_HEX,
  COLOR_HEX_DARK,
  HOME_CENTER,
  HOME_SLOTS,
  SAFE_SQUARES,
  STRETCH_CELLS,
  TRACK_CELLS,
  YARD_CELLS,
  YARD_REGIONS,
} from "./board-layout";

const GRID = 15;

export default function LudoBoard({
  state,
  players,
  selfId,
}: {
  state: LudoState;
  players: Player[];
  selfId: string | null;
}) {
  const myTurn = state.turnPlayerId === selfId;
  const canRoll = myTurn && state.turnPhase === "rolling" && state.phase === "playing";

  // Local "rolling animation" state — triggered when diceValue transitions from null to a number.
  const [rolling, setRolling] = useState(false);
  const prevDice = useRef<number | null>(state.diceValue);
  useEffect(() => {
    if (prevDice.current == null && state.diceValue != null) {
      setRolling(true);
      const t = setTimeout(() => setRolling(false), 550);
      return () => clearTimeout(t);
    }
    prevDice.current = state.diceValue;
  }, [state.diceValue]);

  // Instructions modal toggle
  const [showInstructions, setShowInstructions] = useState(false);
  // Settings menu toggle
  const [showSettings, setShowSettings] = useState(false);
  const [settings] = useLudoSettings();
  // Sound toggle
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  // Active toast
  const [toast, setToast] = useState<{ text: string; emoji: string; color?: string } | null>(null);
  // Confetti on win
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
  // Phase finished → 0s: WinnerCelebration appears. 3s: EndGameCard slides in.
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
  // Detect transitions in `displayed` to drive these visual flourishes.
  const prevTokens = useRef<Record<string, LudoToken>>({});
  const [captureFaces, setCaptureFaces] = useState<
    { id: string; left: number; top: number }[]
  >([]);
  const [homeBursts, setHomeBursts] = useState<
    { id: string; left: number; top: number; color: LudoColor }[]
  >([]);
  const [celebratingIds, setCelebratingIds] = useState<Set<string>>(new Set());

  // ---- Hover preview: glow the destination cell for the hovered token ----
  const [hoverPreview, setHoverPreview] = useState<
    | { kind: "track"; trackPos: number }
    | { kind: "stretch"; stretchPos: number; color: LudoColor }
    | { kind: "home"; color: LudoColor }
    | null
  >(null);

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
  // We flag two big celebrations: rolled-6-then-capture in same turn, and a captured token landing
  // immediately after the unlock event.
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
  // Detects hasCaptured transitions false → true so we can briefly animate
  // a 🔓 burst over the freshly-unlocked stretch entrance.
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
    // overridden `selfId` to a local pass-and-play seat. For normal play
    // selfId === the caller's own id and the proxy is a no-op.
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
  // We keep a `displayed` map separate from server state. When the server
  // emits a new state, we walk each changed token through its path cell by
  // cell so the UI hops like a real Ludo board rather than sliding straight
  // to the destination.
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

      const existing = animationTimersRef.current.get(id);
      if (existing) clearTimeout(existing);
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

  // Detect capture / home-arrival transitions on the displayed token snapshot
  // to drive the sad-face overlay, per-home confetti, and arrival bounce.
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

  function tokenPosition(pid: string, token: LudoToken): { left: number; top: number } {
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

  return (
    <div className="rounded-2xl border border-slate-700/80 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.16),transparent_32%),linear-gradient(135deg,#111827,#020617)] p-3 sm:p-4 space-y-3 shadow-2xl">
      {/* Status bar */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-xl font-black tracking-tight">Ludo</h2>
        <div className="text-sm flex-1 text-center px-2">
          {state.phase === "finished" ? (
            <span className="text-emerald-300 font-semibold">
              🏆 {state.winnerId ? `${nameOf(state.winnerId)} wins!` : "Game over"}
            </span>
          ) : myTurn ? (
            <span className="text-emerald-300">
              Your turn — {state.turnPhase === "rolling" ? "roll the dice 🎲" : "pick a token"}
            </span>
          ) : (
            <span className="text-slate-400">Waiting for {nameOf(state.turnPlayerId)}…</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleSound}
            className="rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 px-2.5 py-1.5 text-sm transition"
            title={soundOn ? "Mute sounds" : "Enable sounds"}
          >
            {soundOn ? "🔊" : "🔈"}
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 px-2.5 py-1.5 text-sm transition"
            title="Display settings (theme, color-blind, hover preview)"
          >
            ⚙
          </button>
          <button
            onClick={() => setShowInstructions(true)}
            className="rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 px-2.5 py-1.5 text-sm transition"
            title="How to play"
          >
            ❔ Rules
          </button>
        </div>
      </div>

      {/* Player stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {state.playerOrder.map((pid) => {
          const color = state.playerColors[pid];
          const isTurn = pid === state.turnPlayerId;
          const unlocked = state.hasCaptured?.[pid] ?? false;
          return (
            <div
              key={pid}
              ref={(el) => {
                if (el) playerCardRefs.current.set(pid, el);
                else playerCardRefs.current.delete(pid);
              }}
              className={`rounded-xl p-2 text-sm flex items-center gap-2 transition border ${
                isTurn ? "active-player-pulse scale-[1.03] border-white/20" : "opacity-80 border-white/5"
              }`}
              style={{
                background: isTurn
                  ? `linear-gradient(135deg, ${COLOR_HEX_DARK[color]}, rgba(15,23,42,0.88))`
                  : "rgba(15,23,42,0.62)",
                outline: isTurn ? `2px solid ${COLOR_HEX[color]}` : "none",
                ["--active-player-glow" as never]: `${COLOR_HEX[color]}66`,
              }}
            >
              <Avatar name={nameOf(pid)} color={color} size={28} />
              <span className="flex-1 truncate font-semibold">
                {nameOf(pid)} {pid === selfId && <span className="text-xs opacity-70">(you)</span>}
              </span>
              <span
                className="text-xs"
                title={unlocked ? "Home column unlocked" : "Need first capture to unlock home column"}
              >
                {unlocked ? "🔓" : "🔒"}
              </span>
              <span className="text-xs">🏠 {state.finishedCount[pid] ?? 0}/4</span>
            </div>
          );
        })}
      </div>

      {/* Reaction bar */}
      <div className="flex justify-center">
        <ReactionBar />
      </div>

      {/* Dice + roll */}
      <div
        className={`flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5 rounded-2xl border border-slate-700/70 bg-slate-950/70 p-3 transition ${
          myTurn ? "" : "opacity-60"
        }`}
      >
        <div className="flex flex-col items-center gap-1">
          <span
            className="text-[10px] uppercase tracking-wider font-bold"
            style={{
              color: COLOR_HEX[state.playerColors[state.turnPlayerId]] ?? "#94a3b8",
            }}
          >
            {myTurn ? "Your dice" : `${nameOf(state.turnPlayerId)}'s dice`}
          </span>
          <Dice value={state.diceValue} rolling={rolling} highlight={myTurn && canRoll} />
        </div>
        {myTurn ? (
          <button
            onClick={roll}
            disabled={!canRoll || rolling}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-40 px-5 py-3 font-bold transition"
          >
            🎲 Roll
          </button>
        ) : (
          <div className="text-sm text-slate-300 max-w-[12rem]">
            <span className="block font-semibold">
              {nameOf(state.turnPlayerId)}'s turn
            </span>
            <span className="block text-xs text-slate-400">
              {state.turnPhase === "rolling"
                ? "Waiting for them to roll…"
                : "Waiting for them to move…"}
            </span>
          </div>
        )}
        {state.consecutiveSixes > 0 && state.consecutiveSixes < 3 && (
          <span className="text-amber-300 text-xs whitespace-nowrap">
            {state.consecutiveSixes}/3 sixes
          </span>
        )}
      </div>

      {/* Board */}
      <div
        ref={boardWrapRef}
        onMouseMove={onBoardMouseMove}
        onMouseLeave={() => {
          onBoardMouseLeave();
          clearHoverPreview();
        }}
        className={`ludo-board relative w-full max-w-[min(92vw,680px)] mx-auto aspect-square select-none rounded-2xl border-4 border-slate-950 bg-white shadow-[0_24px_60px_rgba(0,0,0,0.45)] theme-${settings.theme} ${settings.highContrast ? "hc" : ""}`}
      >
        {polygonGeo ? (
          <PolygonBoardSVG
            geo={polygonGeo}
            players={players}
            playerOrder={state.playerOrder}
            playerColors={state.playerColors}
            activeColors={activeColors}
            hasCaptured={state.hasCaptured ?? {}}
            unlockBurst={unlockBurst}
          />
        ) : (
          <BoardSVG
            playerColorsInRoom={Object.values(state.playerColors)}
            players={players}
            playerOrder={state.playerOrder}
            playerColors={state.playerColors}
            hasCaptured={state.hasCaptured ?? {}}
            unlockBurst={unlockBurst}
          />
        )}
        {/* Live opponent cursors */}
        <CursorLayer
          cursors={Object.values(cursors).filter((c) => c.playerId !== selfId)}
          players={players}
          playerColors={state.playerColors}
        />
        {/* Hover-preview glow on destination cell */}
        {hoverPreview && (
          <HoverPreviewMarker preview={hoverPreview} geo={polygonGeo} />
        )}

        {/* Token overlay */}
        <div className="absolute inset-0">
          {allTokens.map(({ pid, token }) => {
            const pos = tokenPosition(pid, token);
            const movable = pid === selfId && myTurn && state.movableTokenIds.includes(token.id);
            const idx = parseInt(token.id.split("-")[1] ?? "0", 10);
            return (
              <Token
                key={token.id}
                color={state.playerColors[pid]}
                left={pos.left}
                top={pos.top}
                size={
                  polygonGeo
                    ? polygonTokenSize(token.state, polygonGeo.cellSize)
                    : token.state === "yard"
                    ? 7
                    : token.state === "home"
                    ? 4.2
                    : 6
                }
                movable={movable}
                onClick={movable ? () => move(token.id) : undefined}
                onMouseEnter={() => onHoverToken(pid, token)}
                onMouseLeave={clearHoverPreview}
                label={String(idx + 1)}
                cbMode={settings.colorBlindMode}
                celebrating={celebratingIds.has(token.id)}
              />
            );
          })}
        </div>

        {/* Capture sad-faces (briefly visible at the victim's last position) */}
        {captureFaces.map((cf) => (
          <span
            key={cf.id}
            className="capture-face"
            style={{ left: `${cf.left}%`, top: `${cf.top}%` }}
          >
            😵
          </span>
        ))}

        {/* Per-home mini confetti bursts */}
        {homeBursts.map((b) => (
          <MiniBurst key={b.id} left={b.left} top={b.top} color={b.color} />
        ))}
      </div>

      {/* Modals & overlays */}
      {showInstructions && <InstructionsModal onClose={() => setShowInstructions(false)} />}
      {showSettings && <SettingsMenu onClose={() => setShowSettings(false)} />}
      {luckyBanner && (
        <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center">
          <div
            className="lucky-banner bg-gradient-to-r from-amber-500 via-rose-500 to-fuchsia-500 text-white text-2xl font-black px-8 py-4 rounded-2xl shadow-2xl"
            style={{ textShadow: "0 2px 4px rgba(0,0,0,0.4)" }}
          >
            {luckyBanner}
          </div>
        </div>
      )}
      {toast && <Toast text={toast.text} emoji={toast.emoji} color={toast.color} />}
      {Date.now() < confettiUntil && <Confetti />}
      <FloatingReactionsLayer
        reactions={reactions}
        anchorOf={reactionAnchor}
        playerColors={state.playerColors}
      />
      {rains.map((r) => (
        <EmojiRain key={r.id} emoji={r.emoji} />
      ))}
      {showCelebration && state.winnerId && (
        <WinnerCelebration
          winner={players.find((p) => p.id === state.winnerId) ?? { id: state.winnerId, name: "Winner", isHost: false, isReady: false, isConnected: true }}
          color={state.playerColors[state.winnerId] ?? "red"}
        />
      )}
      {showEndCard && state.phase === "finished" && (
        <EndGameCard
          winnerId={state.winnerId ?? null}
          players={players}
          playerColors={state.playerColors}
          stats={state.stats}
          finishedCount={state.finishedCount}
          onClose={() => setShowEndCard(false)}
          onRematch={rematch}
        />
      )}
    </div>
  );
}

/** Convert grid (row, col) to percent (left, top) for absolute positioning. */
function cellToPct(row: number, col: number): { left: number; top: number } {
  return {
    left: ((col + 0.5) / GRID) * 100,
    top: ((row + 0.5) / GRID) * 100,
  };
}

/** Token sizes for the polygon (5-8 player) board, scaled to cell size. */
function polygonTokenSize(
  state: LudoToken["state"],
  cellSize: number
): number {
  if (state === "yard") return cellSize * 1.7;
  if (state === "home") return cellSize * 1.3;
  return cellSize * 1.45;
}

function HoverPreviewMarker({
  preview,
  geo,
}: {
  preview:
    | { kind: "track"; trackPos: number }
    | { kind: "stretch"; stretchPos: number; color: LudoColor }
    | { kind: "home"; color: LudoColor };
  geo: PolygonBoardGeometry | null;
}) {
  let p: { left: number; top: number };
  let hex: string;
  if (geo) {
    if (preview.kind === "track") {
      const pt = geo.trackCells[preview.trackPos];
      p = { left: pt.x, top: pt.y };
      hex = "#fbbf24";
    } else if (preview.kind === "stretch") {
      const pt = geo.stretchCells[preview.color][preview.stretchPos];
      p = { left: pt.x, top: pt.y };
      hex = COLOR_HEX[preview.color];
    } else {
      p = { left: 50, top: 50 };
      hex = COLOR_HEX[preview.color];
    }
  } else if (preview.kind === "track") {
    const c = TRACK_CELLS[preview.trackPos];
    p = cellToPct(c.row, c.col);
    hex = "#fbbf24";
  } else if (preview.kind === "stretch") {
    const c = STRETCH_CELLS[preview.color][preview.stretchPos];
    p = cellToPct(c.row, c.col);
    hex = COLOR_HEX[preview.color];
  } else {
    p = cellToPct(HOME_CENTER.row, HOME_CENTER.col);
    hex = COLOR_HEX[preview.color];
  }
  return (
    <div
      className="pointer-events-none absolute z-10"
      style={{
        left: `${p.left}%`,
        top: `${p.top}%`,
        transform: "translate(-50%, -50%)",
        width: "8%",
        aspectRatio: "1 / 1",
      }}
    >
      <div
        className="w-full h-full rounded-md animate-pulse"
        style={{
          background: `${hex}55`,
          boxShadow: `0 0 0 3px ${hex}, 0 0 18px ${hex}`,
        }}
      />
    </div>
  );
}

function MiniBurst({
  left,
  top,
  color,
}: {
  left: number;
  top: number;
  color: LudoColor;
}) {
  const pieces = Array.from({ length: 14 }, (_, i) => {
    const angle = (i / 14) * Math.PI * 2;
    const dist = 28 + Math.random() * 18;
    return {
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist,
      bg: i % 3 === 0 ? "#fbbf24" : i % 3 === 1 ? "#ffffff" : COLOR_HEX[color],
      rotate: Math.random() * 360,
    };
  });
  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: 0,
        height: 0,
      }}
    >
      {pieces.map((p, i) => (
        <span
          key={i}
          className="mini-burst-piece"
          style={
            {
              backgroundColor: p.bg,
              transform: `rotate(${p.rotate}deg)`,
              ["--dx" as never]: `${p.dx}px`,
              ["--dy" as never]: `${p.dy}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

/** Slight per-color visual offset so overlapping tokens on the same cell don't fully overlap. */
function colorOffset(color: LudoColor): { r: number; c: number } {
  switch (color) {
    case "red":    return { r: -1, c: -1 };
    case "green":  return { r: -1, c: 1 };
    case "yellow": return { r: 1, c: 1 };
    case "blue":   return { r: 1, c: -1 };
    case "purple": return { r: -0.6, c: 0 };
    case "cyan":   return { r: 0, c: 1 };
    case "orange": return { r: 0.6, c: 0 };
    case "brown":  return { r: 0, c: -1 };
  }
}

// ---------------------------------------------------------------------------
// Board SVG: yards, track cells, home stretches, center triangles, safe stars
// ---------------------------------------------------------------------------

function BoardSVG({
  playerColorsInRoom,
  players,
  playerOrder,
  playerColors,
  hasCaptured,
  unlockBurst,
}: {
  playerColorsInRoom: LudoColor[];
  players: Player[];
  playerOrder: string[];
  playerColors: Record<string, LudoColor>;
  hasCaptured: Record<string, boolean>;
  unlockBurst: Record<string, number>;
}) {
  const orderedColors: LudoColor[] = ["red", "green", "yellow", "blue"];
  // Map color -> playerId for this room
  const playerIdByColor: Partial<Record<LudoColor, string | null>> = {};
  for (const pid of playerOrder) {
    const c = playerColors[pid];
    if (c) playerIdByColor[c] = pid;
  }
  function nameFor(color: LudoColor): string | null {
    const pid = playerIdByColor[color];
    if (!pid) return null;
    return players.find((p) => p.id === pid)?.name ?? null;
  }

  // First cell of each home stretch (where the lock sits) — 4 colors on the cross board
  const STRETCH_ENTRY: Partial<Record<LudoColor, { row: number; col: number }>> = {
    red:    { row: 7, col: 1 },
    green:  { row: 1, col: 7 },
    yellow: { row: 7, col: 13 },
    blue:   { row: 13, col: 7 },
  };

  return (
    <svg
      viewBox={`0 0 ${GRID} ${GRID}`}
      className="absolute inset-0 w-full h-full rounded-md shadow-inner"
      style={{ background: "#fafafa" }}
    >
      {/* 4 yard quadrants */}
      {orderedColors.map((color) => {
        const { r0, c0 } = YARD_REGIONS[color];
        const inactive = !playerColorsInRoom.includes(color);
        const name = nameFor(color);
        return (
          <g key={color} opacity={inactive ? 0.35 : 1}>
            <rect x={c0} y={r0} width={6} height={6} fill={COLOR_HEX[color]} />
            <rect x={c0 + 1} y={r0 + 1} width={4} height={4} fill="#ffffff" />
            {YARD_CELLS[color].map((cell, i) => (
              <circle
                key={i}
                cx={cell.col + 0.5}
                cy={cell.row + 0.5}
                r={0.55}
                fill={COLOR_HEX[color]}
                opacity={0.18}
              />
            ))}
            {/* Player name badge inside each yard */}
            {name && (
              <g>
                <rect
                  x={c0 + 0.5}
                  y={r0 + 0.15}
                  width={5}
                  height={0.7}
                  rx={0.35}
                  fill="rgba(255,255,255,0.92)"
                  stroke={COLOR_HEX_DARK[color]}
                  strokeWidth="0.05"
                />
                <text
                  x={c0 + 3}
                  y={r0 + 0.65}
                  textAnchor="middle"
                  fontSize="0.5"
                  fontWeight="bold"
                  fill={COLOR_HEX_DARK[color]}
                  style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}
                >
                  {name.slice(0, 14)}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Track cells (white squares with thin border) */}
      {TRACK_CELLS.map((cell, idx) => (
        <rect
          key={idx}
          x={cell.col}
          y={cell.row}
          width={1}
          height={1}
          fill="#ffffff"
          stroke="#475569"
          strokeWidth={0.04}
        />
      ))}

      {/* Color the entry squares per color */}
      {orderedColors.map((color) => {
        const startMap: Record<string, number> = { red: 0, green: 13, yellow: 26, blue: 39 };
        const startIdx = startMap[color];
        const cell = TRACK_CELLS[startIdx];
        return (
          <rect
            key={color + "-start"}
            x={cell.col}
            y={cell.row}
            width={1}
            height={1}
            fill={COLOR_HEX[color]}
            opacity={0.35}
            stroke="#475569"
            strokeWidth={0.04}
          />
        );
      })}

      {/* Safe-square stars */}
      {[...SAFE_SQUARES].map((pos) => {
        const cell = TRACK_CELLS[pos];
        return (
          <text
            key={"safe" + pos}
            x={cell.col + 0.5}
            y={cell.row + 0.78}
            fontSize={0.7}
            textAnchor="middle"
            fill="#64748b"
          >
            ★
          </text>
        );
      })}

      {/* Home stretches */}
      {orderedColors.map((color) => (
        <g key={color + "-stretch"}>
          {STRETCH_CELLS[color].map((cell, i) => (
            <rect
              key={i}
              x={cell.col}
              y={cell.row}
              width={1}
              height={1}
              fill={COLOR_HEX[color]}
              opacity={0.78}
              stroke="#1e293b"
              strokeWidth={0.04}
            />
          ))}
        </g>
      ))}

      {/* Center: 4 triangles + central diamond */}
      <g>
        {/* Red triangle (left) */}
        <polygon points="6,6 6,9 7.5,7.5" fill={COLOR_HEX.red} />
        {/* Green triangle (top) */}
        <polygon points="6,6 9,6 7.5,7.5" fill={COLOR_HEX.green} />
        {/* Yellow triangle (right) */}
        <polygon points="9,6 9,9 7.5,7.5" fill={COLOR_HEX.yellow} />
        {/* Blue triangle (bottom) */}
        <polygon points="6,9 9,9 7.5,7.5" fill={COLOR_HEX.blue} />
        {/* Center outline */}
        <rect x={6} y={6} width={3} height={3} fill="none" stroke="#1e293b" strokeWidth={0.06} />
      </g>

      {/* Arrows from each color's start square pointing into the track */}
      {orderedColors.map((color) => {
        const dir: Partial<Record<LudoColor, { x: number; y: number; rot: number }>> = {
          red:    { x: 1.5, y: 6.5, rot: 0 },
          green:  { x: 8.5, y: 1.5, rot: 90 },
          yellow: { x: 13.5, y: 7.5, rot: 180 },
          blue:   { x: 6.5, y: 13.5, rot: 270 },
        };
        const d = dir[color];
        if (!d) return null;
        return (
          <g key={color + "-arrow"} transform={`rotate(${d.rot}, ${d.x}, ${d.y})`}>
            <polygon
              points={`${d.x - 0.25},${d.y - 0.15} ${d.x + 0.15},${d.y} ${d.x - 0.25},${d.y + 0.15}`}
              fill={COLOR_HEX_DARK[color]}
              opacity={0.85}
            />
          </g>
        );
      })}

      {/* Mandatory-capture lock at each player's home-stretch entrance */}
      {orderedColors.map((color) => {
        const pid = playerIdByColor[color];
        if (!pid) return null;
        const captured = hasCaptured[pid] ?? false;
        const burstAt = unlockBurst[pid];
        const cell = STRETCH_ENTRY[color];
        if (!cell) return null;
        const cx = cell.col + 0.5;
        const cy = cell.row + 0.5;
        if (!captured && !burstAt) {
          // Show locked padlock
          return (
            <g key={color + "-lock"} className="lock-pulse" style={{ transformOrigin: `${cx}px ${cy}px` }}>
              <circle cx={cx} cy={cy} r={0.45} fill="rgba(0,0,0,0.45)" />
              <text x={cx} y={cy + 0.22} textAnchor="middle" fontSize="0.7">
                🔒
              </text>
            </g>
          );
        }
        if (burstAt) {
          // Show unlock burst briefly
          return (
            <g key={color + "-unlock"} className="unlock-burst" style={{ transformOrigin: `${cx}px ${cy}px` }}>
              <circle cx={cx} cy={cy} r={0.5} fill={COLOR_HEX[color]} opacity={0.85} />
              <text x={cx} y={cy + 0.25} textAnchor="middle" fontSize="0.8">
                🔓
              </text>
            </g>
          );
        }
        return null;
      })}
    </svg>
  );
}
