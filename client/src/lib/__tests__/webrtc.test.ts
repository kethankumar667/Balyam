import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WebRTCSignal, WebRTCSignalRecvPayload } from "@shared/types";
import { VoiceManager } from "../webrtc";

/**
 * Regression tests for the voice signalling protocol.
 *
 * Every case here maps to a way voice was observably broken:
 *   - the staggered join (one player connects their mic before the other),
 *   - the pass-and-play self-echo,
 *   - the offer storm driven by roster ticks,
 *   - a failed connection staying dead for the rest of the session.
 *
 * The manager is DOM-free, so a fake RTCPeerConnection and a fake socket are
 * enough to drive it.
 */

interface SentSignal {
  toPlayerId: string;
  signal: WebRTCSignal;
}

let sdpCounter = 0;

class FakePeerConnection {
  static instances: FakePeerConnection[] = [];

  localDescription: { type: string; sdp: string } | null = null;
  remoteDescription: { type: string; sdp: string } | null = null;
  signalingState = "stable";
  connectionState: RTCPeerConnectionState = "new";
  iceConnectionState = "new";
  tracks: unknown[] = [];
  closed = false;
  restartIceCalls = 0;

  ontrack: ((e: unknown) => void) | null = null;
  onicecandidate: ((e: unknown) => void) | null = null;
  onnegotiationneeded: (() => void) | null = null;
  oniceconnectionstatechange: (() => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;

  constructor(public config: RTCConfiguration) {
    FakePeerConnection.instances.push(this);
  }

  addTrack(track: unknown): unknown {
    this.tracks.push(track);
    // Browsers fire negotiationneeded asynchronously after addTrack.
    queueMicrotask(() => this.onnegotiationneeded?.());
    return { track };
  }

  async setLocalDescription(desc?: { type: string }): Promise<void> {
    if (desc?.type === "rollback") {
      this.signalingState = "stable";
      this.localDescription = null;
      return;
    }
    if (this.signalingState === "have-remote-offer") {
      this.localDescription = { type: "answer", sdp: `answer-${++sdpCounter}` };
      this.signalingState = "stable";
      return;
    }
    this.localDescription = { type: "offer", sdp: `offer-${++sdpCounter}` };
    this.signalingState = "have-local-offer";
  }

  async setRemoteDescription(desc: { type: string; sdp: string }): Promise<void> {
    this.remoteDescription = desc;
    this.signalingState = desc.type === "offer" ? "have-remote-offer" : "stable";
  }

  async addIceCandidate(): Promise<void> {}

  restartIce(): void {
    this.restartIceCalls += 1;
  }

  close(): void {
    this.closed = true;
    this.connectionState = "closed";
  }

  /** Test helper: drive a connection-state transition like the browser would. */
  transitionTo(state: RTCPeerConnectionState): void {
    this.connectionState = state;
    this.onconnectionstatechange?.();
  }
}

function makeFakeSocket() {
  const handlers = new Map<string, Set<(payload: unknown) => void>>();
  const sent: SentSignal[] = [];
  return {
    sent,
    on(event: string, fn: (payload: unknown) => void) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(fn);
    },
    off(event: string, fn: (payload: unknown) => void) {
      handlers.get(event)?.delete(fn);
    },
    emit(event: string, payload: SentSignal | ((res: unknown) => void)) {
      // ICE config is fetched from the server before the mic opens. Answering
      // SYNCHRONOUSLY matters: an unanswered ack would leave start() waiting
      // out its 4s fallback timer in every test.
      if (event === "webrtc:iceConfig") {
        if (typeof payload === "function") {
          payload({ iceServers: [{ urls: "stun:test" }], hasRelay: false, ttlSeconds: 0 });
        }
        return;
      }
      if (event === "webrtc:signal") sent.push(payload as SentSignal);
    },
    /** Simulate the server relaying a signal to this client. */
    deliver(payload: WebRTCSignalRecvPayload) {
      for (const fn of handlers.get("webrtc:signal") ?? []) fn(payload);
    },
    listenerCount(event: string) {
      return handlers.get(event)?.size ?? 0;
    },
  };
}

function fakeStream() {
  const track = { kind: "audio", enabled: true, stop: vi.fn() };
  return {
    getTracks: () => [track],
    getAudioTracks: () => [track],
    __track: track,
  };
}

/** Let queued microtasks (negotiationneeded, async signal handling) settle. */
async function settle(): Promise<void> {
  for (let i = 0; i < 6; i++) await Promise.resolve();
}

let currentStream: ReturnType<typeof fakeStream>;

beforeEach(() => {
  FakePeerConnection.instances = [];
  sdpCounter = 0;
  currentStream = fakeStream();
  vi.stubGlobal("RTCPeerConnection", FakePeerConnection);
  vi.stubGlobal("navigator", {
    mediaDevices: { getUserMedia: vi.fn(async () => currentStream) },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function newManager(socket: any, selfId: string) {
  return new VoiceManager(socket, selfId);
}

describe("VoiceManager", () => {
  it("offers to the peer it owns the offer for, and only once per roster", async () => {
    const socket = makeFakeSocket();
    const mgr = newManager(socket, "a");
    await mgr.start();
    mgr.syncPeers(["b"]);
    await settle();

    const offers = socket.sent.filter((s) => s.signal.kind === "offer");
    expect(offers).toHaveLength(1);
    expect(offers[0]!.toPlayerId).toBe("b");

    // The room broadcasts a new roster array on every state change; the old
    // code re-offered each time, flooding the peer with renegotiations.
    for (let i = 0; i < 12; i++) mgr.syncPeers(["b"]);
    await settle();
    expect(socket.sent.filter((s) => s.signal.kind === "offer")).toHaveLength(1);

    mgr.destroy();
  });

  it("does not offer to the peer that owns the offer for the pair", async () => {
    const socket = makeFakeSocket();
    // "z" > "a", so "a" initiates and "z" waits.
    const mgr = newManager(socket, "z");
    await mgr.start();
    mgr.syncPeers(["a"]);
    await settle();

    expect(socket.sent.filter((s) => s.signal.kind === "offer")).toHaveLength(0);
    mgr.destroy();
  });

  it("attaches the mic and asks for a fresh offer when it connects late", async () => {
    const socket = makeFakeSocket();
    // "z" is answering a peer that owns the offer, before "z" has a mic.
    const mgr = newManager(socket, "z");
    socket.deliver({ fromPlayerId: "a", signal: { kind: "offer", sdp: "offer-remote" } });
    await settle();

    const answers = socket.sent.filter((s) => s.signal.kind === "answer");
    expect(answers).toHaveLength(1);
    // Answered with no audio of our own — we had no mic yet.
    expect(FakePeerConnection.instances[0]!.tracks).toHaveLength(0);

    // Now the player clicks "Connect mic".
    await mgr.start();
    mgr.syncPeers(["a"]);
    await settle();

    expect(FakePeerConnection.instances[0]!.tracks).toHaveLength(1);
    // We do not own the offer, so we must ask the other side to re-offer.
    // Without this the staggered case deadlocked and one side heard silence.
    expect(socket.sent.some((s) => s.signal.kind === "ready" && s.toPlayerId === "a")).toBe(true);

    mgr.destroy();
  });

  it("re-offers when a peer that already answered asks with `ready`", async () => {
    const socket = makeFakeSocket();
    const mgr = newManager(socket, "a");
    await mgr.start();
    mgr.syncPeers(["b"]);
    await settle();
    // Complete the first round so signalling is back to stable.
    socket.deliver({ fromPlayerId: "b", signal: { kind: "answer", sdp: "answer-remote" } });
    await settle();

    const before = socket.sent.filter((s) => s.signal.kind === "offer").length;
    socket.deliver({ fromPlayerId: "b", signal: { kind: "ready" } });
    await settle();

    expect(socket.sent.filter((s) => s.signal.kind === "offer").length).toBe(before + 1);
    mgr.destroy();
  });

  it("ignores a signal relayed back from our own seat", async () => {
    const socket = makeFakeSocket();
    const mgr = newManager(socket, "a");
    await mgr.start();

    // Pass-and-play seats share our socket, so the server relays signals
    // aimed at them straight back to us with our own id as the sender.
    // Answering built a connection to ourselves and echoed the room.
    socket.deliver({ fromPlayerId: "a", signal: { kind: "offer", sdp: "offer-self" } });
    await settle();

    expect(FakePeerConnection.instances).toHaveLength(0);
    expect(socket.sent).toHaveLength(0);
    mgr.destroy();
  });

  it("rebuilds a peer connection that fails", async () => {
    const socket = makeFakeSocket();
    const mgr = newManager(socket, "a");
    await mgr.start();
    mgr.syncPeers(["b"]);
    await settle();
    expect(FakePeerConnection.instances).toHaveLength(1);

    const first = FakePeerConnection.instances[0]!;
    first.transitionTo("failed");
    await settle();

    // A second connection replaces the dead one. Previously the failed entry
    // stayed in the map, syncPeers skipped it as "already present", and voice
    // with that player never came back.
    expect(FakePeerConnection.instances).toHaveLength(2);
    expect(first.closed).toBe(true);
    mgr.destroy();
  });

  it("gives up rebuilding after repeated failures instead of looping", async () => {
    const socket = makeFakeSocket();
    const mgr = newManager(socket, "a");
    await mgr.start();
    mgr.syncPeers(["b"]);
    await settle();

    for (let i = 0; i < 10; i++) {
      const live = FakePeerConnection.instances.filter((pc) => !pc.closed);
      if (live.length === 0) break;
      live[live.length - 1]!.transitionTo("failed");
      await settle();
    }
    // 1 original + at most MAX_RETRIES rebuilds.
    expect(FakePeerConnection.instances.length).toBeLessThanOrEqual(4);
    mgr.destroy();
  });

  it("restarts ICE on the offering side when the ice path drops", async () => {
    const socket = makeFakeSocket();
    const mgr = newManager(socket, "a");
    await mgr.start();
    mgr.syncPeers(["b"]);
    await settle();

    const pc = FakePeerConnection.instances[0]!;
    pc.iceConnectionState = "failed";
    pc.oniceconnectionstatechange?.();
    expect(pc.restartIceCalls).toBe(1);
    mgr.destroy();
  });

  it("ignores an unexpected answer instead of poisoning the connection", async () => {
    const socket = makeFakeSocket();
    const mgr = newManager(socket, "a");
    await mgr.start();
    mgr.syncPeers(["b"]);
    await settle();
    socket.deliver({ fromPlayerId: "b", signal: { kind: "answer", sdp: "answer-1" } });
    await settle();

    const pc = FakePeerConnection.instances[0]!;
    expect(pc.signalingState).toBe("stable");
    // A duplicate answer arrives (retry, or the tail of a rolled-back round).
    socket.deliver({ fromPlayerId: "b", signal: { kind: "answer", sdp: "answer-2" } });
    await settle();
    expect(pc.remoteDescription?.sdp).toBe("answer-1");
    mgr.destroy();
  });

  it("buffers ICE candidates that arrive before the remote description", async () => {
    const socket = makeFakeSocket();
    const mgr = newManager(socket, "z");
    await mgr.start();
    const pc0 = () => FakePeerConnection.instances[0]!;
    const addSpy = vi.fn();

    socket.deliver({
      fromPlayerId: "a",
      signal: { kind: "candidate", candidate: { candidate: "early" } },
    });
    await settle();
    pc0().addIceCandidate = addSpy;
    expect(addSpy).not.toHaveBeenCalled();

    socket.deliver({ fromPlayerId: "a", signal: { kind: "offer", sdp: "offer-remote" } });
    await settle();
    // Flushed once the remote description landed, rather than dropped.
    expect(addSpy).toHaveBeenCalledWith({ candidate: "early" });
    mgr.destroy();
  });

  it("closes peers that leave the room and reopens on rejoin", async () => {
    const socket = makeFakeSocket();
    const mgr = newManager(socket, "a");
    await mgr.start();
    mgr.syncPeers(["b", "c"]);
    await settle();
    expect(FakePeerConnection.instances).toHaveLength(2);

    mgr.syncPeers(["b"]);
    await settle();
    expect(FakePeerConnection.instances.filter((pc) => pc.closed)).toHaveLength(1);

    mgr.syncPeers(["b", "c"]);
    await settle();
    expect(FakePeerConnection.instances).toHaveLength(3);
    mgr.destroy();
  });

  it("keeps mute across a peer rebuild and stops tracks on destroy", async () => {
    const socket = makeFakeSocket();
    const mgr = newManager(socket, "a");
    await mgr.start();
    mgr.syncPeers(["b"]);
    await settle();

    expect(mgr.toggleMute()).toBe(true);
    expect(currentStream.__track.enabled).toBe(false);

    FakePeerConnection.instances[0]!.transitionTo("failed");
    await settle();
    // The rebuilt connection carries the same, still-muted track.
    expect(mgr.isMuted()).toBe(true);
    expect(currentStream.__track.enabled).toBe(false);

    mgr.destroy();
    expect(currentStream.__track.stop).toHaveBeenCalled();
    expect(socket.listenerCount("webrtc:signal")).toBe(0);
  });

  it("stops emitting after destroy", async () => {
    const socket = makeFakeSocket();
    const mgr = newManager(socket, "a");
    await mgr.start();
    mgr.syncPeers(["b"]);
    await settle();
    mgr.destroy();

    const count = socket.sent.length;
    mgr.syncPeers(["b", "c"]);
    socket.deliver({ fromPlayerId: "b", signal: { kind: "offer", sdp: "late" } });
    await settle();
    expect(socket.sent).toHaveLength(count);
  });
});
