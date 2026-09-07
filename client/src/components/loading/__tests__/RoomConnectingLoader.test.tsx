import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import RoomConnectingLoader from "../RoomConnectingLoader";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("RoomConnectingLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the luxury connecting chamber with telemetry and VIP pass tiles", () => {
    render(
      <BrowserRouter>
        <RoomConnectingLoader code="QQXSZA" />
      </BrowserRouter>
    );

    // Telemetry HUD is present
    expect(screen.getByText(/CONNECTING •/i)).toBeDefined();
    expect(screen.getByText(/TLS\/HMAC/i)).toBeDefined();

    // VIP Pass header is rendered
    expect(screen.getByText(/✦ PRIVATE TABLE PASS ✦/i)).toBeDefined();

    // 6 individual code tiles are rendered
    expect(screen.getAllByText("Q")).toHaveLength(2);
    expect(screen.getByText("X")).toBeDefined();
    expect(screen.getByText("S")).toBeDefined();
    expect(screen.getByText("Z")).toBeDefined();
    expect(screen.getByText("A")).toBeDefined();
  });

  it("copies code to clipboard and displays feedback badge on click", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: writeTextMock,
      },
      configurable: true,
    });

    render(
      <BrowserRouter>
        <RoomConnectingLoader code="ABCDEF" />
      </BrowserRouter>
    );

    const copyBtn = screen.getByTitle("Click to copy room code");
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(writeTextMock).toHaveBeenCalledWith("ABCDEF");
    expect(screen.getByText(/Copied to Clipboard!/i)).toBeDefined();

    // After 2.2s feedback timer expires, text resets
    act(() => {
      vi.advanceTimersByTime(2300);
    });
    expect(screen.queryByText(/Copied to Clipboard!/i)).toBeNull();
  });

  it("displays the taking-long recovery card after 10 seconds", () => {
    const onRetryMock = vi.fn();
    const onReturnHomeMock = vi.fn();

    render(
      <BrowserRouter>
        <RoomConnectingLoader
          code="QQXSZA"
          onRetry={onRetryMock}
          onReturnHome={onReturnHomeMock}
        />
      </BrowserRouter>
    );

    // Initially recovery card is not visible
    expect(screen.queryByText(/Connecting is taking longer than usual/i)).toBeNull();

    // Advance 10.1 seconds
    act(() => {
      vi.advanceTimersByTime(10100);
    });

    // Recovery card appears
    expect(screen.getByText(/Connecting is taking longer than usual/i)).toBeDefined();
    const retryBtn = screen.getByRole("button", { name: /Retry Connection/i });
    const returnBtn = screen.getByRole("button", { name: /Return to Lounge/i });

    // Click retry
    fireEvent.click(retryBtn);
    expect(onRetryMock).toHaveBeenCalledTimes(1);

    // Click return
    fireEvent.click(returnBtn);
    expect(onReturnHomeMock).toHaveBeenCalledTimes(1);
  });
});
