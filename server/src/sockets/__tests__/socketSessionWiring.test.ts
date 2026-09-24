import { describe, it, expect, vi } from "vitest";
import { registerSocketHandlers } from "../index.js";
import type { RoomManager } from "../../rooms/RoomManager.js";

/**
 * WP3.0 — the session handlers are reachable through the REAL socket layer,
 * and its packet middleware treats them as machine traffic rather than as a
 * person playing. (The handlers' own behaviour is in socketSession.test.ts.)
 */

type Handler = (...args: unknown[]) => unknown;
type Middleware = (packet: unknown[], next: () => void) => void;

function wire() {
  const handlers = new Map<string, Handler>();
  let middleware: Middleware | undefined;
  const socket = {
    id: "wiring-socket",
    data: {},
    disconnected: false,
    rooms: new Set<string>(),
    use: (fn: Middleware) => {
      middleware = fn;
    },
    on: (event: string, handler: Handler) => void handlers.set(event, handler),
    join: vi.fn(),
    leave: vi.fn(),
  };
  const noteSocketActivity = vi.fn();
  registerSocketHandlers({} as never, socket as never, { noteSocketActivity } as unknown as RoomManager);

  const runMiddleware = (event: string) => {
    const next = vi.fn();
    middleware?.([event], next);
    return next;
  };
  return { handlers, noteSocketActivity, runMiddleware };
}

describe("WP3.0 — session events in the socket layer", () => {
  it("registers session:authenticate and session:end", () => {
    const { handlers } = wire();

    expect(handlers.has("session:authenticate")).toBe(true);
    expect(handlers.has("session:end")).toBe(true);
  });

  it("does not count re-authenticating as a person being at the keyboard", () => {
    const { runMiddleware, noteSocketActivity } = wire();

    const next = runMiddleware("session:authenticate");

    expect(next).toHaveBeenCalledOnce();
    expect(noteSocketActivity).not.toHaveBeenCalled();
  });

  it("still counts a real game action as activity", () => {
    const { runMiddleware, noteSocketActivity } = wire();

    runMiddleware("game:move");

    expect(noteSocketActivity).toHaveBeenCalledWith("wiring-socket");
  });
});
