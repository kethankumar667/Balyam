import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, fireEvent, act, cleanup } from "@testing-library/react";
import type { InteractiveSandboxKind } from "../types/academy";
import {
  SandboxRenderer,
  hasSandbox,
} from "../components/sandboxes/SandboxRenderer";

vi.mock("../../../services/HapticsManager", () => ({
  HapticsManager: {
    getInstance: () => ({ subtle: vi.fn(), win: vi.fn() }),
  },
}));

const REAL_SANDBOX_KINDS: readonly InteractiveSandboxKind[] = [
  "dice-roll",
  "card-meld",
  "uno-challenge",
  "cricket-duel",
  "quantum-grid",
  "dots-chain",
  "word-chain",
  "sudoku-scanner",
  "retro-mini",
];

const PLACEHOLDER_KINDS: readonly InteractiveSandboxKind[] = [
  "carrom-striker",
  "chess-tactics",
  "star-slap",
  "bingo-cross",
];

// Card suits are the demo content of the card sandboxes, not chrome.
const CARD_SUIT_TOKENS = /[♠♥♦♣]/g;
const DECORATIVE_GLYPHS = /[★➔▲▼◀▶✓⚡]/;
const EMOJI = /\p{Extended_Pictographic}/u;
const REWARD_COPY = /XP|coins?/i;
const UNSUPPORTED_TAILWIND =
  /(?<![\w-])(rounded-xs|shadow-xs|animate-scale-in)(?![\w-])/;
// stone-500/600 are ~3.9:1 or worse on the dark slate panels (stone-700 is
// legitimate ink on the light playing-card faces, so it is not listed).
const LOW_CONTRAST_INK = /(?<![\w-])text-stone-(500|600)(?![\w-])/;

function pressEveryButton(container: HTMLElement): void {
  for (const button of Array.from(container.querySelectorAll("button"))) {
    fireEvent.click(button);
  }
}

describe("SandboxRenderer routing", () => {
  it("reports hasSandbox true for exactly the nine real demos", () => {
    for (const kind of REAL_SANDBOX_KINDS) {
      expect(hasSandbox(kind), kind).toBe(true);
    }
  });

  it("reports hasSandbox false for placeholder kinds and undefined", () => {
    for (const kind of PLACEHOLDER_KINDS) {
      expect(hasSandbox(kind), kind).toBe(false);
    }
    expect(hasSandbox(undefined)).toBe(false);
    expect(hasSandbox()).toBe(false);
  });

  it("covers every kind in the union (13 in total)", () => {
    expect(REAL_SANDBOX_KINDS.length + PLACEHOLDER_KINDS.length).toBe(13);
  });

  it("renders nothing for kinds without a real demo", () => {
    for (const kind of PLACEHOLDER_KINDS) {
      const { container, unmount } = render(<SandboxRenderer kind={kind} />);
      expect(container.firstChild, kind).toBeNull();
      unmount();
    }
    const { container } = render(<SandboxRenderer kind={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing for an unknown kind coming from untyped data", () => {
    const unknownKind = "totally-unknown" as InteractiveSandboxKind;
    const { container } = render(<SandboxRenderer kind={unknownKind} />);
    expect(container.firstChild).toBeNull();
    expect(hasSandbox(unknownKind)).toBe(false);
  });

  it("renders a real demo for each supported kind", () => {
    for (const kind of REAL_SANDBOX_KINDS) {
      const { container, unmount } = render(<SandboxRenderer kind={kind} />);
      expect(container.firstChild, kind).not.toBeNull();
      unmount();
    }
  });

  it("does not show the Nokia snake demo for non-snake kinds", () => {
    for (const kind of [...PLACEHOLDER_KINDS, "dice-roll" as const]) {
      const { container, unmount } = render(<SandboxRenderer kind={kind} />);
      expect(container.textContent, kind).not.toMatch(/Nokia/i);
      unmount();
    }
  });
});

describe("SandboxRenderer content rules", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it.each(REAL_SANDBOX_KINDS)(
    "%s never promises a reward, emoji chrome or unsupported utilities",
    (kind) => {
      const { container } = render(<SandboxRenderer kind={kind} />);
      const snapshots: string[] = [container.textContent ?? ""];
      const htmlSnapshots: string[] = [container.innerHTML];

      pressEveryButton(container);
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      pressEveryButton(container);
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      snapshots.push(container.textContent ?? "");
      htmlSnapshots.push(container.innerHTML);

      for (const text of snapshots) {
        const withoutSuits = text.replace(CARD_SUIT_TOKENS, "");
        expect(withoutSuits).not.toMatch(REWARD_COPY);
        expect(withoutSuits).not.toMatch(EMOJI);
        expect(withoutSuits).not.toMatch(DECORATIVE_GLYPHS);
      }
      for (const html of htmlSnapshots) {
        expect(html).not.toMatch(UNSUPPORTED_TAILWIND);
        expect(html).not.toMatch(LOW_CONTRAST_INK);
      }
    },
  );

  it.each(REAL_SANDBOX_KINDS)(
    "%s exposes a polite live region for its status text",
    (kind) => {
      const { container } = render(<SandboxRenderer kind={kind} />);
      const live = container.querySelector(
        '[role="status"], [aria-live="polite"]',
      );
      expect(live).not.toBeNull();
    },
  );

  it.each(REAL_SANDBOX_KINDS)(
    "%s calls onComplete at most once even after repeated interaction",
    (kind) => {
      const onComplete = vi.fn();
      const { container } = render(
        <SandboxRenderer kind={kind} onComplete={onComplete} />,
      );
      for (let round = 0; round < 3; round += 1) {
        pressEveryButton(container);
        act(() => {
          vi.advanceTimersByTime(2000);
        });
      }
      expect(onComplete.mock.calls.length).toBeLessThanOrEqual(1);
    },
  );

  it("remounts a sandbox when the slide config changes", () => {
    const { rerender, container } = render(
      <SandboxRenderer kind="cricket-duel" config={{ mode: "standard" }} />,
    );
    const standardPressed = container
      .querySelector('button[aria-pressed="true"]')
      ?.textContent;
    expect(standardPressed).toMatch(/Standard/);
    rerender(
      <SandboxRenderer kind="cricket-duel" config={{ mode: "yorker" }} />,
    );
    const yorkerPressed = container
      .querySelector('button[aria-pressed="true"]')
      ?.textContent;
    expect(yorkerPressed).toMatch(/Yorker/);
  });
});
