import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type React from "react";
import { render, screen, fireEvent, createEvent, cleanup, waitFor } from "@testing-library/react";
import { GameAcademyModal } from "../components/GameAcademyModal";
import { getGameAcademy } from "../data";
import { readableTextColor } from "../utils/readableTextColor";
import { HapticsManager } from "../../../services/HapticsManager";
import { AudioManager } from "../../../services/AudioManager";
import type { GameAcademySpec } from "../types/academy";

/*
 * `@testing-library/user-event` is not a dependency of this client, so these
 * tests drive the dialog with RTL's `fireEvent`. `keyDown` on a real element
 * bubbles to `window`, which is where both `useFocusTrap` and the academy
 * keyboard hook listen, so the wiring under test is the production wiring.
 */

vi.mock("../../../hooks/useAudio", () => ({
  useAudio: () => ({ settings: { isMuted: false }, toggleMute: () => undefined }),
}));

vi.mock("../../../services/AudioManager", () => ({
  AudioManager: { play: vi.fn() },
}));

// Contract with SandboxRenderer: `hasSandbox(kind)` is true only when a real
// demo renders. The stand-in below renders the controls the keyboard tests need.
vi.mock("../components/sandboxes/SandboxRenderer", () => ({
  hasSandbox: (kind?: string) => kind === "dice-roll",
  SandboxRenderer: ({ onComplete }: { onComplete?: () => void }) => (
    <div>
      <button type="button" onClick={onComplete}>
        Mock demo
      </button>
      <input aria-label="Mock input" />
      <textarea aria-label="Mock textarea" />
      <select aria-label="Mock select">
        <option>a</option>
      </select>
      <div contentEditable suppressContentEditableWarning data-testid="mock-editable" tabIndex={0}>
        note
      </div>
    </div>
  ),
}));

const ONBOARDING_KEY = "bhalyam.onboarding.state";
const LUDO = getGameAcademy("ludo") as GameAcademySpec;
const LUDO_TITLE = LUDO.title;
const LUDO_SLIDE_COUNT = LUDO.slides.length;

function renderModal(overrides: Partial<React.ComponentProps<typeof GameAcademyModal>> = {}) {
  const onClose = vi.fn();
  const utils = render(<GameAcademyModal open spec={LUDO} onClose={onClose} {...overrides} />);
  return { onClose, ...utils };
}

const stepStatus = () => screen.getByRole("status").textContent ?? "";
const pressKey = (target: Element | Window, init: KeyboardEventInit) =>
  fireEvent.keyDown(target, init);
const primaryButton = () => screen.getByRole("button", { name: /^(next|ready to play)/i });
const modeButton = (name: RegExp) => screen.getByRole("button", { name });

describe("GameAcademyModal keyboard", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("does not preventDefault on Tab and never toggles the walkthrough/cheatsheet mode", () => {
    renderModal();
    const guide = modeButton(/interactive guide/i);
    guide.focus();

    const tab = createEvent.keyDown(guide, { key: "Tab" });
    fireEvent(guide, tab);

    expect(tab.defaultPrevented).toBe(false);
    expect(guide.getAttribute("aria-pressed")).toBe("true");
    expect(modeButton(/tactical cheatsheet/i).getAttribute("aria-pressed")).toBe("false");
  });

  it("moves forward and back with ArrowRight and ArrowLeft", () => {
    renderModal();
    expect(stepStatus()).toContain(`Step 1 of ${LUDO_SLIDE_COUNT}`);

    pressKey(document.body, { key: "ArrowRight" });
    expect(stepStatus()).toContain(`Step 2 of ${LUDO_SLIDE_COUNT}`);

    pressKey(primaryButton(), { key: "ArrowLeft" });
    expect(stepStatus()).toContain(`Step 1 of ${LUDO_SLIDE_COUNT}`);
  });

  it("never finishes or closes the tutorial from an arrow key on the last slide", () => {
    const { onClose } = renderModal();
    for (let i = 0; i < LUDO_SLIDE_COUNT + 3; i += 1) pressKey(document.body, { key: "ArrowRight" });

    expect(stepStatus()).toContain(`Step ${LUDO_SLIDE_COUNT} of ${LUDO_SLIDE_COUNT}`);
    expect(onClose).not.toHaveBeenCalled();
    expect(localStorage.getItem(LUDO.storageKey)).toBeNull();
  });

  it.each([
    ["ctrlKey", { ctrlKey: true }],
    ["metaKey", { metaKey: true }],
    ["altKey", { altKey: true }],
    ["shiftKey", { shiftKey: true }],
  ])("ignores ArrowRight when %s is held (browser shortcuts stay intact)", (_name, modifier) => {
    renderModal();
    const event = createEvent.keyDown(document.body, { key: "ArrowRight", ...modifier });
    fireEvent(document.body, event);

    expect(stepStatus()).toContain("Step 1 of");
    expect(event.defaultPrevented).toBe(false);
  });

  it.each([
    ["input", () => screen.getByLabelText("Mock input")],
    ["textarea", () => screen.getByLabelText("Mock textarea")],
    ["select", () => screen.getByLabelText("Mock select")],
    ["contenteditable", () => screen.getByTestId("mock-editable")],
  ])("ignores arrow keys that originate in a %s inside the dialog", (_name, getTarget) => {
    renderModal();
    pressKey(getTarget(), { key: "ArrowRight" });
    expect(stepStatus()).toContain("Step 1 of");
  });

  it("ignores arrow keys while focus is in a control outside the dialog", () => {
    renderModal();
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    try {
      pressKey(outside, { key: "ArrowRight" });
      expect(stepStatus()).toContain("Step 1 of");
    } finally {
      outside.remove();
    }
  });

  it("does nothing on bare letters: `d` (UNO draw) and `a` do not navigate", () => {
    renderModal();
    const d = createEvent.keyDown(document.body, { key: "d" });
    fireEvent(document.body, d);
    pressKey(document.body, { key: "A" });
    pressKey(document.body, { key: "D" });

    expect(stepStatus()).toContain("Step 1 of");
    expect(d.defaultPrevented).toBe(false);
  });

  it("does not react to arrow keys in cheatsheet mode, where no step is visible", () => {
    renderModal({ initialMode: "cheatsheet" });
    pressKey(document.body, { key: "ArrowRight" });
    fireEvent.click(modeButton(/interactive guide/i));
    expect(stepStatus()).toContain("Step 1 of");
  });

  it("calls onClose exactly once when Escape is pressed", () => {
    const { onClose } = renderModal();
    pressKey(document.body, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("GameAcademyModal focus and naming", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("lands initial focus on the primary Next action, not the first (Mute) control", () => {
    renderModal();
    expect(document.activeElement).toBe(primaryButton());
  });

  it("does not steal focus when the parent re-renders with a fresh inline onClose", () => {
    const { rerender } = renderModal();
    const guide = modeButton(/interactive guide/i);
    guide.focus();
    expect(document.activeElement).toBe(guide);

    rerender(<GameAcademyModal open spec={LUDO} onClose={() => undefined} />);
    rerender(<GameAcademyModal open spec={LUDO} onClose={() => undefined} />);

    expect(document.activeElement).toBe(guide);
  });

  it("names the dialog after the game in walkthrough mode", () => {
    renderModal();
    expect(screen.getByRole("dialog", { name: LUDO_TITLE })).toBeTruthy();
  });

  it("keeps the dialog named in cheatsheet mode", () => {
    renderModal();
    fireEvent.click(modeButton(/tactical cheatsheet/i));
    expect(screen.getByRole("dialog", { name: LUDO_TITLE })).toBeTruthy();
  });

  it("names the dialog when opened directly in cheatsheet mode", () => {
    renderModal({ initialMode: "cheatsheet" });
    expect(screen.getByRole("dialog", { name: LUDO_TITLE })).toBeTruthy();
    expect(stepStatus()).toContain(LUDO_TITLE);
  });

  it("marks the active mode with aria-pressed as the user toggles", () => {
    renderModal();
    fireEvent.click(modeButton(/tactical cheatsheet/i));
    expect(modeButton(/tactical cheatsheet/i).getAttribute("aria-pressed")).toBe("true");
    expect(modeButton(/interactive guide/i).getAttribute("aria-pressed")).toBe("false");
  });

  it("gives every icon-only button an accessible name", () => {
    renderModal();
    const dialog = screen.getByRole("dialog");
    const unnamed = Array.from(dialog.querySelectorAll("button")).filter(
      (b) => !(b.textContent ?? "").trim() && !b.getAttribute("aria-label"),
    );
    expect(unnamed).toHaveLength(0);
  });

  it("uses a text colour readable on the game's accent for the primary button", () => {
    const darkAccent: GameAcademySpec = { ...LUDO, primaryAccent: "#8C5A2B" };
    renderModal({ spec: darkAccent });
    const ink = readableTextColor("#8C5A2B");
    expect(ink).toBe("#FFFFFF");
    expect(primaryButton().style.color.toLowerCase()).toMatch(/^(#ffffff|rgb\(255, 255, 255\))$/);
  });
});

describe("GameAcademyModal completion", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(AudioManager.play).mockClear();
  });
  afterEach(() => cleanup());

  it("writes only the spec's own completion flag when the walkthrough is finished", () => {
    const { onClose } = renderModal();
    for (let i = 0; i < LUDO_SLIDE_COUNT - 1; i += 1) fireEvent.click(primaryButton());
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(primaryButton());

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(LUDO.storageKey)).toBe("1");
    expect(localStorage.getItem(ONBOARDING_KEY)).toBeNull();
  });

  it("marks the tutorial seen when it is skipped", () => {
    const { onClose } = renderModal();
    fireEvent.click(screen.getByRole("button", { name: /skip intro/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(LUDO.storageKey)).toBe("1");
  });

  it("counts a sandbox completion once per slide even if the demo reports it repeatedly", async () => {
    const win = vi.spyOn(HapticsManager.getInstance(), "win");
    renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Mock demo" }));
    fireEvent.click(screen.getByRole("button", { name: "Mock demo" }));
    expect(win).toHaveBeenCalledTimes(1);
    expect(stepStatus().match(/demo complete/gi)).toHaveLength(1);

    fireEvent.click(primaryButton());
    // Wait out the outgoing slide's exit animation so the click hits the new slide's demo.
    await screen.findByRole("heading", { name: LUDO.slides[1].title });
    fireEvent.click(screen.getByRole("button", { name: "Mock demo" }));
    expect(win).toHaveBeenCalledTimes(2);
    win.mockRestore();
  });

  it("does not play a reward sound or tick a journey milestone for a tutorial demo", () => {
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Mock demo" }));

    expect(AudioManager.play).not.toHaveBeenCalled();
    expect(localStorage.getItem(ONBOARDING_KEY)).toBeNull();
  });

  it("shows no sandbox area on a slide without a demo and does not gate Next", async () => {
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: `Go to slide ${LUDO_SLIDE_COUNT}` }));
    await screen.findByRole("heading", { name: LUDO.slides[LUDO_SLIDE_COUNT - 1].title });
    await waitFor(() => expect(screen.queryByRole("button", { name: "Mock demo" })).toBeNull());

    expect(screen.queryByText(/try it/i)).toBeNull();
    expect((primaryButton() as HTMLButtonElement).disabled).toBe(false);
  });

  it("renders no sandbox area when hasSandbox() is false for the slide's kind", () => {
    const noDemo: GameAcademySpec = {
      ...LUDO,
      slides: LUDO.slides.map((slide) => ({ ...slide, sandboxKind: "retro-mini" as const })),
    };
    renderModal({ spec: noDemo });

    expect(screen.queryByRole("button", { name: "Mock demo" })).toBeNull();
    expect(screen.queryByText(/try it/i)).toBeNull();
    expect((primaryButton() as HTMLButtonElement).disabled).toBe(false);
  });

  it("does not promise XP, coins or rewards, and uses no decorative emoji in its chrome", () => {
    renderModal();
    const text = screen.getByRole("dialog").textContent ?? "";
    expect(text).not.toMatch(/\b(xp|coins?|rewards?)\b/i);
    expect(text).not.toMatch(/[★\u{1F4A1}\u{1F6A8}]/u);

    fireEvent.click(modeButton(/tactical cheatsheet/i));
    const cheatsheetText = screen.getByRole("dialog").textContent ?? "";
    expect(cheatsheetText).not.toMatch(/\b(xp|coins?|rewards?)\b/i);
  });
});
