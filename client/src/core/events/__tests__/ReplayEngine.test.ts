import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { replayEngine } from "../ReplayEngine";
import { RoomMetadataProjector } from "../projections/StateProjector";
import type { RoomTimeline } from "@shared/events/EventContracts";

describe("Event Sourcing — ReplayEngine", () => {
  const sampleTimeline: RoomTimeline = {
    roomId: "REPLAY_01",
    createdAt: 1000,
    events: [
      {
        id: "e1",
        timestamp: 1000,
        roomId: "REPLAY_01",
        playerId: "p1",
        type: "ROOM_CREATED",
        sequenceNumber: 1,
        payload: { code: "REPLAY_01", game: "ludo", hostId: "p1", isCustomName: false, timestamp: 1000 },
      },
      {
        id: "e2",
        timestamp: 1020,
        roomId: "REPLAY_01",
        playerId: "p2",
        type: "PLAYER_JOINED",
        sequenceNumber: 2,
        payload: { code: "REPLAY_01", playerId: "p2", name: "Bob", isBot: false, timestamp: 1020 },
      },
      {
        id: "e3",
        timestamp: 1040,
        roomId: "REPLAY_01",
        type: "GAME_STARTED",
        sequenceNumber: 3,
        payload: { code: "REPLAY_01", game: "ludo", playersCount: 2, timestamp: 1040 },
      },
      {
        id: "e4",
        timestamp: 1060,
        roomId: "REPLAY_01",
        playerId: "p1",
        type: "MOVE_MADE",
        sequenceNumber: 4,
        payload: { code: "REPLAY_01", playerId: "p1", game: "ludo", moveType: "roll", timestamp: 1060 },
      },
      {
        id: "e5",
        timestamp: 1080,
        roomId: "REPLAY_01",
        type: "GAME_FINISHED",
        sequenceNumber: 5,
        payload: { code: "REPLAY_01", game: "ludo", winnerId: "p1", durationMs: 40000, timestamp: 1080 },
      },
    ],
  };

  beforeEach(() => {
    replayEngine.reset();
    replayEngine.loadTimeline(sampleTimeline);
  });

  afterEach(() => {
    replayEngine.reset();
  });

  it("loads timeline and initializes at sequence 0", () => {
    expect(replayEngine.getTotalEvents()).toBe(5);
    expect(replayEngine.getCurrentSequence()).toBe(0);
    expect(replayEngine.getEventsUpToCurrent()).toHaveLength(0);
  });

  it("steps forward and backward through event history", () => {
    const step1 = replayEngine.stepForward();
    expect(step1?.type).toBe("ROOM_CREATED");
    expect(replayEngine.getCurrentSequence()).toBe(1);

    const step2 = replayEngine.stepForward();
    expect(step2?.type).toBe("PLAYER_JOINED");
    expect(replayEngine.getCurrentSequence()).toBe(2);

    const stepBack = replayEngine.stepBackward();
    expect(stepBack?.type).toBe("ROOM_CREATED");
    expect(replayEngine.getCurrentSequence()).toBe(1);
  });

  it("jumps directly to specific sequence numbers", () => {
    replayEngine.jumpToSequence(4);
    expect(replayEngine.getCurrentSequence()).toBe(4);
    expect(replayEngine.getEventsUpToCurrent()).toHaveLength(4);

    replayEngine.jumpToSequence(0);
    expect(replayEngine.getCurrentSequence()).toBe(0);
    expect(replayEngine.getEventsUpToCurrent()).toHaveLength(0);
  });

  it("projects current state deterministically at any step", () => {
    // At sequence 0 (before events)
    let state = replayEngine.projectCurrentState(RoomMetadataProjector);
    expect(state.status).toBe("waiting");
    expect(state.players).toHaveLength(0);

    // Jump to sequence 2 (player joined)
    replayEngine.jumpToSequence(2);
    state = replayEngine.projectCurrentState(RoomMetadataProjector);
    expect(state.players).toHaveLength(1);
    expect(state.players[0]?.name).toBe("Bob");
    expect(state.status).toBe("waiting");

    // Jump to sequence 3 (game started)
    replayEngine.jumpToSequence(3);
    state = replayEngine.projectCurrentState(RoomMetadataProjector);
    expect(state.status).toBe("playing");

    // Jump to sequence 5 (game finished)
    replayEngine.jumpToSequence(5);
    state = replayEngine.projectCurrentState(RoomMetadataProjector);
    expect(state.status).toBe("finished");
    expect(state.winnerId).toBe("p1");
    expect(state.movesCount).toBe(1);
  });

  it("plays events forward automatically using timers", () => {
    vi.useFakeTimers();

    const dispatched: string[] = [];
    replayEngine.play(100, (evt) => {
      dispatched.push(evt.type);
    });

    expect(replayEngine.isPlaying()).toBe(true);

    vi.advanceTimersByTime(350); // Advances 3 steps

    expect(dispatched).toEqual(["ROOM_CREATED", "PLAYER_JOINED", "GAME_STARTED"]);
    expect(replayEngine.getCurrentSequence()).toBe(3);

    replayEngine.pause();
    expect(replayEngine.isPlaying()).toBe(false);

    vi.useRealTimers();
  });
});
