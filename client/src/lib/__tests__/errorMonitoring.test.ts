import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initErrorMonitoring, monitorSocketErrors } from "../errorMonitoring";
import { telemetry } from "../observability";

describe("Global Error Monitoring", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      addEventListener: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("attaches unhandled error and rejection listeners on init", () => {
    initErrorMonitoring();
    expect(window.addEventListener).toHaveBeenCalledWith("error", expect.any(Function));
    expect(window.addEventListener).toHaveBeenCalledWith("unhandledrejection", expect.any(Function));
  });

  it("monitors socket connect_error and logs network telemetry", () => {
    const spyNet = vi.spyOn(telemetry, "network").mockImplementation(() => {});
    const handlers: Record<string, Function> = {};
    const mockSocket = {
      on: (event: string, handler: Function) => {
        handlers[event] = handler;
      },
    };

    monitorSocketErrors(mockSocket);
    expect(handlers.connect_error).toBeDefined();

    handlers.connect_error?.(new Error("Connection refused"));
    expect(spyNet).toHaveBeenCalledWith("socket_connect_error", expect.objectContaining({
      message: "Connection refused",
    }));

    spyNet.mockRestore();
  });
});
