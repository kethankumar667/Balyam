import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AgeGateModal from "../AgeGateModal";
import { clearAgeAnswer, getAgeAnswer } from "../../../lib/privacy/ageGate";

function renderAt(path = "/") {
  const utils = render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
  cleanup();
  vi.useRealTimers();
  clearAgeAnswer();
  localStorage.clear();
});

describe("AgeGateModal", () => {
  it("asks the age question first, with both answers as equal buttons", () => {
    renderAt();
    expect(screen.getByRole("heading", { name: "Choose your play experience" })).toHaveFocus();
    const adult = screen.getByRole("button", { name: "I'm 18 or older" });
    const minor = screen.getByRole("button", { name: "I'm under 18" });
    expect(adult.className).toBe(minor.className);
    expect(adult).not.toHaveAttribute("aria-pressed");
    expect(minor).not.toHaveAttribute("aria-pressed");
    expect(getAgeAnswer()).toBeNull();
    expect(screen.queryByRole("button", { name: /close/i })).not.toBeInTheDocument();
  });

  it("an adult answer closes it and is remembered", () => {
    renderAt();
    fireEvent.click(screen.getByRole("button", { name: "I'm 18 or older" }));
    expect(getAgeAnswer()?.band).toBe("adult");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("under 18 goes on to ask for a parent or guardian, and says what is switched off", () => {
    renderAt();
    fireEvent.click(screen.getByRole("button", { name: "I'm under 18" }));
    expect(screen.getByRole("heading", { name: "A guardian needs to be present" })).toHaveFocus();
    const protections = screen.getByRole("region", { name: "Under-18 mode on this device" });
    expect(within(protections).getByText("Coin sending")).toBeInTheDocument();
    expect(within(protections).getByText("Not offered")).toBeInTheDocument();
    expect(screen.getByText(/self-declared/i)).toBeInTheDocument();
    expect(screen.queryByText(/messaging/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/protected play/i)).not.toBeInTheDocument();
    expect(getAgeAnswer()).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Continue with guardian" }));
    expect(getAgeAnswer()).toMatchObject({ band: "minor", guardianConfirmed: true });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("without a guardian it stops, stores nothing, and can be taken back to the start", () => {
    renderAt();
    fireEvent.click(screen.getByRole("button", { name: "I'm under 18" }));
    fireEvent.click(screen.getByRole("button", { name: "Not right now" }));

    expect(screen.getByRole("heading", { name: "Come back with a guardian" })).toHaveFocus();
    expect(getAgeAnswer()).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    expect(screen.getByRole("heading", { name: "Choose your play experience" })).toHaveFocus();
  });

  it("cannot be dismissed with Escape", () => {
    renderAt();
    fireEvent.keyDown(window, { key: "Escape" });
    const dialog = screen.getByRole("dialog");
    fireEvent.mouseDown(dialog.parentElement!);
    expect(screen.getByRole("heading", { name: "Choose your play experience" })).toBeInTheDocument();
    expect(getAgeAnswer()).toBeNull();
  });

  it.each(["/privacy", "/terms"])("keeps %s readable without answering", (path) => {
    renderAt(path);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(getAgeAnswer()).toBeNull();
  });

  it("makes the guardian step conditional and updates its current step", () => {
    renderAt();
    const steps = screen.getByRole("list", { name: "Safety setup" });
    expect(within(steps).getByText("Age").closest("li")).toHaveAttribute("aria-current", "step");
    expect(within(steps).getByText("Guardian").closest("li")).toHaveTextContent("if under 18");
    fireEvent.click(screen.getByRole("button", { name: "I'm under 18" }));
    expect(within(steps).getByText("Guardian").closest("li")).toHaveAttribute("aria-current", "step");
    fireEvent.click(screen.getByRole("button", { name: "Back to age choice" }));
    expect(screen.getByRole("heading", { name: "Choose your play experience" })).toHaveFocus();
    expect(getAgeAnswer()).toBeNull();
  });

  it("retains privacy access and keyboard containment on each unconfirmed step", () => {
    renderAt();
    const adult = screen.getByRole("button", { name: "I'm 18 or older" });
    const privacy = screen.getByRole("link", { name: "Privacy notice" });
    expect(privacy).toHaveAttribute("href", "/privacy");
    adult.focus();
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(privacy).toHaveFocus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(adult).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "I'm under 18" }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByRole("heading", { name: "A guardian needs to be present" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Not right now" }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByRole("link", { name: "Privacy notice" })).toHaveAttribute("href", "/privacy");
    expect(getAgeAnswer()).toBeNull();
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("does not reopen after a previously confirmed answer", () => {
    renderAt();
    fireEvent.click(screen.getByRole("button", { name: "I'm 18 or older" }));
    expect(document.body.style.overflow).not.toBe("hidden");
    cleanup();
    renderAt();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
