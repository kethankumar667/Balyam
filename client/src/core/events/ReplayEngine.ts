import type { DomainEvent, RoomTimeline, StateProjector } from "@shared/events/EventContracts";
import { projectState } from "./projections/StateProjector";

export type ReplayStateListener = (currentSeq: number, totalEvents: number, isPlaying: boolean) => void;

/**
 * Deterministic Replay Engine for Room Timelines.
 * Enables time-travel debugging, match playback, and incremental state reconstruction.
 */
export class ReplayEngine {
  private timeline: RoomTimeline | null = null;
  private currentEventIndex = -1; // -1 means at initial state (before event 1)
  private playTimer: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<ReplayStateListener> = new Set();

  /**
   * Loads a room timeline into the replay buffer and resets playback position.
   */
  public loadTimeline(timeline: RoomTimeline): void {
    this.pause();
    this.timeline = {
      ...timeline,
      events: [...timeline.events].sort((a, b) => a.sequenceNumber - b.sequenceNumber),
    };
    this.currentEventIndex = -1;
    this.notify();
  }

  public getTotalEvents(): number {
    return this.timeline?.events.length ?? 0;
  }

  public getCurrentSequence(): number {
    if (!this.timeline || this.currentEventIndex < 0) return 0;
    const current = this.timeline.events[this.currentEventIndex];
    return current?.sequenceNumber ?? 0;
  }

  public isPlaying(): boolean {
    return this.playTimer !== null;
  }

  /**
   * Steps one event forward in the timeline.
   */
  public stepForward(): DomainEvent | null {
    if (!this.timeline) return null;
    if (this.currentEventIndex + 1 >= this.timeline.events.length) {
      this.pause();
      return null;
    }

    this.currentEventIndex += 1;
    const evt = this.timeline.events[this.currentEventIndex] ?? null;
    this.notify();
    return evt;
  }

  /**
   * Steps one event backward in the timeline.
   */
  public stepBackward(): DomainEvent | null {
    if (!this.timeline || this.currentEventIndex < 0) return null;
    this.currentEventIndex -= 1;
    const evt = this.currentEventIndex >= 0 ? (this.timeline.events[this.currentEventIndex] ?? null) : null;
    this.notify();
    return evt;
  }

  /**
   * Jumps directly to a specific sequence number in the timeline.
   */
  public jumpToSequence(targetSeq: number): void {
    if (!this.timeline) return;

    if (targetSeq <= 0) {
      this.currentEventIndex = -1;
    } else {
      const idx = this.timeline.events.findIndex((e) => e.sequenceNumber >= targetSeq);
      if (idx === -1) {
        // Target is past the end, jump to last event
        this.currentEventIndex = this.timeline.events.length - 1;
      } else {
        this.currentEventIndex = idx;
      }
    }

    this.notify();
  }

  /**
   * Starts playback of the timeline forward in time.
   */
  public play(intervalMs = 500, onEvent?: (evt: DomainEvent) => void): void {
    if (this.isPlaying() || !this.timeline) return;

    this.playTimer = setInterval(() => {
      const evt = this.stepForward();
      if (evt) {
        onEvent?.(evt);
      } else {
        this.pause();
      }
    }, intervalMs);

    this.notify();
  }

  /**
   * Pauses timeline playback.
   */
  public pause(): void {
    if (this.playTimer) {
      clearInterval(this.playTimer);
      this.playTimer = null;
      this.notify();
    }
  }

  /**
   * Returns all events that have occurred up to the current playback position.
   */
  public getEventsUpToCurrent(): DomainEvent[] {
    if (!this.timeline || this.currentEventIndex < 0) return [];
    return this.timeline.events.slice(0, this.currentEventIndex + 1);
  }

  /**
   * Reconstructs state at current replay position using a pure state projector.
   */
  public projectCurrentState<TState>(projector: StateProjector<TState>): TState {
    const events = this.getEventsUpToCurrent();
    return projectState(events, projector);
  }

  /**
   * Subscribes to replay state changes.
   */
  public subscribe(listener: ReplayStateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const seq = this.getCurrentSequence();
    const total = this.getTotalEvents();
    const playing = this.isPlaying();
    for (const listener of this.listeners) {
      try {
        listener(seq, total, playing);
      } catch {
        // Guard against listener failure
      }
    }
  }

  /**
   * Resets replay buffer and clears timers.
   */
  public reset(): void {
    this.pause();
    this.timeline = null;
    this.currentEventIndex = -1;
    this.listeners.clear();
  }
}

export const replayEngine = new ReplayEngine();
