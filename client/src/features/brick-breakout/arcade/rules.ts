import type { BreakoutArcadeMode } from "@shared/profile/GameModes";

export const WIDTH = 420;
export const HEIGHT = 620;
export const RADIUS = 6;
export const STEP = 1000 / 120;
export const PADDLE_Y = 570;
export const TIME_LIMIT = 120000;
export const CAMPAIGN_SECTORS = 8;
const BASE_PADDLE = 84;
const COMBO_WINDOW = 2500;
const POWER_DURATION = 12000;

export type Mode = BreakoutArcadeMode;
export type Power = "multi" | "expand" | "shield" | "pierce";
export type Status = "serve" | "playing" | "paused" | "sector-clear" | "finished";
export interface Orb { id: number; x: number; y: number; vx: number; vy: number }
export interface NeonBrick { id: number; x: number; y: number; w: number; h: number; hp: number; maxHp: number; color: number; drop?: Power }
export interface Capsule { id: number; x: number; y: number; power: Power }
export interface Impact { x: number; y: number; color: number }
export interface ArcadeState {
  mode: Mode; date: string; seed: number; rng: number;
  status: Status; pausedFrom: Exclude<Status, "paused">;
  level: number; paddleX: number; paddleWidth: number;
  balls: Orb[]; bricks: NeonBrick[]; drops: Capsule[]; impacts: Impact[];
  score: number; lives: number; elapsed: number; combo: number; bestCombo: number;
  lastHit: number; destroyed: number; returns: number; misses: number;
  expandUntil: number; pierceUntil: number; shield: boolean; nextId: number;
  notice: string; result: "cleared" | "time" | "lives" | null;
}
export const MODE_TITLES: Record<Mode, string> = { campaign: "Campaign", "score-attack": "Score Attack", daily: "Daily Challenge" };
export const POWER_LABELS: Record<Power, string> = { multi: "Multiball", expand: "Wide paddle", shield: "Floor shield", pierce: "Piercing ball" };
export const COLORS = ["#67e8f9", "#a5b4fc", "#f0abfc", "#fda4af", "#fde68a", "#6ee7b7"];
export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export function dailySeed(date: string): number {
  let seed = 2166136261;
  for (const char of date) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  return seed >>> 0;
}
function random(seed: number): [number, number] {
  const next = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return [next / 4294967296, next];
}
export function makeSector(level: number, seed: number): NeonBrick[] {
  let rng = seed ^ Math.imul(level, 7919);
  const bricks: NeonBrick[] = [];
  const powers: Power[] = ["expand", "multi", "shield", "pierce"];
  const rows = Math.min(7, 3 + Math.ceil(level / 2));
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < 8; col++) {
      let roll: number;
      [roll, rng] = random(rng);
      const mirrored = Math.min(col, 7 - col);
      const pattern = (level - 1) % 4;
      if (pattern === 1 && (row + mirrored) % 3 === 0) continue;
      if (pattern === 2 && row < 2 && mirrored < 2 - row) continue;
      if (pattern === 3 && row % 2 === 1 && mirrored % 2 === 0) continue;
      const hp = row < Math.floor(level / 3) ? 3 : row < Math.floor(level / 2) ? 2 : 1;
      bricks.push({ id: level * 100 + row * 8 + col, x: 15 + col * 49, y: 64 + row * 27,
        w: 45, h: 21, hp, maxHp: hp, color: (row + level - 1) % COLORS.length,
        drop: roll < 0.18 ? powers[Math.floor(roll / 0.18 * powers.length)] : undefined });
    }
  }
  return bricks;
}
export function createRun(mode: Mode, date = new Date().toISOString().slice(0, 10), seed = 42): ArcadeState {
  const actualSeed = mode === "daily" ? dailySeed(date) : seed >>> 0;
  return {
    mode, date, seed: actualSeed, rng: actualSeed, status: "serve", pausedFrom: "serve",
    level: 1, paddleX: WIDTH / 2, paddleWidth: BASE_PADDLE,
    balls: [{ id: 1, x: WIDTH / 2, y: PADDLE_Y - RADIUS - 2, vx: 0, vy: 0 }],
    bricks: makeSector(1, actualSeed), drops: [], impacts: [], score: 0, lives: 3,
    elapsed: 0, combo: 0, bestCombo: 0, lastHit: -COMBO_WINDOW,
    destroyed: 0, returns: 0, misses: 0, expandUntil: 0, pierceUntil: 0,
    shield: false, nextId: 2, notice: "Move your paddle, then launch.", result: null,
  };
}
export function moveTo(state: ArcadeState, x: number): ArcadeState {
  if (!Number.isFinite(x) || !["serve", "playing"].includes(state.status)) return state;
  const paddleX = clamp(x, state.paddleWidth / 2, WIDTH - state.paddleWidth / 2);
  return { ...state, paddleX, balls: state.status === "serve" ? state.balls.map(b => ({ ...b, x: paddleX })) : state.balls };
}
export function launch(state: ArcadeState): ArcadeState {
  if (state.status !== "serve") return state;
  const [roll, rng] = random(state.rng);
  const speed = 300 + Math.min(state.level - 1, 10) * 18;
  const vx = (roll < 0.5 ? -1 : 1) * speed * 0.35;
  return { ...state, rng, status: "playing", notice: "Catch capsules to power up.",
    balls: state.balls.map(b => ({ ...b, vx, vy: -Math.sqrt(speed * speed - vx * vx) })) };
}
export function pauseRun(state: ArcadeState): ArcadeState {
  if (state.status === "paused" || state.status === "finished") return state;
  return { ...state, pausedFrom: state.status, status: "paused", notice: "Paused. Your timer is frozen." };
}
export const resumeRun = (state: ArcadeState): ArcadeState => state.status === "paused" ? {
  ...state, status: state.pausedFrom,
  notice: state.pausedFrom === "serve" ? "Move your paddle, then launch." :
    state.pausedFrom === "sector-clear" ? "Sector cleared. Launch the next sector." : "Flight resumed. Catch capsules to power up.",
} : state;

export function applyPower(state: ArcadeState, power: Power): ArcadeState {
  const next = { ...state, notice: `${POWER_LABELS[power]} activated.` };
  if (power === "shield") next.shield = true;
  if (power === "expand") {
    next.expandUntil = state.elapsed + POWER_DURATION;
    next.paddleWidth = 120;
    next.paddleX = clamp(next.paddleX, 60, WIDTH - 60);
  }
  if (power === "pierce") next.pierceUntil = state.elapsed + POWER_DURATION;
  if (power === "multi" && state.balls.length > 0) {
    next.balls = state.balls.map(b => ({ ...b }));
    const first = state.balls[0];
    for (const direction of [-1, 1]) {
      if (next.balls.length === 3) break;
      const speed = Math.hypot(first.vx, first.vy) || 300;
      next.balls.push({ ...first, id: next.nextId++, vx: direction * speed * 0.65, vy: -speed * Math.sqrt(1 - 0.65 ** 2) });
    }
  }
  return next;
}
export function nextSector(state: ArcadeState): ArcadeState {
  if (state.status !== "sector-clear") return state;
  const level = state.level + 1;
  return { ...state, level, status: "serve", paddleWidth: BASE_PADDLE, expandUntil: 0, pierceUntil: 0,
    shield: false, drops: [], combo: 0, notice: `Sector ${level}. Ready to launch.`,
    bricks: makeSector(level, state.seed),
    balls: [{ id: state.nextId, x: state.paddleX, y: PADDLE_Y - RADIUS - 2, vx: 0, vy: 0 }], nextId: state.nextId + 1 };
}

function hitBrick(state: ArcadeState, brick: NeonBrick, piercing: boolean) {
  brick.hp = piercing ? 0 : brick.hp - 1;
  state.impacts.push({ x: brick.x + brick.w / 2, y: brick.y + brick.h / 2, color: brick.color });
  if (brick.hp > 0) return;
  state.combo = state.elapsed - state.lastHit <= COMBO_WINDOW ? Math.min(10, state.combo + 1) : 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.lastHit = state.elapsed;
  state.destroyed++;
  state.score += 100 * brick.maxHp * state.combo;
  if (brick.drop) state.drops.push({ id: state.nextId++, x: brick.x + brick.w / 2, y: brick.y + brick.h / 2, power: brick.drop });
}
function reflectBrick(ball: Orb, brick: NeonBrick, oldX: number, oldY: number) {
  if (oldY + RADIUS <= brick.y || oldY - RADIUS >= brick.y + brick.h) {
    ball.vy *= -1;
    ball.y = oldY;
  } else {
    ball.vx *= -1;
    ball.x = oldX;
  }
}
function stepBall(state: ArcadeState, ball: Orb, seconds: number) {
  const steps = Math.max(1, Math.ceil(Math.hypot(ball.vx, ball.vy) * seconds / (RADIUS / 2)));
  const piercing = state.pierceUntil > state.elapsed;
  for (let i = 0; i < steps; i++) {
    const oldX = ball.x;
    const oldY = ball.y;
    ball.x += ball.vx * seconds / steps;
    ball.y += ball.vy * seconds / steps;
    if (ball.x < RADIUS || ball.x > WIDTH - RADIUS) {
      ball.x = clamp(ball.x, RADIUS, WIDTH - RADIUS);
      ball.vx *= -1;
    }
    if (ball.y < RADIUS) { ball.y = RADIUS; ball.vy = Math.abs(ball.vy); }
    if (ball.vy > 0 && oldY + RADIUS <= PADDLE_Y && ball.y + RADIUS >= PADDLE_Y &&
      Math.abs(ball.x - state.paddleX) <= state.paddleWidth / 2 + RADIUS) {
      const ratio = clamp((ball.x - state.paddleX) / (state.paddleWidth / 2), -1, 1);
      const speed = clamp(Math.hypot(ball.vx, ball.vy) + 3, 300, 520);
      const angle = ratio * Math.PI / 3;
      ball.vx = Math.sin(angle) * speed || 30;
      ball.vy = -Math.sqrt(speed ** 2 - ball.vx ** 2);
      ball.y = PADDLE_Y - RADIUS;
      state.returns++;
    }
    if (state.shield && ball.vy > 0 && ball.y >= HEIGHT - 25) {
      ball.y = HEIGHT - 25; ball.vy = -Math.abs(ball.vy); state.shield = false;
      state.notice = "Floor shield used.";
    }
    const brick = state.bricks.find(b => b.hp > 0 && ball.x + RADIUS > b.x && ball.x - RADIUS < b.x + b.w &&
      ball.y + RADIUS > b.y && ball.y - RADIUS < b.y + b.h);
    if (brick) {
      hitBrick(state, brick, piercing);
      if (!piercing) reflectBrick(ball, brick, oldX, oldY);
    }
  }
}
function updateDrops(state: ArcadeState, seconds: number): ArcadeState {
  let next = state;
  const kept: Capsule[] = [];
  for (const drop of state.drops) {
    const y = drop.y + 140 * seconds;
    if (drop.y <= PADDLE_Y + 12 && y >= PADDLE_Y - 10 && Math.abs(drop.x - next.paddleX) <= next.paddleWidth / 2 + 10) {
      next = applyPower(next, drop.power);
    } else if (y < HEIGHT + 20) kept.push({ ...drop, y });
  }
  return { ...next, drops: kept };
}
function finishStep(state: ArcadeState): ArcadeState {
  if (state.bricks.every(b => b.hp <= 0)) {
    const won = state.mode === "campaign" && state.level >= CAMPAIGN_SECTORS;
    return { ...state, status: won ? "finished" : "sector-clear", score: state.score + 500 * state.level,
      result: won ? "cleared" : null, notice: won ? "Campaign complete. All eight sectors cleared!" : "Sector cleared. Launch the next sector." };
  }
  if (state.balls.length > 0) return state;
  const lives = state.lives - 1;
  return { ...state, lives, misses: state.misses + 1, combo: 0, status: lives > 0 ? "serve" : "finished",
    result: lives > 0 ? null : "lives", drops: [], shield: false, expandUntil: 0, pierceUntil: 0, paddleWidth: BASE_PADDLE,
    balls: lives > 0 ? [{ id: state.nextId++, x: state.paddleX, y: PADDLE_Y - RADIUS - 2, vx: 0, vy: 0 }] : [],
    notice: lives > 0 ? "Ball lost. Move your paddle and launch again." : "Run complete. Try a new angle." };
}
/** Called only by the fixed-step loop. Large caller deltas cannot cause a catch-up life loss. */
export function advance(state: ArcadeState, delta: number): ArcadeState {
  if (state.status === "paused" || state.status === "finished" || !Number.isFinite(delta) || delta <= 0) return state;
  const ms = Math.min(delta, STEP);
  const elapsed = Math.min(TIME_LIMIT, state.elapsed + ms);
  if (state.mode !== "campaign" && elapsed >= TIME_LIMIT - 0.001) {
    return { ...state, elapsed: TIME_LIMIT, status: "finished", result: "time", notice: "Time. Your two-minute run is complete." };
  }
  let next: ArcadeState = { ...state, elapsed: state.mode === "campaign" ? state.elapsed + ms : elapsed,
    balls: state.balls.map(b => ({ ...b })), bricks: state.bricks.map(b => ({ ...b })), impacts: [], drops: [...state.drops] };
  next.paddleWidth = next.expandUntil > next.elapsed ? 120 : BASE_PADDLE;
  if (next.elapsed - next.lastHit > COMBO_WINDOW) next.combo = 0;
  if (next.status !== "playing") return next;
  for (const ball of next.balls) stepBall(next, ball, ms / 1000);
  next.balls = next.balls.filter(b => b.y < HEIGHT + RADIUS);
  next = updateDrops(next, ms / 1000);
  return finishStep(next);
}
