/**
 * A jitter buffer for server snapshots.
 *
 * Both real-time games were drawing the newest broadcast tweened over a FIXED
 * duration — Snake over `state.speedMs`, Space War over `1000/TICK_HZ`. On a
 * perfect connection that is exactly right. On a phone it is the stutter
 * players keep reporting, and the reason is arithmetic rather than bandwidth:
 *
 *   packet N arrives ─┐            packet N+1 arrives ─┐
 *                     │◀── tween 120ms ──▶│◀ frozen ──▶│
 *                     └───────────────────┴────────────┘
 *                                          ^ every millisecond of jitter
 *                                            becomes a visible stall
 *
 * The tween finished on schedule and then had nothing to move toward, so the
 * snake glided, froze, glided, froze. Wi‑Fi that wobbles by 15ms produces a
 * 15ms freeze eight times a second, which reads as "laggy" even though every
 * position was delivered on time and the simulation never missed a step.
 *
 * The fix is the standard one from netcode: don't render the present, render a
 * fixed distance into the PAST and interpolate between two snapshots that have
 * both already arrived. A packet that runs 15ms late is then simply consumed
 * 15ms later — there is no frame that needs it yet, so nothing stalls.
 *
 * How far into the past is measured, not guessed: one server step plus twice
 * the observed arrival jitter. A flawless connection pays one step (exactly
 * what the old code paid) and a wobbly one pays a little more, which is the
 * trade you want — latency in proportion to how unreliable the link actually
 * is, rather than a constant that is wrong for everyone.
 */

export interface TimelineSample<T> {
  /** The older of the two snapshots being blended. */
  prev: T;
  /** The newer of the two. */
  cur: T;
  /** Blend factor, 0 = at `prev`, 1 = at `cur`. Always clamped to [0,1]. */
  t: number;
  /** True when the buffer ran dry and `cur` is being held. */
  starved: boolean;
}

export interface TimelineOptions {
  /** Nominal server step, in ms. The starting estimate for pacing. */
  stepMs: number;
  /**
   * Hard floor on the render delay, as a multiple of the step. Below 1 the
   * buffer cannot cover a single late packet, so 1 is the sensible minimum.
   */
  minDelaySteps?: number;
  /** Ceiling on the render delay, as a multiple of the step. */
  maxDelaySteps?: number;
  /** Snapshots retained. Guards against growth while the tab is hidden. */
  capacity?: number;
}

interface Entry<T> {
  state: T;
  at: number;
}

export class SnapshotTimeline<T> {
  private buf: Entry<T>[] = [];
  private stepMs: number;
  private readonly minDelaySteps: number;
  private readonly maxDelaySteps: number;
  private readonly capacity: number;

  /** Smoothed gap between arrivals. Seeded with the nominal step. */
  private interval: number;
  /** Smoothed mean absolute deviation of that gap — the jitter estimate. */
  private jitter = 0;

  constructor(opts: TimelineOptions) {
    this.stepMs = Math.max(1, opts.stepMs);
    this.interval = this.stepMs;
    this.minDelaySteps = opts.minDelaySteps ?? 1;
    this.maxDelaySteps = opts.maxDelaySteps ?? 3;
    this.capacity = opts.capacity ?? 24;
  }

  /**
   * The engine changed pace (Snake speeds up as it eats). Re-seed the
   * estimate rather than waiting for the smoothing to walk there, or the
   * buffer sits at the old depth through the whole transition.
   */
  setStepMs(ms: number): void {
    const next = Math.max(1, ms);
    if (next === this.stepMs) return;
    this.stepMs = next;
    this.interval = next;
  }

  /** Record a broadcast. `at` should be the moment it arrived. */
  push(state: T, at: number): void {
    const last = this.buf[this.buf.length - 1];
    if (last) {
      const gap = at - last.at;
      // A gap several steps long is a stall or a backgrounded tab, not the
      // connection's normal rhythm. Folding it into the average would inflate
      // the buffer for the next minute over one hiccup.
      if (gap > 0 && gap < this.stepMs * 4) {
        this.jitter = this.jitter * 0.8 + Math.abs(gap - this.interval) * 0.2;
        this.interval = this.interval * 0.8 + gap * 0.2;
      }
      // Monotonic timestamps keep `sample` honest; a clock that goes backwards
      // would produce a negative denominator.
      if (at <= last.at) at = last.at + 1;
    }
    this.buf.push({ state, at });
    if (this.buf.length > this.capacity) {
      this.buf.splice(0, this.buf.length - this.capacity);
    }
  }

  /** How far behind live the timeline is currently rendering, in ms. */
  delayMs(): number {
    const base = Math.max(this.stepMs, this.interval);
    return clamp(base + this.jitter * 2, this.stepMs * this.minDelaySteps, this.stepMs * this.maxDelaySteps);
  }

  /** The pair of snapshots straddling the render clock, and where between them. */
  sample(now: number): TimelineSample<T> | null {
    const n = this.buf.length;
    if (n === 0) return null;
    if (n === 1) {
      return { prev: this.buf[0].state, cur: this.buf[0].state, t: 1, starved: true };
    }

    const target = now - this.delayMs();

    // Still filling: the buffer has nothing old enough to render yet. Hold the
    // oldest rather than snapping forward to live and rewinding a frame later.
    if (target <= this.buf[0].at) {
      return { prev: this.buf[0].state, cur: this.buf[0].state, t: 1, starved: false };
    }

    const last = this.buf[n - 1];
    if (target >= last.at) {
      // Buffer ran dry — the next packet has not landed. Hold the newest known
      // state. Extrapolating here is what causes rubber-banding.
      return { prev: this.buf[n - 2].state, cur: last.state, t: 1, starved: true };
    }

    let i = 0;
    for (let k = n - 2; k >= 0; k--) {
      if (this.buf[k].at <= target) {
        i = k;
        break;
      }
    }

    // Everything before `i` can never be read again.
    if (i > 0) {
      this.buf.splice(0, i);
      i = 0;
    }

    const a = this.buf[i];
    const b = this.buf[i + 1];
    const span = b.at - a.at;
    const t = span <= 0 ? 1 : clamp((target - a.at) / span, 0, 1);
    return { prev: a.state, cur: b.state, t, starved: false };
  }

  /** Newest snapshot pushed, regardless of the render clock. */
  latest(): T | null {
    const last = this.buf[this.buf.length - 1];
    return last ? last.state : null;
  }

  reset(): void {
    this.buf = [];
    this.jitter = 0;
    this.interval = this.stepMs;
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
