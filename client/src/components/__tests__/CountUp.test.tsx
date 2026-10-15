import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import CountUp from "../CountUp";

/**
 * The wrapper paints instantly under vitest (`NODE_ENV === "test"`), which hides the
 * animated path entirely. These tests switch that shortcut off to exercise the real
 * `react-countup` integration.
 */
describe("CountUp animated path", () => {
  let errorSpy: MockInstance<Parameters<typeof console.error>, void>;

  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VITEST", "");
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    errorSpy.mockRestore();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("mounts without logging a CountUp error, in StrictMode like the real app", () => {
    render(
      <StrictMode>
        <CountUp end={10_000} duration={0.1} />
      </StrictMode>,
    );
    const countUpErrors = errorSpy.mock.calls.filter((args) => String(args[0]).includes("[CountUp]"));
    expect(countUpErrors).toEqual([]);
  });

  it("settles on the formatted final number", async () => {
    render(<CountUp end={10_000} duration={0.1} className="n" />);
    await waitFor(() => expect(document.querySelector(".n")?.textContent).toBe("10,000"), { timeout: 3_000 });
  });

  it("shows the start value, not an empty box, before the animation runs", () => {
    render(<CountUp start={25} end={100} duration={5} className="n" />);
    expect(document.querySelector(".n")?.textContent).toBe("25");
  });

  it("keeps the prefix and suffix around the number", async () => {
    render(<CountUp end={500} prefix="+" suffix=" XP" duration={0.1} className="n" />);
    await waitFor(() => expect(document.querySelector(".n")?.textContent).toBe("+500 XP"), { timeout: 3_000 });
  });
});
