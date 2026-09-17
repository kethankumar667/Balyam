import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, act, renderHook } from "@testing-library/react";
import { useGame2048 } from "../useGame2048";
import QuantumCodexModal from "../QuantumCodexModal";
import { getTileVisual } from "../tileStyles";
import { createDateSeed, mulberry32 } from "../prng";
import { slideAndMerge } from "../grid";
import { getGame2048Stats, syncGame2048Stats } from "../../../lib/game2048StatsApi";

vi.mock("../../../lib/game2048StatsApi", () => ({
  getGame2048Stats: vi.fn().mockResolvedValue(null),
  syncGame2048Stats: vi.fn().mockResolvedValue(null),
}));

const mockedGetGame2048Stats = vi.mocked(getGame2048Stats);
const mockedSyncGame2048Stats = vi.mocked(syncGame2048Stats);

describe("2048 Futuristic Feature Systems", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockedGetGame2048Stats.mockReset().mockResolvedValue(null);
    mockedSyncGame2048Stats.mockReset().mockResolvedValue(null);
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("Tactical Power-Up Augments", () => {
    it("Quantum Swap toggles swapping mode and transposes adjacent cells", () => {
      const { result } = renderHook(() => useGame2048());
      act(() => result.current.selectMode("zen"));

      expect(result.current.quantumSwapCharges).toBe(2);
      expect(result.current.isSwapping).toBe(false);

      act(() => result.current.activateSwap());
      expect(result.current.isSwapping).toBe(true);

      // Deterministic spawn puts tiles at index 0 and index 1
      const tile0 = result.current.grid[0];
      const tile1 = result.current.grid[1];
      expect(tile0).not.toBeNull();
      expect(tile1).not.toBeNull();

      // Click cell 0, then adjacent cell 1
      act(() => result.current.onTileClick(0));
      expect(result.current.selectedSwapIdx).toBe(0);

      act(() => result.current.onTileClick(1));
      expect(result.current.isSwapping).toBe(false);
      expect(result.current.selectedSwapIdx).toBeNull();
      expect(result.current.quantumSwapCharges).toBe(1);

      // Cells are swapped
      expect(result.current.grid[0]).toEqual(tile1);
      expect(result.current.grid[1]).toEqual(tile0);
    });

    it("Quantum Swap rejects non-adjacent cells without consuming a charge", () => {
      const { result } = renderHook(() => useGame2048());
      act(() => result.current.selectMode("zen"));

      act(() => result.current.activateSwap());
      // Index 0 and Index 3 are in the same row but not adjacent (distance > 1)
      act(() => result.current.onTileClick(0));
      act(() => result.current.onTileClick(3));

      expect(result.current.quantumSwapCharges).toBe(2);
      expect(result.current.isSwapping).toBe(true);
    });

    it("Cryo Freeze engages stasis and ticks down", () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useGame2048());
      act(() => result.current.selectMode("battle"));

      expect(result.current.cryoFreezeCharges).toBe(1);
      expect(result.current.isCryoFrozen).toBe(false);

      act(() => result.current.activateCryo());
      expect(result.current.isCryoFrozen).toBe(true);
      expect(result.current.cryoSecondsLeft).toBe(10);
      expect(result.current.cryoFreezeCharges).toBe(0);

      // Advance 5 seconds
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(result.current.cryoSecondsLeft).toBe(5);
      expect(result.current.isCryoFrozen).toBe(true);

      // Advance remaining 6 seconds
      act(() => {
        vi.advanceTimersByTime(6000);
      });
      expect(result.current.isCryoFrozen).toBe(false);
    });

    it("Prism Core Wildcard spawns a wildcard tile and merges to double value", () => {
      const { result } = renderHook(() => useGame2048());
      act(() => result.current.selectMode("zen"));

      expect(result.current.wildcardCharges).toBe(1);

      act(() => result.current.activateWildcard());
      expect(result.current.wildcardCharges).toBe(0);

      const wildcardCell = result.current.grid.find((c) => c?.isWildcard);
      expect(wildcardCell).toBeTruthy();
      expect(wildcardCell?.isWildcard).toBe(true);
      expect(wildcardCell?.value).toBe(0);

      // Slide and merge with a wildcard doubles the matching tile
      const customGrid = [
        { value: 8 },
        { value: 0, isWildcard: true },
        null, null,
        null, null, null, null,
        null, null, null, null,
        null, null, null, null,
      ];
      const slide = slideAndMerge(customGrid, "left");
      expect(slide.moved).toBe(true);
      expect(slide.grid[0]?.value).toBe(16);
      expect(slide.scoreGained).toBe(16);
    });
  });

  describe("Daily Seeded Puzzle & Ghost Challenges", () => {
    it("mulberry32 PRNG produces deterministic sequences from date seed", () => {
      const seedA = createDateSeed("2026-09-17");
      const seedB = createDateSeed("2026-09-17");
      expect(seedA).toBe(seedB);

      const rngA = mulberry32(seedA);
      const rngB = mulberry32(seedB);

      const seqA = [rngA(), rngA(), rngA(), rngA()];
      const seqB = [rngB(), rngB(), rngB(), rngB()];
      expect(seqA).toEqual(seqB);
    });

    it("Daily mode initializes deterministic starting board", () => {
      const first = renderHook(() => useGame2048());
      act(() => first.result.current.selectMode("daily"));
      const firstGrid = first.result.current.grid.map((c) => c?.value ?? 0);

      const second = renderHook(() => useGame2048());
      act(() => second.result.current.selectMode("daily"));
      const secondGrid = second.result.current.grid.map((c) => c?.value ?? 0);

      expect(firstGrid).toEqual(secondGrid);
    });
  });

  describe("Themes & Quantum Codex Showroom", () => {
    it("switches table theme and applies distinct tile visuals", () => {
      const { result } = renderHook(() => useGame2048());
      expect(result.current.theme).toBe("cyberpunk");

      act(() => result.current.setTheme("obsidian"));
      expect(result.current.theme).toBe("obsidian");

      const visualObsidian = getTileVisual(2048, "obsidian");
      expect(visualObsidian.bg).toContain("#D4AF37");
      expect(visualObsidian.border).toContain("212, 175, 55");

      const visualSynthwave = getTileVisual(2048, "synthwave");
      expect(visualSynthwave.border).toContain("0, 240, 255");
    });

    it("Quantum Codex Modal renders unlocked energy tiers", () => {
      const onClose = vi.fn();
      render(<QuantumCodexModal isOpen={true} onClose={onClose} highestEver={2048} />);

      expect(screen.getByText("QUANTUM CODEX")).toBeTruthy();
      expect(screen.getByText("Quantum Singularity")).toBeTruthy();
      expect(screen.getByText("HARNESSED", { exact: false })).toBeTruthy();

      const closeBtn = screen.getByRole("button", { name: "Close Codex" });
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalled();
    });
  });
});

