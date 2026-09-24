import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const socket = vi.hoisted(() => {
  const calls: Array<{ event: string; payload?: unknown }> = [];
  let joinAck: ((ack: (r: unknown) => void, payload: unknown) => void) | null = null;
  const fake = {
    emit: vi.fn((event: string, payload: unknown, ack?: (r: unknown) => void) => {
      calls.push({ event, payload });
      if (event === "room:join" && ack) joinAck?.(ack, payload);
    }),
    timeout: vi.fn(() => ({
      emit: (event: string, ack: () => void) => {
        calls.push({ event });
        ack();
      },
    })),
  };
  return { fake, calls, onJoin: (fn: typeof joinAck) => { joinAck = fn; } };
});

vi.mock("../socket", () => ({ getSocket: () => socket.fake }));
vi.mock("../../core/recovery/RecoveryManager", () => ({ recoveryManager: { detachRoom: vi.fn() } }));
vi.mock("../playerIdentity", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../playerIdentity")>()),
  resolveRoomCredential: vi.fn(async () => ({ ok: true, accessToken: "tok" })),
}));

import { joinRoomByCode, classifyJoinError } from "../roomJoin";
import { useRoomStore } from "../../store/roomStore";
import { resolveRoomCredential } from "../playerIdentity";

const OK_ACK = { ok: true, playerId: "p1", seatToken: "seat-1", state: { code: "ABC234" } };

describe("classifyJoinError", () => {
  it.each([
    ["Room is full", "FULL"],
    ["Game already in progress", "STARTED"],
    ["Room not found", "NOT_FOUND"],
    ["Something odd", "OTHER"],
  ])("%s → %s", (text, kind) => {
    expect(classifyJoinError(text)).toBe(kind);
  });
});

describe("joinRoomByCode", () => {
  beforeEach(() => {
    socket.calls.length = 0;
    socket.fake.emit.mockClear();
    socket.onJoin((ack) => ack(OK_ACK));
    useRoomStore.setState({ roomState: null, playerName: "Anand", seats: {} } as never);
    vi.mocked(resolveRoomCredential).mockResolvedValue({ ok: true, accessToken: "tok" } as never);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("joins the room and remembers the seat so the room page can reclaim it", async () => {
    const result = await joinRoomByCode("abc234");

    expect(result).toEqual({ ok: true, code: "ABC234" });
    const join = socket.calls.find((c) => c.event === "room:join")!;
    expect(join.payload).toMatchObject({ code: "ABC234", name: "Anand", accessToken: "tok" });
    expect(useRoomStore.getState().seatFor("ABC234")).toMatchObject({ playerId: "p1", seatToken: "seat-1" });
  });

  it("accepts a pasted link as well as a bare code", async () => {
    const result = await joinRoomByCode("https://bhalyam.example/room/ABC234");

    expect(result).toMatchObject({ ok: true, code: "ABC234" });
  });

  it("refuses something that is not a room code without asking the server", async () => {
    const result = await joinRoomByCode("nope");

    expect(result.ok).toBe(false);
    expect(socket.calls).toHaveLength(0);
  });

  it("does nothing if you are already seated in that room — there is nothing to join", async () => {
    useRoomStore.setState({ roomState: { code: "ABC234" } } as never);

    const result = await joinRoomByCode("ABC234");

    expect(result).toEqual({ ok: true, code: "ABC234" });
    expect(socket.calls).toHaveLength(0);
  });

  it("leaves the room you are in first, so joining another does not strand a ghost seat", async () => {
    useRoomStore.setState({ roomState: { code: "OLD999" } } as never);

    await joinRoomByCode("ABC234");

    const order = socket.calls.map((c) => c.event);
    expect(order.indexOf("room:leave")).toBeGreaterThanOrEqual(0);
    expect(order.indexOf("room:leave")).toBeLessThan(order.indexOf("room:join"));
  });

  it.each([
    ["Room is full", "FULL"],
    ["Game already in progress", "STARTED"],
    ["Room not found", "NOT_FOUND"],
  ])("reports %s as %s so the card can explain it", async (error, reason) => {
    socket.onJoin((ack) => ack({ ok: false, error }));

    const result = await joinRoomByCode("ABC234");

    expect(result).toMatchObject({ ok: false, reason, error });
  });

  it("does not remember a seat when the join fails", async () => {
    socket.onJoin((ack) => ack({ ok: false, error: "Room is full" }));

    await joinRoomByCode("ABC234");

    expect(useRoomStore.getState().seatFor("ABC234")).toBeFalsy();
  });

  it("stops if the credential cannot be resolved, rather than taking an unauthenticated seat", async () => {
    vi.mocked(resolveRoomCredential).mockResolvedValue({ ok: false, error: "Sign in first" } as never);

    const result = await joinRoomByCode("ABC234");

    expect(result).toMatchObject({ ok: false, error: "Sign in first" });
    expect(socket.calls.some((c) => c.event === "room:join")).toBe(false);
  });

  it("gives up with an honest message if the server never answers", async () => {
    vi.useFakeTimers();
    socket.onJoin(() => undefined);

    const pending = joinRoomByCode("ABC234");
    await vi.advanceTimersByTimeAsync(21_000);

    expect(await pending).toMatchObject({ ok: false, error: expect.stringContaining("taking a while") });
  });

  it("never sends two joins for the same room from a double tap", async () => {
    let release: (ack: unknown) => void = () => undefined;
    socket.onJoin((ack) => { release = ack; });

    const first = joinRoomByCode("ABC234");
    await Promise.resolve();
    await Promise.resolve();
    const second = await joinRoomByCode("ABC234");
    release(OK_ACK);
    await first;

    expect(second.ok).toBe(false);
    expect(socket.calls.filter((c) => c.event === "room:join")).toHaveLength(1);
  });
});
