import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const apiJsonMock = vi.hoisted(() => vi.fn());
vi.mock("../../lib/playerIdentity", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/playerIdentity")>()),
  apiJson: apiJsonMock,
}));

import { useRoomInviteStatusStore } from "../roomInviteStatusStore";

const status = (code: string, state: string, players = 2) => ({ code, state, players, maxPlayers: 4, youAreIn: false });
const reply = (...items: ReturnType<typeof status>[]) => ({ success: true, statuses: items });
const queryOf = (call: unknown[]) => decodeURIComponent(String(call[0]));

describe("roomInviteStatusStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    apiJsonMock.mockReset();
    apiJsonMock.mockResolvedValue(reply(status("ABC234", "OPEN")));
    useRoomInviteStatusStore.setState({ statuses: {} });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("asks straight away when a card appears, and keeps the answer", async () => {
    const stop = useRoomInviteStatusStore.getState().subscribe(["ABC234"]);
    await vi.advanceTimersByTimeAsync(0);

    expect(useRoomInviteStatusStore.getState().statuses["ABC234"]).toMatchObject({ state: "OPEN", players: 2 });
    stop();
  });

  it("re-checks every few seconds so 'open' does not go stale", async () => {
    const stop = useRoomInviteStatusStore.getState().subscribe(["ABC234"]);
    await vi.advanceTimersByTimeAsync(0);
    apiJsonMock.mockResolvedValue(reply(status("ABC234", "FULL", 4)));

    await vi.advanceTimersByTimeAsync(6_500);

    expect(useRoomInviteStatusStore.getState().statuses["ABC234"].state).toBe("FULL");
    stop();
  });

  it("asks about every visible room in ONE request, not one per card", async () => {
    apiJsonMock.mockResolvedValue(reply(status("AAA111", "OPEN"), status("BBB222", "OPEN")));
    const stopA = useRoomInviteStatusStore.getState().subscribe(["AAA111"]);
    const stopB = useRoomInviteStatusStore.getState().subscribe(["BBB222"]);
    await vi.advanceTimersByTimeAsync(0);
    apiJsonMock.mockClear();

    await vi.advanceTimersByTimeAsync(6_500);

    expect(apiJsonMock).toHaveBeenCalledTimes(1);
    expect(queryOf(apiJsonMock.mock.calls[0])).toContain("AAA111,BBB222");
    stopA();
    stopB();
  });

  it("stops asking about a room once it has closed — it cannot reopen — but remembers that it closed", async () => {
    apiJsonMock.mockResolvedValue(reply(status("ABC234", "CLOSED", 0)));
    const stop = useRoomInviteStatusStore.getState().subscribe(["ABC234"]);
    await vi.advanceTimersByTimeAsync(0);
    apiJsonMock.mockClear();

    await vi.advanceTimersByTimeAsync(20_000);

    expect(apiJsonMock).not.toHaveBeenCalled();
    expect(useRoomInviteStatusStore.getState().statuses["ABC234"].state).toBe("CLOSED");
    stop();
  });

  it("does not poll while the tab is hidden", async () => {
    const stop = useRoomInviteStatusStore.getState().subscribe(["ABC234"]);
    await vi.advanceTimersByTimeAsync(0);
    apiJsonMock.mockClear();
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });

    try {
      await vi.advanceTimersByTimeAsync(20_000);
      expect(apiJsonMock).not.toHaveBeenCalled();
    } finally {
      delete (document as unknown as Record<string, unknown>).visibilityState;
      stop();
    }
  });

  it("stops the timer entirely when the last card goes away", async () => {
    const stop = useRoomInviteStatusStore.getState().subscribe(["ABC234"]);
    await vi.advanceTimersByTimeAsync(0);
    stop();
    apiJsonMock.mockClear();

    await vi.advanceTimersByTimeAsync(30_000);

    expect(apiJsonMock).not.toHaveBeenCalled();
  });

  it("keeps the old answer if a check fails, instead of blanking the card", async () => {
    const stop = useRoomInviteStatusStore.getState().subscribe(["ABC234"]);
    await vi.advanceTimersByTimeAsync(0);
    apiJsonMock.mockResolvedValue(null);

    await vi.advanceTimersByTimeAsync(6_500);

    expect(useRoomInviteStatusStore.getState().statuses["ABC234"].state).toBe("OPEN");
    stop();
  });

  it("never asks about more than 20 rooms at once", async () => {
    const codes = Array.from({ length: 30 }, (_, i) => `ZZ${String(i).padStart(4, "0")}`);
    apiJsonMock.mockResolvedValue(reply());

    await useRoomInviteStatusStore.getState().refresh(codes);

    expect(queryOf(apiJsonMock.mock.calls[0]).split(",").length).toBeLessThanOrEqual(20);
  });
});
