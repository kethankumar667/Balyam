import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import AdminSettingsPage from "../settings";
import AdminAnnouncementsPage from "../announcements";

function renderRoute(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe("Settings — form field labeling (Phase 2 §8)", () => {
  it("regression: a text input's <label> is programmatically associated via htmlFor/id, not just visually adjacent — getByLabelText only succeeds when that association is real", () => {
    renderRoute(<AdminSettingsPage />);
    const input = screen.getByLabelText("Platform Public Title");
    expect((input as HTMLInputElement).value).toBe("BHALYAM Multiplayer Lounge");
  });

  it("a <select> is also properly associated", () => {
    renderRoute(<AdminSettingsPage />);
    expect(screen.getByLabelText("Default Regional Locale")).toBeDefined();
  });

  it("regression: a checkbox with no visible <label> at all (only a nearby heading/description) is still accessibly named via aria-labelledby and aria-describedby", () => {
    renderRoute(<AdminSettingsPage />);
    const checkbox = screen.getByRole("checkbox", { name: "Allow Guest Pass & Play Mode" });
    const describedBy = checkbox.getAttribute("aria-describedby");
    expect(describedBy).not.toBeNull();
    expect(document.getElementById(describedBy!)?.textContent).toBe(
      "Enable anonymous multiplayer matches without mandatory login.",
    );
  });

  it("a disabled, read-only field is marked aria-disabled in addition to the native disabled attribute", async () => {
    renderRoute(<AdminSettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: /Authentication/i }));
    // Switching tabs triggers a brief simulated loading state (pre-existing
    // behavior, unrelated to this fix) — wait for the real content to return.
    const jwtField = await waitFor(() => screen.getByLabelText("JWT Expiry Duration"));
    expect(jwtField.hasAttribute("disabled")).toBe(true);
    expect(jwtField.getAttribute("aria-disabled")).toBe("true");
  });

  it("checkbox labeling holds across tabs, not just the first one visited", async () => {
    renderRoute(<AdminSettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: /Maintenance/i }));
    expect(
      await waitFor(() => screen.getByRole("checkbox", { name: "Activate Maintenance Mode (Drain Mode)" })),
    ).toBeDefined();
    expect(screen.getByLabelText("Maintenance Banner Message")).toBeDefined();
  });

  it("the color-swatch input (which can't share a <label> with its paired text input) has its own accessible name", async () => {
    renderRoute(<AdminSettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: /Branding/i }));
    expect(await waitFor(() => screen.getByLabelText("Pick primary accent color visually"))).toBeDefined();
  });
});

describe("Announcements — create form field labeling (Phase 2 §8)", () => {
  function openCreateDrawer() {
    renderRoute(<AdminAnnouncementsPage />);
    fireEvent.click(screen.getByRole("button", { name: /New Announcement|Create/i }));
  }

  it("regression: every field in the create-announcement form is programmatically labeled", () => {
    openCreateDrawer();
    expect(screen.getByLabelText("Banner Headline")).toBeDefined();
    expect(screen.getByLabelText("Detailed Description")).toBeDefined();
    expect(screen.getByLabelText("Category")).toBeDefined();
    expect(screen.getByLabelText("Target Audience")).toBeDefined();
  });

  it("regression: required fields expose aria-required, not just the native required attribute", () => {
    openCreateDrawer();
    const title = screen.getByLabelText("Banner Headline");
    expect(title.getAttribute("aria-required")).toBe("true");
    const message = screen.getByLabelText("Detailed Description");
    expect(message.getAttribute("aria-required")).toBe("true");
  });
});
