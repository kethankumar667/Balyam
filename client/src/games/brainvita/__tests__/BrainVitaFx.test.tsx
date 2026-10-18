import { act, fireEvent, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

const audio = vi.hoisted(() => ({
  setAmbient: vi.fn(),
  resolveAmbient: vi.fn(),
  stopAmbient: vi.fn(),
  setVoice: vi.fn(),
  playPick: vi.fn(),
  playJump: vi.fn(),
  playRefuse: vi.fn(),
  playWin: vi.fn(),
  playStuck: vi.fn(),
  isMuted: vi.fn(() => false),
  toggleMute: vi.fn(() => true),
}));
vi.mock("../brainvitaAudio", () => ({ brainvitaAudio: audio, BRAINVITA_MUTE_STORAGE_KEY: "bhalyam.brainvita.muted" }));

const recordSoloScore = vi.fn();
vi.mock("../../../store/scorecardStore", () => ({ recordSoloScore: (...args: unknown[]) => recordSoloScore(...args) }));

import { BrainVitaGrid } from "../BrainVitaGrid";
import { BrainVitaJumpLayer } from "../BrainVitaJumpLayer";
import { MarbleBody } from "../BrainVitaMarble";
import { BrainVitaThemeDialog, WORLD_BLURBS } from "../BrainVitaThemeDialog";
import BrainVitaResultModal from "../BrainVitaResultModal";
import { BrainVitaSkinContext } from "../BrainVitaSkinContext";
import { useBrainVita, BRAINVITA_TUTORIAL_KEY } from "../useBrainVita";
import { useJumpFlight } from "../useJumpFlight";
import { CENTRE_HOLE, applyMove, createBoard, holeAt, legalMoves, marbleCount, solveFrom, type Move } from "../brainvitaRules";
import { DISSOLVE_DURATION_MS, JUMP_DURATION_MS } from "../brainvitaJump";
import { ORDER_STORAGE_KEY, SKINS, SKIN_IDS, SKIN_STORAGE_KEY, UNLOCKED_STORAGE_KEY, parseOrder, requirementText, skinsEarnedBy, type EarnedSkinId, type SkinId } from "../brainvitaSkins";
import type { GameResult } from "../brainvitaGame";
import { capabilitiesFor } from "@shared/permissions";
import { useAuthStore } from "../../../store/authStore";

const hole = (row: number, col: number): number => holeAt(row, col) as number;
const firstJump: Move = { from: hole(1, 3), over: hole(2, 3), to: CENTRE_HOLE };
/** Legal straight after firstJump: it lands in the hole the first jump emptied beside it. */
const secondJump: Move = { from: hole(2, 1), over: hole(2, 2), to: hole(2, 3) };

describe("useJumpFlight", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const render2 = (initial: Move[], isMotionOn = true) => renderHook(({ moves, on }) => useJumpFlight(moves, on), { initialProps: { moves: initial, on: isMotionOn } });

  it("reports nothing before any jump", () => {
    const { result } = render2([]);
    expect(result.current).toEqual({ flight: null, burst: null });
  });

  it("reports a jump the moment it is made, then lets the marble land, then lets the capture finish dissolving", () => {
    const { result, rerender } = render2([]);
    rerender({ moves: [firstJump], on: true });
    expect(result.current.flight?.move).toEqual(firstJump);
    expect(result.current.burst?.move).toEqual(firstJump);
    act(() => {
      vi.advanceTimersByTime(JUMP_DURATION_MS + 1);
    });
    expect(result.current.flight).toBeNull();
    expect(result.current.burst).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(DISSOLVE_DURATION_MS);
    });
    expect(result.current.burst).toBeNull();
  });

  it("gives each jump its own id, so the same move twice restarts the animation", () => {
    const { result, rerender } = render2([]);
    rerender({ moves: [firstJump], on: true });
    const first = result.current.flight?.id;
    rerender({ moves: [firstJump, secondJump], on: true });
    expect(result.current.flight?.id).toBeGreaterThan(first as number);
  });

  it("does not animate an undo, a restart, or a board that arrives with several jumps already made", () => {
    const { result, rerender } = render2([firstJump, secondJump]);
    expect(result.current.flight).toBeNull();
    rerender({ moves: [firstJump], on: true });
    expect(result.current.flight).toBeNull();
    rerender({ moves: [], on: true });
    expect(result.current).toEqual({ flight: null, burst: null });
  });

  it("stays silent when motion is off, which is the whole reduced-motion fallback", () => {
    const { result, rerender } = render2([], false);
    rerender({ moves: [firstJump], on: false });
    expect(result.current).toEqual({ flight: null, burst: null });
  });
});

/** A player's ladder, fixed so the tests know which theme sits on which rung. */
const LADDER: readonly EarnedSkinId[] = ["holo", "zen", "reef", "toy", "palace"];

/** A full game of random legal jumps played until nothing can move, found by trying seeds until it leaves the wanted number of marbles. */
function strandedLine(wanted: number): Move[] {
  for (let seed = 1; seed < 20000; seed += 1) {
    let state = seed;
    const random = (): number => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };
    let board: boolean[] = createBoard();
    const line: Move[] = [];
    for (;;) {
      const moves = legalMoves(board);
      if (moves.length === 0) break;
      const move = moves[Math.floor(random() * moves.length)];
      board = applyMove(board, move) as boolean[];
      line.push(move);
    }
    if (marbleCount(board) === wanted) return line;
  }
  throw new Error("no game found that ends with " + wanted + " marbles");
}

describe("useBrainVita: themes and the drone", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    localStorage.setItem(BRAINVITA_TUTORIAL_KEY, "1");
    localStorage.setItem(ORDER_STORAGE_KEY, LADDER.join(","));
    recordSoloScore.mockReset();
    recordSoloScore.mockResolvedValue({ isNewPersonalBest: false });
    Object.values(audio).forEach((fn) => fn.mockClear());
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const solution = (): Move[] => solveFrom(createBoard()) as Move[];
  const play = (result: { current: ReturnType<typeof useBrainVita> }, moves: readonly Move[]): void => {
    for (const move of moves) {
      act(() => result.current.tap(move.from));
      act(() => result.current.tap(move.to));
    }
  };

  it("starts on the wood table with only that earned", () => {
    const { result } = renderHook(() => useBrainVita());
    expect(result.current.skin).toBe("wood");
    expect(result.current.unlockedSkins).toEqual(["wood"]);
    expect(result.current.justUnlocked).toEqual([]);
  });

  it("uses this player's stored ladder", () => {
    const { result } = renderHook(() => useBrainVita());
    expect(result.current.themeOrder).toEqual(LADDER);
  });

  it("draws a ladder for a new player the first time, and keeps it", () => {
    localStorage.removeItem(ORDER_STORAGE_KEY);
    const first = renderHook(() => useBrainVita());
    const drawn = first.result.current.themeOrder;
    expect([...drawn].sort()).toEqual([...LADDER].sort());
    expect(parseOrder(localStorage.getItem(ORDER_STORAGE_KEY))).toEqual(drawn);
    first.unmount();
    expect(renderHook(() => useBrainVita()).result.current.themeOrder).toEqual(drawn);
  });

  it("earns every theme from a clean one-marble game, and remembers them", () => {
    const { result } = renderHook(() => useBrainVita());
    play(result, solution());
    expect(result.current.justUnlocked).toEqual(LADDER);
    expect(result.current.unlockedSkins).toEqual(["wood", ...LADDER]);
    expect(localStorage.getItem(UNLOCKED_STORAGE_KEY)).toBe("wood," + LADDER.join(","));
  });

  it("earns only the rungs a game reached: 5 marbles left earns the first theme and nothing more", () => {
    const { result } = renderHook(() => useBrainVita());
    play(result, strandedLine(5));
    expect(result.current.result?.marblesLeft).toBe(5);
    expect(result.current.justUnlocked).toEqual(["holo"]);
    expect(result.current.unlockedSkins).toEqual(["wood", "holo"]);
  });

  it("earns the rungs the ending really reached, whatever that was", () => {
    for (const left of [3, 4]) {
      localStorage.removeItem(UNLOCKED_STORAGE_KEY);
      const { result, unmount } = renderHook(() => useBrainVita());
      play(result, strandedLine(left));
      const expected = skinsEarnedBy({ marblesLeft: left, usedHelp: false }, LADDER);
      expect(expected).toHaveLength(6 - left);
      expect(result.current.justUnlocked).toEqual(expected);
      unmount();
    }
  });

  it("earns nothing from a game that ended with more than 5 marbles", () => {
    const { result } = renderHook(() => useBrainVita());
    play(result, strandedLine(8));
    expect(result.current.finished).toBe(true);
    expect(result.current.justUnlocked).toEqual([]);
    expect(result.current.unlockedSkins).toEqual(["wood"]);
  });

  it("does not earn from a game that used undo, even a perfect one", () => {
    const { result } = renderHook(() => useBrainVita());
    play(result, [solution()[0]]);
    act(() => result.current.undo());
    play(result, solution());
    expect(result.current.result?.marblesLeft).toBe(1);
    expect(result.current.unlockedSkins).toEqual(["wood"]);
    expect(result.current.justUnlocked).toEqual([]);
  });

  it("keeps what was earned when a later game goes worse, and announces only what is new", () => {
    const { result } = renderHook(() => useBrainVita());
    play(result, strandedLine(5));
    act(() => result.current.restart());
    play(result, strandedLine(8));
    expect(result.current.unlockedSkins).toEqual(["wood", "holo"]);
    expect(result.current.justUnlocked).toEqual([]);
    act(() => result.current.restart());
    play(result, strandedLine(4));
    expect(result.current.justUnlocked).toEqual(["zen"]);
    expect(result.current.unlockedSkins).toEqual(["wood", "holo", "zen"]);
  });

  it("will not select a theme that has not been earned, and does once it has", () => {
    const { result } = renderHook(() => useBrainVita());
    act(() => result.current.selectSkin("toy"));
    expect(result.current.skin).toBe("wood");
    play(result, solution());
    act(() => result.current.selectSkin("toy"));
    expect(result.current.skin).toBe("toy");
    expect(localStorage.getItem(SKIN_STORAGE_KEY)).toBe("toy");
  });

  it("clears the new-theme marker when a new game starts", () => {
    const { result } = renderHook(() => useBrainVita());
    play(result, solution());
    act(() => result.current.restart());
    expect(result.current.justUnlocked).toEqual([]);
  });

  it("restores an earned, chosen theme on the next visit", () => {
    localStorage.setItem(UNLOCKED_STORAGE_KEY, "wood,palace");
    localStorage.setItem(SKIN_STORAGE_KEY, "palace");
    const { result } = renderHook(() => useBrainVita());
    expect(result.current.skin).toBe("palace");
  });

  it("starts the drone on the first jump and thins it as marbles go", () => {
    const { result } = renderHook(() => useBrainVita());
    expect(audio.setAmbient).not.toHaveBeenCalled();
    play(result, [firstJump]);
    expect(audio.setAmbient).toHaveBeenLastCalledWith(31);
    play(result, [secondJump]);
    expect(audio.setAmbient).toHaveBeenLastCalledWith(30);
  });

  it("resolves the drone to the bright chord for one marble left", () => {
    const { result } = renderHook(() => useBrainVita());
    play(result, solution());
    expect(audio.resolveAmbient).toHaveBeenCalledWith(true);
  });

  it("is quiet again after a restart, and when the screen is left", () => {
    const { result, unmount } = renderHook(() => useBrainVita());
    play(result, [firstJump]);
    audio.stopAmbient.mockClear();
    act(() => result.current.restart());
    expect(audio.stopAmbient).toHaveBeenCalled();
    audio.stopAmbient.mockClear();
    unmount();
    expect(audio.stopAmbient).toHaveBeenCalled();
  });

  it("brings the drone back when sound is unmuted mid-game", () => {
    const { result } = renderHook(() => useBrainVita());
    play(result, [firstJump]);
    audio.setAmbient.mockClear();
    audio.toggleMute.mockReturnValueOnce(false);
    act(() => result.current.toggleMute());
    expect(audio.setAmbient).toHaveBeenCalledWith(31);
  });
});

describe("dragging a marble", () => {
  const BOX = 700;
  let box: { mockRestore: () => void };

  beforeEach(() => {
    box = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockReturnValue({ left: 0, top: 0, right: BOX, bottom: BOX, width: BOX, height: BOX, x: 0, y: 0, toJSON: () => ({}) });
  });
  afterEach(() => {
    box.mockRestore();
  });

  const setup = () => {
    const onTap = vi.fn();
    const view = render(<BrainVitaGrid board={createBoard()} selected={null} targets={[]} hint={null} disabled={false} onTap={onTap} />);
    const marble = (row: number, col: number) => view.container.querySelector(`[data-hole="${hole(row, col)}"]`) as HTMLElement;
    return { onTap, view, marble };
  };

  /** A pointer event with real coordinates: jsdom has no PointerEvent, and React reads these off the native event. */
  const pointer = (target: Element, type: "pointerdown" | "pointermove" | "pointerup", x: number, y: number): void => {
    act(() => {
      target.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 }));
    });
  };
  const at = (cellX: number, cellY: number): [number, number] => [(cellX / 7) * BOX, (cellY / 7) * BOX];

  it("carries a marble to a landing hole: picks it up, then makes the jump", () => {
    const { onTap, marble } = setup();
    const source = marble(1, 3);
    pointer(source, "pointerdown", ...at(3.5, 1.5));
    pointer(source, "pointermove", ...at(3.5, 2.6));
    pointer(source, "pointermove", ...at(3.5, 3.5));
    pointer(source, "pointerup", ...at(3.5, 3.5));
    expect(onTap.mock.calls.map(([h]) => h)).toEqual([hole(1, 3), CENTRE_HOLE]);
  });

  it("pulls into the landing hole once close, and not before", () => {
    const { onTap, marble } = setup();
    const source = marble(1, 3);
    pointer(source, "pointerdown", ...at(3.5, 1.5));
    pointer(source, "pointermove", ...at(3.5, 2.2));
    pointer(source, "pointerup", ...at(3.5, 2.2));
    expect(onTap.mock.calls.map(([h]) => h)).not.toContain(CENTRE_HOLE);
    onTap.mockClear();
    pointer(source, "pointerdown", ...at(3.5, 1.5));
    pointer(source, "pointermove", ...at(3.5, 3.0));
    pointer(source, "pointerup", ...at(3.5, 3.0));
    expect(onTap.mock.calls.map(([h]) => h)).toEqual([hole(1, 3), CENTRE_HOLE]);
  });

  it("puts the marble back when it is let go over open wood", () => {
    const { onTap, marble } = setup();
    const source = marble(1, 3);
    pointer(source, "pointerdown", ...at(3.5, 1.5));
    pointer(source, "pointermove", ...at(1.0, 0.5));
    pointer(source, "pointerup", ...at(1.0, 0.5));
    expect(onTap.mock.calls.map(([h]) => h)).toEqual([hole(1, 3), hole(1, 3)]);
  });

  it("leaves a press that barely moves alone, so tap-then-tap is unchanged", () => {
    const { onTap, marble } = setup();
    const source = marble(1, 3);
    const [x, y] = at(3.5, 1.5);
    pointer(source, "pointerdown", x, y);
    pointer(source, "pointermove", x + 2, y + 2);
    pointer(source, "pointerup", x, y);
    expect(onTap).not.toHaveBeenCalled();
    fireEvent.click(source);
    expect(onTap).toHaveBeenCalledWith(hole(1, 3));
  });

  it("swallows the click that follows a drag, then lets clicks through again", () => {
    vi.useFakeTimers();
    const { onTap, marble } = setup();
    const source = marble(1, 3);
    pointer(source, "pointerdown", ...at(3.5, 1.5));
    pointer(source, "pointermove", ...at(3.5, 3.5));
    pointer(source, "pointerup", ...at(3.5, 3.5));
    onTap.mockClear();
    fireEvent.click(marble(3, 3));
    expect(onTap).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(5);
    });
    fireEvent.click(marble(3, 2));
    expect(onTap).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("does not start a drag from a marble with nowhere to go", () => {
    const { onTap, marble } = setup();
    const stuck = marble(0, 2);
    pointer(stuck, "pointerdown", ...at(2.5, 0.5));
    pointer(stuck, "pointermove", ...at(3.5, 3.5));
    pointer(stuck, "pointerup", ...at(3.5, 3.5));
    expect(onTap).not.toHaveBeenCalled();
  });

  it("does nothing once the game is over", () => {
    const onTap = vi.fn();
    const view = render(<BrainVitaGrid board={createBoard()} selected={null} targets={[]} hint={null} disabled onTap={onTap} />);
    const source = view.container.querySelector(`[data-hole="${hole(1, 3)}"]`) as HTMLElement;
    pointer(source, "pointerdown", ...at(3.5, 1.5));
    pointer(source, "pointermove", ...at(3.5, 3.5));
    pointer(source, "pointerup", ...at(3.5, 3.5));
    expect(onTap).not.toHaveBeenCalled();
  });
});

describe("BrainVitaJumpLayer", () => {
  const jump = { id: 1, move: firstJump };

  it("draws nothing when there is no jump to show", () => {
    const { container } = render(<BrainVitaJumpLayer flight={null} burst={null} />);
    expect(container.querySelectorAll("span")).toHaveLength(0);
  });

  it("is decoration only: hidden from assistive tech and never in the way of a tap", () => {
    const { container } = render(<BrainVitaJumpLayer flight={jump} burst={jump} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute("aria-hidden", "true");
    expect(root).toHaveClass("pointer-events-none");
  });

  it("draws the marble and its trail, the dissolving marble, and the particles", () => {
    const { container } = render(<BrainVitaJumpLayer flight={jump} burst={jump} />);
    // five flying marbles (the marble and four ghosts), one dissolving, nine particles
    expect((container.firstElementChild as HTMLElement).children).toHaveLength(5 + 1 + 9);
  });

  it("insets each marble inside its cell by a percentage of the marble, never by padding", () => {
    // Percentage padding is measured against the width of the whole board, which once squeezed every marble to nothing.
    const { container } = render(<BrainVitaJumpLayer flight={jump} burst={jump} />);
    expect(container.querySelectorAll("[style*=\"padding\"]")).toHaveLength(0);
    expect(container.querySelectorAll("[class*=\"inset-[9%]\"]").length).toBe(5 + 1);
  });
});

describe("the holo skin on the board", () => {
  const grid = (props: Partial<Parameters<typeof BrainVitaGrid>[0]> = {}) =>
    render(<BrainVitaGrid board={createBoard()} selected={null} targets={[]} hint={null} disabled={false} onTap={vi.fn()} {...props} />);

  it("draws the glass board and datapad instead of the wood and the notepad", async () => {
    const view = render(
      <BrainVitaSkinContext.Provider value={SKINS.holo}>
        <BrainVitaGrid board={createBoard()} selected={null} targets={[]} hint={null} disabled={false} onTap={vi.fn()} />
      </BrainVitaSkinContext.Provider>,
    );
    await waitFor(() => expect(view.container.querySelector("#bh-glass")).not.toBeNull());
    expect(view.container.querySelector("#bv-wood")).toBeNull();
    await waitFor(() => expect(view.container.textContent).toContain("LEAVE ONE."));
    expect(screen.getAllByRole("button")).toHaveLength(33);
  });

  it("draws the wood by default", () => {
    const view = grid();
    expect(view.container.querySelector("#bv-wood")).not.toBeNull();
    expect(view.container.querySelector("#bh-glass")).toBeNull();
  });

  it("adds a Look button in the empty corner only when asked, as one more control", () => {
    const onOpenLook = vi.fn();
    grid({ onOpenLook });
    fireEvent.click(screen.getByRole("button", { name: "Choose a world" }));
    expect(onOpenLook).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole("button")).toHaveLength(34);
  });

  it("says in words when a new world is ready", () => {
    grid({ onOpenLook: vi.fn(), hasLookBadge: true });
    expect(screen.getByRole("button", { name: "Choose a world, a new world is ready" })).toBeInTheDocument();
  });

  it("paints the wooden board from the skin's own palette", () => {
    const view = render(
      <BrainVitaSkinContext.Provider value={SKINS.wood}>
        <BrainVitaGrid board={createBoard()} selected={null} targets={[]} hint={null} disabled={false} onTap={vi.fn()} />
      </BrainVitaSkinContext.Provider>,
    );
    const stops = [...view.container.querySelectorAll("#bv-wood stop")].map((stop) => stop.getAttribute("stop-color"));
    expect(stops).toEqual([...(SKINS.wood.board as NonNullable<typeof SKINS.wood.board>).stops]);
  });

  it("draws a different board in each world, not the same board in another colour", async () => {
    const BOARD_MARK: Record<SkinId, string> = { wood: "#bv-wood", holo: "#bh-glass", zen: "#bz-slate", reef: "#br-pearl", toy: "#bt-plastic", palace: "#bp-marble" };
    for (const id of SKIN_IDS) {
      const view = render(
        <BrainVitaSkinContext.Provider value={SKINS[id]}>
          <BrainVitaGrid board={createBoard()} selected={null} targets={[]} hint={null} disabled={false} onTap={vi.fn()} />
        </BrainVitaSkinContext.Provider>,
      );
      // Every world but the wood is fetched the first time it is shown.
      await waitFor(() => expect(view.container.querySelector(BOARD_MARK[id])).not.toBeNull());
      for (const [other, mark] of Object.entries(BOARD_MARK)) {
        expect(view.container.querySelector(mark) !== null, `${id} draws ${other}'s board`).toBe(other === id);
      }
      expect(screen.getAllByRole("button"), id).toHaveLength(33);
      view.unmount();
    }
  });

  it("draws each world's own props in the corners", async () => {
    const PROP_MARK: Record<SkinId, string> = { wood: "bvp-marble", holo: "REMOVE ALL", zen: "bz-bamboo", reef: "#9b4fc9", toy: ">C<", palace: "bp-brass" };
    for (const id of SKIN_IDS) {
      const view = render(
        <BrainVitaSkinContext.Provider value={SKINS[id]}>
          <BrainVitaGrid board={createBoard()} selected={null} targets={[]} hint={null} disabled={false} onTap={vi.fn()} />
        </BrainVitaSkinContext.Provider>,
      );
      await waitFor(() => expect(view.container.innerHTML).toContain(PROP_MARK[id]));
      view.unmount();
    }
  });

  it("keeps the board's holes and marbles in place while a world's drawing is still arriving", () => {
    render(
      <BrainVitaSkinContext.Provider value={SKINS.palace}>
        <BrainVitaGrid board={createBoard()} selected={null} targets={[]} hint={null} disabled={false} onTap={vi.fn()} />
      </BrainVitaSkinContext.Provider>,
    );
    expect(screen.getAllByRole("button")).toHaveLength(33);
  });
});

describe("the marble in each world", () => {
  const marble = (id: SkinId) => {
    const view = render(
      <BrainVitaSkinContext.Provider value={SKINS[id]}>
        <div style={{ position: "relative" }}>
          <MarbleBody />
        </div>
      </BrainVitaSkinContext.Provider>,
    );
    const html = view.container.innerHTML;
    view.unmount();
    return html;
  };

  it("has its own form in each world: no two worlds draw the same marble", () => {
    const forms = SKIN_IDS.map((id) => marble(id));
    expect(new Set(forms).size).toBe(SKIN_IDS.length);
  });

  it("cuts a gem as a many-sided stone and a pebble off-round, where the others are round", () => {
    expect(marble("palace")).toContain("clip-path");
    expect(marble("zen")).toContain("border-radius: 54% 46%");
    expect(marble("wood")).not.toContain("clip-path");
  });

  it("turns one pebble differently from the next", () => {
    const turned = (seed: number) => {
      const view = render(
        <BrainVitaSkinContext.Provider value={SKINS.zen}>
          <MarbleBody seed={seed} />
        </BrainVitaSkinContext.Provider>,
      );
      const html = view.container.innerHTML;
      view.unmount();
      return html;
    };
    expect(turned(1)).not.toEqual(turned(2));
  });
});

describe("BrainVitaThemeDialog", () => {
  const dialog = (overrides: Partial<Parameters<typeof BrainVitaThemeDialog>[0]> = {}) => {
    const props = {
      open: true,
      onClose: vi.fn(),
      skin: "wood" as const,
      unlocked: ["wood"] as const,
      order: LADDER,
      onSelectSkin: vi.fn(),
      ...overrides,
    };
    render(<BrainVitaThemeDialog {...props} />);
    return props;
  };

  it("names the dialog and offers the wood and all five earned worlds as a radio group", () => {
    dialog();
    const group = screen.getByRole("radiogroup", { name: "World" });
    expect(within(group).getAllByRole("radio")).toHaveLength(6);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("lists the themes in this player's own ladder order, after the classic wood", () => {
    const mine: readonly EarnedSkinId[] = ["palace", "toy", "holo", "reef", "zen"];
    dialog({ order: mine });
    const names = within(screen.getByRole("radiogroup", { name: "World" })).getAllByRole("radio").map((radio) => radio.querySelector("span.text-sm")?.textContent);
    expect(names).toEqual(["Classic wood", ...mine.map((id) => SKINS[id].name)]);
  });

  it("tells each locked theme's rung from the player's own ladder, not a fixed one", () => {
    const mine: readonly EarnedSkinId[] = ["palace", "toy", "holo", "reef", "zen"];
    dialog({ order: mine });
    expect(screen.getByText(requirementText(mine, "palace"))).toBeInTheDocument();
    expect(screen.getByText(requirementText(mine, "zen"))).toBeInTheDocument();
    expect(screen.getByText("Finish a game with 3 or fewer marbles left, without a hint or undo.")).toBeInTheDocument();
  });

  it("will not pick a locked theme", () => {
    const props = dialog();
    const holo = screen.getByRole("radio", { name: /Neon deck/ });
    expect(holo).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(holo);
    expect(props.onSelectSkin).not.toHaveBeenCalled();
  });

  it("picks an earned world, marks the chosen one, and stops asking for what it already has", () => {
    const props = dialog({ unlocked: ["wood", "holo", "toy"], skin: "wood" });
    expect(screen.getByRole("radio", { name: /Classic wood/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.queryByText(requirementText(LADDER, "holo"))).not.toBeInTheDocument();
    expect(screen.getByText(requirementText(LADDER, "zen"))).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /Toy box/ }));
    expect(props.onSelectSkin).toHaveBeenCalledWith("toy");
  });

  it("has no tilt switch any more", () => {
    dialog();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("says in a line what each world is, locked or not", () => {
    dialog();
    for (const id of SKIN_IDS) expect(screen.getByText(WORLD_BLURBS[id])).toBeInTheDocument();
  });

  it("closes from its own button", () => {
    const props = dialog();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(props.onClose).toHaveBeenCalled();
  });
});

describe("the results dialog and new worlds", () => {
  const result = { marblesLeft: 1, moves: 31, lastInCentre: true, usedHelp: false, rating: { title: "Genius", isPerfect: true } } as unknown as GameResult;
  const modal = (extra: Partial<Parameters<typeof BrainVitaResultModal>[0]> = {}) =>
    render(<BrainVitaResultModal open result={result} seconds={12} newPersonalBest={false} onPlayAgain={vi.fn()} onReview={vi.fn()} onLeave={vi.fn()} {...extra} />);

  it("says nothing about worlds unless some were just earned", () => {
    modal();
    expect(screen.queryByText(/world/i)).not.toBeInTheDocument();
  });

  it("announces one world earned and offers to try it", () => {
    const onTryTheme = vi.fn();
    modal({ unlockedSkinNames: ["Neon deck"], onTryTheme });
    expect(screen.getByText("New world unlocked: Neon deck")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try it" }));
    expect(onTryTheme).toHaveBeenCalledTimes(1);
  });

  it("names every world a strong game earned at once", () => {
    modal({ unlockedSkinNames: ["Neon deck", "Zen garden", "Toy box"], onTryTheme: vi.fn() });
    expect(screen.getByText("New worlds unlocked: Neon deck, Zen garden, Toy box")).toBeInTheDocument();
  });
});

describe("worlds for an account that can unlock everything", () => {
  const asAdmin = () => useAuthStore.setState({ capabilities: capabilitiesFor("super_admin") });
  const asPlayer = () => useAuthStore.setState({ capabilities: capabilitiesFor("guest") });

  const play = (result: { current: ReturnType<typeof useBrainVita> }, moves: readonly Move[]): void => {
    for (const move of moves) {
      act(() => result.current.tap(move.from));
      act(() => result.current.tap(move.to));
    }
  };

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    localStorage.setItem(BRAINVITA_TUTORIAL_KEY, "1");
    localStorage.setItem(ORDER_STORAGE_KEY, LADDER.join(","));
    recordSoloScore.mockReset();
    recordSoloScore.mockResolvedValue({ isNewPersonalBest: false });
    asPlayer();
  });
  afterEach(() => {
    vi.useRealTimers();
    asPlayer();
  });

  it("opens all six worlds, and picks any of them", () => {
    asAdmin();
    const { result } = renderHook(() => useBrainVita());
    expect(result.current.isAllOpen).toBe(true);
    expect(result.current.unlockedSkins).toEqual(SKIN_IDS);
    act(() => result.current.selectSkin("palace"));
    expect(result.current.skin).toBe("palace");
  });

  it("shows the open worlds without saving them as earned", () => {
    asAdmin();
    const { result } = renderHook(() => useBrainVita());
    act(() => result.current.selectSkin("reef"));
    expect(localStorage.getItem(SKIN_STORAGE_KEY)).toBe("reef");
    expect(localStorage.getItem(UNLOCKED_STORAGE_KEY)).toBeNull();
  });

  it("leaves an ordinary account with only what it has earned", () => {
    const { result } = renderHook(() => useBrainVita());
    expect(result.current.isAllOpen).toBe(false);
    expect(result.current.unlockedSkins).toEqual(["wood"]);
    act(() => result.current.selectSkin("palace"));
    expect(result.current.skin).toBe("wood");
  });

  it("shows the world an admin chose last time, even though it was never earned", () => {
    localStorage.setItem(SKIN_STORAGE_KEY, "toy");
    asAdmin();
    const { result } = renderHook(() => useBrainVita());
    expect(result.current.skin).toBe("toy");
  });

  it("falls back to the wood when the account stops being able to unlock everything", () => {
    localStorage.setItem(SKIN_STORAGE_KEY, "toy");
    asAdmin();
    const { result } = renderHook(() => useBrainVita());
    expect(result.current.skin).toBe("toy");
    act(() => asPlayer());
    expect(result.current.skin).toBe("wood");
    expect(result.current.unlockedSkins).toEqual(["wood"]);
  });

  it("still earns worlds the ordinary way while everything is open", () => {
    asAdmin();
    const { result } = renderHook(() => useBrainVita());
    play(result, strandedLine(4));
    expect(result.current.justUnlocked.length).toBeGreaterThan(0);
    expect(localStorage.getItem(UNLOCKED_STORAGE_KEY)).toContain("holo");
  });

  it("tells the picker that everything is open, and says so in words", () => {
    render(<BrainVitaThemeDialog open onClose={vi.fn()} skin="wood" unlocked={SKIN_IDS} order={LADDER} onSelectSkin={vi.fn()} isAllOpen />);
    expect(screen.getByText(/Every world is open on this account/)).toBeInTheDocument();
    expect(screen.queryAllByText(/Finish a game with/)).toHaveLength(0);
  });
});
