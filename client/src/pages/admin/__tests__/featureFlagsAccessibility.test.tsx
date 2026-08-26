import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import AdminFeatureFlagsPage from "../feature-flags";

function renderPage() {
  return render(
    <BrowserRouter>
      <AdminFeatureFlagsPage />
    </BrowserRouter>,
  );
}

describe("Feature Flags — keyboard accessibility (Phase 2 §1)", () => {
  it("regression: a flag card is reachable by Tab and has button semantics — this page renders its own cards, not the shared DataTable, so ADMIN-A11Y-001's fix never reached it", () => {
    renderPage();
    const card = screen.getByRole("button", { name: /Open feature flag bhalyam\.voice\.webrtc_mesh/i });
    expect(card.getAttribute("tabindex")).toBe("0");
  });

  it("regression: the accessible name uses the flag's KEY, not a generic label — 'Open feature flag bhalyam.voice.webrtc_mesh', not 'Card 1' or 'Voice WebRTC Mesh Relay' alone", () => {
    renderPage();
    expect(
      screen.getByRole("button", { name: "Open feature flag bhalyam.voice.webrtc_mesh" }),
    ).toBeDefined();
  });

  it("Enter opens the flag's detail drawer", () => {
    renderPage();
    const card = screen.getByRole("button", { name: /Open feature flag bhalyam\.voice\.webrtc_mesh/i });
    fireEvent.keyDown(card, { key: "Enter" });
    const dialog = screen.getByRole("dialog");
    // The card behind the drawer also shows this text — scope to the
    // dialog specifically rather than asserting on the page as a whole.
    expect(within(dialog).getByText("Voice WebRTC Mesh Relay")).toBeDefined();
  });

  it("Space opens the flag's detail drawer", () => {
    renderPage();
    const card = screen.getByRole("button", { name: /Open feature flag bhalyam\.voice\.webrtc_mesh/i });
    fireEvent.keyDown(card, { key: " " });
    expect(screen.getByRole("dialog")).toBeDefined();
  });

  it("regression: a visible focus ring is present on the card", () => {
    renderPage();
    const card = screen.getByRole("button", { name: /Open feature flag bhalyam\.voice\.webrtc_mesh/i });
    expect(card.className).toContain("focus-visible:ring-2");
  });

  it("regression: the nested toggle switch has its own real accessible name, not just role=switch with no label", () => {
    renderPage();
    expect(
      screen.getByRole("switch", { name: "Disable Voice WebRTC Mesh Relay" }),
    ).toBeDefined();
  });

  it("regression: pressing Enter/Space on the nested switch toggles it WITHOUT also opening the card's drawer — the keydown bubbles from the switch to the card, and only the card's own direct keydown should open it", () => {
    renderPage();
    const toggle = screen.getByRole("switch", { name: "Disable Voice WebRTC Mesh Relay" });
    fireEvent.keyDown(toggle, { key: "Enter" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("mouse click still opens the card exactly as before (regression guard)", () => {
    renderPage();
    fireEvent.click(screen.getByText("Voice WebRTC Mesh Relay"));
    expect(screen.getByRole("dialog")).toBeDefined();
  });

  it("clicking the toggle switch does not open the drawer (regression guard, mouse path)", () => {
    renderPage();
    fireEvent.click(screen.getByRole("switch", { name: "Disable Voice WebRTC Mesh Relay" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
