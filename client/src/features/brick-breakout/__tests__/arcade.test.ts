import { describe, expect, it } from "vitest";
import { createRun, advance, launch, moveTo, nextSector, pauseRun, resumeRun, applyPower, STEP, WIDTH, HEIGHT, PADDLE_Y, RADIUS, type ArcadeState } from "../arcade/rules";

const playing = (): ArcadeState => launch(createRun("campaign", "2026-10-27", 42));
describe("neon breakout simulation", () => {
  it("reproduces UTC daily layouts, launches and drop streams independently of a supplied seed", () => {
    const a = createRun("daily", "2026-10-27", 100);
    const b = createRun("daily", "2026-10-27", 200);
    expect(a).toEqual(b);
    expect(createRun("daily", "2026-10-28").bricks).not.toEqual(a.bricks);
    expect(launch(a)).toEqual(launch(b));
  });
  it("does not mutate the input state", () => {
    const state = playing();
    const before = JSON.stringify(state);
    advance(state, STEP);
    expect(JSON.stringify(state)).toBe(before);
  });
  it("clamps paddle input and keeps an attached ball with it", () => {
    const state = moveTo(createRun("campaign"), -999);
    expect(state.paddleX).toBe(state.paddleWidth / 2);
    expect(state.balls[0].x).toBe(state.paddleX);
  });
  it("reflects fast balls at walls without tunnelling through bricks", () => {
    const state = playing();
    state.balls = [{ id: 1, x: WIDTH - RADIUS - 1, y: 400, vx: 900, vy: -200 }];
    expect(advance(state, STEP).balls[0].vx).toBeLessThan(0);
    const brick = state.bricks[0];
    state.bricks = [{ ...brick, hp: 1 }];
    state.balls = [{ id: 1, x: brick.x + brick.w / 2, y: brick.y + brick.h + 12, vx: 0, vy: -3000 }];
    expect(advance(state, STEP).destroyed).toBe(1);
  });
  it("counts a shared brick once when two balls arrive together", () => {
    const state = playing();
    const brick = { ...state.bricks[0], hp: 1 };
    state.bricks = [brick];
    const ball = { id: 1, x: brick.x + 10, y: brick.y + brick.h + 1 + RADIUS, vx: 0, vy: -300 };
    state.balls = [ball, { ...ball, id: 2 }];
    const next = advance(state, STEP);
    expect(next.destroyed).toBe(1);
    expect(next.score).toBe(100 + 500);
  });
  it("loses a life only after the last ball leaves, and consumes a shield once", () => {
    const state = playing();
    state.balls = [{ id: 1, x: 10, y: HEIGHT + 20, vx: 0, vy: 300 }, { id: 2, x: 50, y: 400, vx: 0, vy: -300 }];
    expect(advance(state, STEP).lives).toBe(3);
    state.balls = [state.balls[0]];
    expect(advance(state, STEP).lives).toBe(2);
    expect(advance(state, STEP).status).toBe("serve");
    const shielded = applyPower(playing(), "shield");
    shielded.balls = [{ id: 1, x: 10, y: HEIGHT - 20, vx: 0, vy: 900 }];
    const saved = advance(shielded, STEP);
    expect(saved.lives).toBe(3);
    expect(saved.shield).toBe(false);
    expect(saved.balls[0].vy).toBeLessThan(0);
  });
  it("caps multiball at three and refreshes rather than compounds expansion", () => {
    const state = applyPower(applyPower(playing(), "multi"), "multi");
    expect(state.balls).toHaveLength(3);
    const expanded = applyPower(applyPower(state, "expand"), "expand");
    expect(expanded.paddleWidth).toBe(120);
    expect(expanded.expandUntil).toBe(12000);
    const expired = advance({ ...expanded, elapsed: 12001 }, STEP);
    expect(expired.paddleWidth).toBe(84);
  });
  it("pierces reinforced bricks without reversing direction", () => {
    const state = applyPower(playing(), "pierce");
    const brick = { ...state.bricks[0], hp: 3 };
    state.bricks = [brick];
    state.balls = [{ id: 1, x: brick.x + 10, y: brick.y + brick.h + 1 + RADIUS, vx: 0, vy: -300 }];
    const next = advance(state, STEP);
    expect(next.destroyed).toBe(1);
    expect(next.balls[0].vy).toBeLessThan(0);
  });
  it("freezes simulation and timer while paused; resumes the prior serving state", () => {
    const state = pauseRun(createRun("score-attack"));
    expect(advance(state, 30000)).toBe(state);
    expect(resumeRun(state).status).toBe("serve");
    expect(resumeRun(state).notice).not.toContain("timer is frozen");
    expect(resumeRun(pauseRun(playing())).notice).not.toContain("Paused");
  });
  it("ends timed runs exactly at the limit even while waiting to serve", () => {
    const state = { ...createRun("score-attack"), elapsed: 120000 - STEP };
    expect(advance(state, STEP).status).toBe("finished");
    expect(advance(state, STEP).elapsed).toBe(120000);
  });
  it("rejects non-finite pointer positions without corrupting the paddle", () => {
    const state = playing();
    expect(moveTo(state, Number.NaN)).toBe(state);
  });
  it("catches power-up capsules only within paddle reach", () => {
    const state = playing();
    state.drops = [{ id: 20, x: state.paddleX, y: PADDLE_Y - 10, power: "multi" },
      { id: 21, x: 1, y: PADDLE_Y - 10, power: "shield" }];
    const next = advance(state, STEP);
    expect(next.balls).toHaveLength(3);
    expect(next.shield).toBe(false);
    expect(next.drops).toHaveLength(1);
  });
  it("makes reinforced damage distinct from destruction and resets an expired combo", () => {
    const state = playing();
    const brick = { ...state.bricks[0], hp: 2, maxHp: 2 };
    state.bricks = [brick];
    state.balls = [{ id: 1, x: brick.x + 10, y: brick.y + brick.h + RADIUS + 1, vx: 0, vy: -300 }];
    state.combo = 8; state.elapsed = 6000; state.lastHit = 0;
    const next = advance(state, STEP);
    expect(next.bricks[0].hp).toBe(1);
    expect(next.destroyed).toBe(0);
    expect(next.score).toBe(0);
    expect(next.combo).toBe(0);
  });
  it("clears the eighth campaign sector and preserves the exact final result", () => {
    const state = playing();
    state.level = 8;
    state.bricks = [{ ...state.bricks[0], hp: 0 }];
    const finished = advance(state, STEP);
    expect(finished.status).toBe("finished");
    expect(finished.result).toBe("cleared");
    expect(finished.score).toBe(4000);
    expect(advance(finished, STEP)).toBe(finished);
  });
  it("advances sectors without resetting a timed run's clock or score", () => {
    const state = { ...createRun("daily"), status: "sector-clear" as const, score: 1200, elapsed: 65000 };
    const next = nextSector(state);
    expect(next).toMatchObject({ status: "serve", level: 2, score: 1200, elapsed: 65000 });
    expect(next.bricks).not.toEqual(state.bricks);
  });
  it("handles high-speed paddle contact and caps a large background delta", () => {
    const state = playing();
    state.balls = [{ id: 1, x: state.paddleX + 30, y: PADDLE_Y - 20, vx: 0, vy: 3000 }];
    const next = advance(state, 30000);
    expect(next.balls[0].vy).toBeLessThan(0);
    expect(next.elapsed).toBeCloseTo(STEP);
    expect(next.returns).toBe(1);
  });
});
