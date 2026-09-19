import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  GAME_ACADEMY_CATALOG,
  getGameAcademy,
  hasGameAcademy,
  getAllAcademySpecs,
} from "../data";
import { useGameAcademy } from "../hooks/useGameAcademy";
import { HapticsManager } from "../../../services/HapticsManager";
import { AudioManager } from "../../../services/AudioManager";
import type { GameAcademySpec } from "../types/academy";

const STORAGE_KEY_PATTERN = /^bhalyam\.academy\.[a-z0-9]+\.v2$/;
const REQUIRED_SLUGS = [
  "ludo",
  "rummy",
  "uno",
  "handcricket",
  "snl",
  "rps",
  "wordbuilding",
  "dotsboxes",
  "stargame",
  "bingo",
  "chess",
  "carrom",
  "snake",
  "tetris",
  "breakout",
  "2048",
  "sudoku",
  "tictactoe",
];

const isNonEmpty = (value: string | undefined): boolean =>
  typeof value === "string" && value.trim().length > 0;

/** The catalog may register one spec under several keys (aliases); dedupe by slug. */
const uniqueSpecs = (): GameAcademySpec[] => [
  ...new Map(getAllAcademySpecs().map((spec) => [spec.slug, spec])).values(),
];

describe("BHALYAM Game Academy", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("catalog integrity", () => {
    it("registers every core game and resolves it by slug", () => {
      for (const slug of REQUIRED_SLUGS) {
        expect(hasGameAcademy(slug), slug).toBe(true);
        expect(getGameAcademy(slug)?.slug).toBe(slug);
      }
    });

    it("files every spec under its own slug; any other key is an alias of a registered spec", () => {
      for (const [key, spec] of Object.entries(GAME_ACADEMY_CATALOG)) {
        if (key === spec.slug) continue;
        expect(GAME_ACADEMY_CATALOG[spec.slug], `alias ${key}`).toBe(spec);
      }
    });

    it("gives every spec real copy, at least one slide and at least one cheatsheet section", () => {
      for (const spec of uniqueSpecs()) {
        expect(isNonEmpty(spec.title), `${spec.slug} title`).toBe(true);
        expect(isNonEmpty(spec.tagline), `${spec.slug} tagline`).toBe(true);
        expect(spec.slides.length, `${spec.slug} slides`).toBeGreaterThanOrEqual(1);
        expect(spec.cheatsheet.length, `${spec.slug} cheatsheet`).toBeGreaterThanOrEqual(1);
      }
    });

    it("gives every slide a non-empty badge, title, summary and key rule", () => {
      for (const spec of uniqueSpecs()) {
        for (const slide of spec.slides) {
          const where = `${spec.slug}/${slide.id}`;
          expect(isNonEmpty(slide.id), `${where} id`).toBe(true);
          expect(isNonEmpty(slide.badge), `${where} badge`).toBe(true);
          expect(isNonEmpty(slide.title), `${where} title`).toBe(true);
          expect(isNonEmpty(slide.summary), `${where} summary`).toBe(true);
          expect(isNonEmpty(slide.keyRule), `${where} keyRule`).toBe(true);
        }
      }
    });

    it("uses unique slide ids within each spec", () => {
      for (const spec of uniqueSpecs()) {
        const ids = spec.slides.map((slide) => slide.id);
        expect(new Set(ids).size, `${spec.slug} duplicate slide id`).toBe(ids.length);
      }
    });

    it("uses well-formed, unique storage keys in the declared bhalyam.academy namespace", () => {
      const keys = uniqueSpecs().map((spec) => spec.storageKey);
      for (const key of keys) expect(key).toMatch(STORAGE_KEY_PATTERN);
      expect(new Set(keys).size).toBe(keys.length);
    });
  });

  describe("useGameAcademy state machine", () => {
    const ludo = (): GameAcademySpec => getGameAcademy("ludo") as GameAcademySpec;

    it("manages step progression, boundaries, mode and completion", () => {
      const spec = ludo();
      const onClose = vi.fn();
      const { result } = renderHook(() => useGameAcademy(spec, "walkthrough", onClose));

      expect(result.current.mode).toBe("walkthrough");
      expect(result.current.currentStep).toBe(0);
      expect(result.current.isFirstStep).toBe(true);
      expect(result.current.isLastStep).toBe(false);

      act(() => result.current.nextStep());
      expect(result.current.currentStep).toBe(1);
      expect(result.current.isFirstStep).toBe(false);

      act(() => result.current.prevStep());
      act(() => result.current.prevStep());
      expect(result.current.currentStep).toBe(0);

      act(() => result.current.setCurrentStep(999));
      expect(result.current.currentStep).toBe(spec.slides.length - 1);
      expect(result.current.isLastStep).toBe(true);

      act(() => result.current.setMode("cheatsheet"));
      expect(result.current.mode).toBe("cheatsheet");

      expect(localStorage.getItem(spec.storageKey)).toBeNull();
      act(() => result.current.nextStep());
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(localStorage.getItem(spec.storageKey)).toBe("1");
    });

    it("keeps completeAndClose and nextStep referentially stable when only the caller's onClose changes", () => {
      const spec = ludo();
      const { result, rerender } = renderHook(
        ({ onClose }) => useGameAcademy(spec, "walkthrough", onClose),
        { initialProps: { onClose: () => undefined } },
      );
      const { completeAndClose, nextStep } = result.current;

      rerender({ onClose: () => undefined });
      rerender({ onClose: () => undefined });

      expect(result.current.completeAndClose).toBe(completeAndClose);
      expect(result.current.nextStep).toBe(nextStep);
    });

    it("calls the latest onClose, not the one from the first render", () => {
      const spec = ludo();
      const first = vi.fn();
      const latest = vi.fn();
      const { result, rerender } = renderHook(
        ({ onClose }) => useGameAcademy(spec, "walkthrough", onClose),
        { initialProps: { onClose: first } },
      );

      rerender({ onClose: latest });
      act(() => result.current.completeAndClose());

      expect(first).not.toHaveBeenCalled();
      expect(latest).toHaveBeenCalledTimes(1);
    });

    it("still completes and persists when localStorage throws", () => {
      const spec = ludo();
      const onClose = vi.fn();
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("quota");
      });
      const { result } = renderHook(() => useGameAcademy(spec, "walkthrough", onClose));

      act(() => result.current.completeAndClose());

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("does not read localStorage on mount (no completion state is exposed)", () => {
      const getItem = vi.spyOn(Storage.prototype, "getItem");
      renderHook(() => useGameAcademy(ludo(), "walkthrough"));
      expect(getItem).not.toHaveBeenCalledWith(ludo().storageKey);
    });

    it("records a sandbox completion once and never plays a reward sound", () => {
      const win = vi.spyOn(HapticsManager.getInstance(), "win");
      const play = vi.spyOn(AudioManager, "play");
      const { result } = renderHook(() => useGameAcademy(ludo(), "walkthrough"));

      expect(result.current.completedSandboxes.has("objective")).toBe(false);

      act(() => result.current.markSandboxComplete("objective"));
      act(() => result.current.markSandboxComplete("objective"));

      expect(result.current.completedSandboxes.has("objective")).toBe(true);
      expect(result.current.completedSandboxes.size).toBe(1);
      expect(win).toHaveBeenCalledTimes(1);
      expect(play).not.toHaveBeenCalled();
    });

    it("de-duplicates completions reported synchronously in the same tick", () => {
      const win = vi.spyOn(HapticsManager.getInstance(), "win");
      const { result } = renderHook(() => useGameAcademy(ludo(), "walkthrough"));

      act(() => {
        result.current.markSandboxComplete("objective");
        result.current.markSandboxComplete("objective");
      });

      expect(win).toHaveBeenCalledTimes(1);
    });
  });
});
