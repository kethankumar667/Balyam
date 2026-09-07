import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import RoomNameEntryChamber from "../RoomNameEntryChamber";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("RoomNameEntryChamber", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 3D room code tiles and initial name input", () => {
    const onSubmitMock = vi.fn();
    render(
      <BrowserRouter>
        <RoomNameEntryChamber
          code="QQXSZA"
          onSubmit={onSubmitMock}
          initialName="Aditi"
        />
      </BrowserRouter>
    );

    // Code tiles are rendered
    expect(screen.getAllByText("Q")).toHaveLength(2);
    expect(screen.getByText("X")).toBeDefined();
    expect(screen.getByText("S")).toBeDefined();

    // Input has initial value
    const input = screen.getByRole("textbox", { name: /Your Player Name/i }) as HTMLInputElement;
    expect(input.value).toBe("Aditi");
  });

  it("submits the trimmed name on CTA button click", () => {
    const onSubmitMock = vi.fn();
    render(
      <BrowserRouter>
        <RoomNameEntryChamber
          code="QQXSZA"
          onSubmit={onSubmitMock}
          initialName="Kethan"
        />
      </BrowserRouter>
    );

    const submitBtn = screen.getByRole("button", { name: /Join Lounge Room/i });
    fireEvent.click(submitBtn);

    expect(onSubmitMock).toHaveBeenCalledWith("Kethan");
  });

  it("rolls a random nostalgic nickname when clicking the 3D dice button", () => {
    vi.useFakeTimers();
    const onSubmitMock = vi.fn();

    render(
      <BrowserRouter>
        <RoomNameEntryChamber
          code="QQXSZA"
          onSubmit={onSubmitMock}
          initialName=""
        />
      </BrowserRouter>
    );

    const diceBtn = screen.getByTitle(/Roll a random 90s gaming nickname/i);
    fireEvent.click(diceBtn);

    // Fast-forward roll timer
    act(() => {
      vi.advanceTimersByTime(500);
    });

    const input = screen.getByRole("textbox", { name: /Your Player Name/i }) as HTMLInputElement;
    expect(input.value.length).toBeGreaterThan(0);

    vi.useRealTimers();
  });
});
