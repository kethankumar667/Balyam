import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AgeGateModal from "../AgeGateModal";
import { clearAgeAnswer, getAgeAnswer } from "../../../lib/privacy/ageGate";

function renderAt(path = "/") {
  const utils = render(
    <MemoryRouter initialEntries={[path]}>
      <AgeGateModal />
    </MemoryRouter>,
  );
  act(() => {
    vi.advanceTimersByTime(500);
  });
  return utils;
}

beforeEach(() => {
  vi.useFakeTimers();
  clearAgeAnswer();
});

afterEach(() => {
  vi.useRealTimers();
  clearAgeAnswer();
  localStorage.clear();
});

describe("AgeGateModal", () => {
  it("asks the age question first, with both answers as equal buttons", () => {
    renderAt();
    expect(screen.getByRole("heading", { name: "Before you play" })).toBeDefined();
    expect(screen.getByRole("button", { name: "I'm 18 or older" })).toBeDefined();
    expect(screen.getByRole("button", { name: "I'm under 18" })).toBeDefined();
  });

  it("an adult answer closes it and is remembered", () => {
    renderAt();
    fireEvent.click(screen.getByRole("button", { name: "I'm 18 or older" }));
    expect(getAgeAnswer()?.band).toBe("adult");
    expect(screen.queryByRole("heading", { name: "Before you play" })).toBeNull();
  });

  it("under 18 goes on to ask for a parent or guardian, and says what is switched off", () => {
    renderAt();
    fireEvent.click(screen.getByRole("button", { name: "I'm under 18" }));
    expect(screen.getByRole("heading", { name: "A parent or guardian first" })).toBeDefined();
    expect(screen.getByText(/sending or asking for coins between players is\s+switched off/i)).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Yes, they are with me and agree" }));
    expect(getAgeAnswer()).toMatchObject({ band: "minor", guardianConfirmed: true });
    expect(screen.queryByRole("heading", { name: "A parent or guardian first" })).toBeNull();
  });

  it("without a guardian it stops, stores nothing, and can be taken back to the start", () => {
    renderAt();
    fireEvent.click(screen.getByRole("button", { name: "I'm under 18" }));
    fireEvent.click(screen.getByRole("button", { name: "No, not right now" }));

    expect(screen.getByRole("heading", { name: "Come back with a parent or guardian" })).toBeDefined();
    expect(getAgeAnswer()).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    expect(screen.getByRole("heading", { name: "Before you play" })).toBeDefined();
  });

  it("cannot be dismissed with Escape", () => {
    renderAt();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("heading", { name: "Before you play" })).toBeDefined();
  });

  it("stays out of the way on the policy pages so they can be read first", () => {
    renderAt("/privacy");
    expect(screen.queryByRole("heading", { name: "Before you play" })).toBeNull();
  });
});
