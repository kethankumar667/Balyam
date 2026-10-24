import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FooterSystemPulse } from "../FooterSystemPulse";

vi.mock("../../../lib/socket", () => ({ getApiBaseUrl: () => "http://local-footer.test/" }));

let showFooter: (visible: boolean) => void;
const disconnect = vi.fn();
const fetchMock = vi.fn((..._args: Parameters<typeof fetch>): ReturnType<typeof fetch> =>
  Promise.resolve(reply({ status: "healthy" })));
function reply(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
}
async function reveal() {
  await act(async () => showFooter(true));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("IntersectionObserver", class implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin = "0px";
    readonly thresholds = [0];
    constructor(callback: IntersectionObserverCallback) {
      showFooter = visible => callback([{
        isIntersecting: visible, intersectionRatio: visible ? 1 : 0, time: 0,
        target: document.createElement("section"), rootBounds: null,
        boundingClientRect: new DOMRect(), intersectionRect: new DOMRect(),
      }], this);
    }
    observe() {}
    unobserve() {}
    takeRecords() { return []; }
    disconnect = disconnect;
  });
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  fetchMock.mockImplementation(async () => reply({ status: "healthy" }));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("Footer System Pulse", () => {
  it("does not claim success or request telemetry before the footer is visible", () => {
    render(<FooterSystemPulse />);
    expect(screen.getByText("Not checked yet")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByText(/reachable|ms response time/)).not.toBeInTheDocument();
  });

  it("measures an actual healthy response and describes its limited meaning", async () => {
    let clock = 100;
    vi.spyOn(performance, "now").mockImplementation(() => clock);
    fetchMock.mockImplementation(async () => { clock = 128; return reply({ status: "healthy" }); });
    render(<FooterSystemPulse />);
    await reveal();
    expect(screen.getByText("Game server reachable")).toBeInTheDocument();
    expect(screen.getByText("28 ms response time")).toBeInTheDocument();
    expect(screen.getByText(/browser-to-server health request.*not.*gameplay latency/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("http://local-footer.test/health", expect.objectContaining({
      cache: "no-store", credentials: "omit", signal: expect.any(AbortSignal),
    }));
    expect(screen.queryByText(/All systems operational|India gateway/)).not.toBeInTheDocument();
  });

  it.each([
    ["an HTTP failure", () => reply({ status: "healthy" }, 503)],
    ["an unhealthy body", () => reply({ status: "degraded" })],
    ["an unexpected body", () => reply({ ok: true })],
    ["invalid JSON", () => new Response("not JSON")],
  ])("shows unavailable, not zero latency, after %s", async (_label, response) => {
    fetchMock.mockResolvedValue(response());
    render(<FooterSystemPulse />);
    await reveal();
    expect(screen.getByText("Server check unavailable")).toBeInTheDocument();
    expect(screen.queryByText(/ms response time|Game server reachable/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check server" })).toBeEnabled();
  });

  it("surfaces a network error and lets the player retry", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Network failure"));
    render(<FooterSystemPulse />);
    await reveal();
    expect(screen.getByText("Server check unavailable")).toBeInTheDocument();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Check server" })));
    expect(screen.getByText("Game server reachable")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("aborts a timed-out request and offers retry without a fabricated result", async () => {
    fetchMock.mockImplementationOnce((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }));
    render(<FooterSystemPulse />);
    await reveal();
    expect(screen.getByRole("button", { name: "Checking server" })).toBeDisabled();
    await act(async () => vi.advanceTimersByTimeAsync(5000));
    expect(screen.getByText("The server check timed out. Try again.")).toBeInTheDocument();
    expect(screen.queryByText(/ms response time/)).not.toBeInTheDocument();
  });

  it("refreshes only while visible and cancels all work on unmount", async () => {
    fetchMock.mockImplementation(async () => reply({ status: "healthy" }));
    const view = render(<FooterSystemPulse />);
    await reveal();
    await act(async () => vi.advanceTimersByTimeAsync(60_000));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    act(() => showFooter(false));
    await act(async () => vi.advanceTimersByTimeAsync(120_000));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await reveal();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    view.unmount();
    expect(disconnect).toHaveBeenCalledOnce();
    await act(async () => vi.advanceTimersByTimeAsync(120_000));
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("stops checks when the browser tab is hidden and rechecks on return", async () => {
    fetchMock.mockImplementation(async () => reply({ status: "healthy" }));
    render(<FooterSystemPulse />);
    await reveal();
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    fireEvent(document, new Event("visibilitychange"));
    await act(async () => vi.advanceTimersByTimeAsync(120_000));
    expect(fetchMock).toHaveBeenCalledOnce();
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    await act(async () => fireEvent(document, new Event("visibilitychange")));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("aborts an in-flight request on unmount", async () => {
    fetchMock.mockImplementationOnce((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }));
    const view = render(<FooterSystemPulse />);
    await reveal();
    const signal = fetchMock.mock.calls[0][1]?.signal;
    view.unmount();
    expect(signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});
