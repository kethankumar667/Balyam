import { act, fireEvent, render, renderHook, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

const audio = vi.hoisted(() => ({
  setAmbient: vi.fn(),
  resolveAmbient: vi.fn(),
  stopAmbient: vi.fn(),
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
import { BrainVitaThemeDialog } from "../BrainVitaThemeDialog";
import BrainVitaResultModal from "../BrainVitaResultModal";
import { BrainVitaSkinContext } from "../BrainVitaSkinContext";
import { useBrainVita, BRAINVITA_TUTORIAL_KEY } from "../useBrainVita";
import { useJumpFlight } from "../useJumpFlight";
import { requestMotionPermission, tiltFromOrientation, tiltFromPointer, TILT_RANGE_DEGREES } from "../useParallax";
import { CENTRE_HOLE, createBoard, holeAt, solveFrom, type Move } from "../brainvitaRules";
import { DISSOLVE_DURATION_MS, JUMP_DURATION_MS } from "../brainvitaJump";
import { HOLO_UNLOCK_MAX_MARBLES, SKINS, SKIN_STORAGE_KEY, TILT_STORAGE_KEY, UNLOCKED_STORAGE_KEY } from "../brainvitaSkins";
import type { GameResult } from "../brainvitaGame";

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

describe("useBrainVita: themes, tilt and the drone", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    localStorage.setItem(BRAINVITA_TUTORIAL_KEY, "1");
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
    expect(result.current.justUnlocked).toBeNull();
  });

  it("earns the holo table from a clean one-marble game, and remembers it", () => {
    const { result } = renderHook(() => useBrainVita());
    play(result, solution());
    expect(result.current.justUnlocked).toBe("holo");
    expect(result.current.unlockedSkins).toContain("holo");
    expect(localStorage.getItem(UNLOCKED_STORAGE_KEY)).toBe("wood,holo");
  });

  it("does not earn it from a game that used undo", () => {
    const { result } = renderHook(() => useBrainVita());
    play(result, [firstJump]);
    act(() => result.current.undo());
    play(result, solution());
    expect(result.current.result?.marblesLeft).toBe(1);
    expect(result.current.unlockedSkins).toEqual(["wood"]);
    expect(result.current.justUnlocked).toBeNull();
  });

  it("will not select a theme that has not been earned, and does once it has", () => {
    const { result } = renderHook(() => useBrainVita());
    act(() => result.current.selectSkin("holo"));
    expect(result.current.skin).toBe("wood");
    play(result, solution());
    act(() => result.current.selectSkin("holo"));
    expect(result.current.skin).toBe("holo");
    expect(localStorage.getItem(SKIN_STORAGE_KEY)).toBe("holo");
  });

  it("clears the new-theme marker when a new game starts", () => {
    const { result } = renderHook(() => useBrainVita());
    play(result, solution());
    act(() => result.current.restart());
    expect(result.current.justUnlocked).toBeNull();
  });

  it("restores an earned, chosen theme on the next visit", () => {
    localStorage.setItem(UNLOCKED_STORAGE_KEY, "wood,holo");
    localStorage.setItem(SKIN_STORAGE_KEY, "holo");
    const { result } = renderHook(() => useBrainVita());
    expect(result.current.skin).toBe("holo");
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

  it("turns tilt on and remembers it, off again, and says so when motion access is refused", async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => useBrainVita());
    expect(result.current.isTiltOn).toBe(false);
    await act(async () => {
      await result.current.toggleTilt();
    });
    expect(result.current.isTiltOn).toBe(true);
    expect(localStorage.getItem(TILT_STORAGE_KEY)).toBe("true");
    await act(async () => {
      await result.current.toggleTilt();
    });
    expect(result.current.isTiltOn).toBe(false);
    expect(localStorage.getItem(TILT_STORAGE_KEY)).toBe("false");

    const ask = vi.fn().mockResolvedValue("denied");
    vi.stubGlobal("DeviceOrientationEvent", { requestPermission: ask });
    await act(async () => {
      await result.current.toggleTilt();
    });
    expect(ask).toHaveBeenCalled();
    expect(result.current.isTiltOn).toBe(false);
    expect(result.current.tiltNote).toMatch(/refused/i);
    vi.unstubAllGlobals();
  });
});

describe("motion helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("leans a phone by how far it was tipped from where it was first held, up to a limit", () => {
    const base = { beta: 40, gamma: 0 };
    expect(tiltFromOrientation(base, base)).toEqual({ x: 0, y: 0 });
    expect(tiltFromOrientation(base, { beta: 40, gamma: TILT_RANGE_DEGREES / 2 }).x).toBeCloseTo(0.5, 10);
    expect(tiltFromOrientation(base, { beta: 40 - 500, gamma: 500 })).toEqual({ x: 1, y: -1 });
  });

  it("leans for a mouse from the middle of the window to its edges", () => {
    expect(tiltFromPointer(500, 400, 1000, 800)).toEqual({ x: 0, y: 0 });
    expect(tiltFromPointer(0, 800, 1000, 800)).toEqual({ x: -1, y: 1 });
    expect(tiltFromPointer(5, 5, 0, 0)).toEqual({ x: 0, y: 0 });
  });

  it("asks for motion access only where the platform makes you, and reports the answer", async () => {
    vi.stubGlobal("DeviceOrientationEvent", undefined);
    expect(await requestMotionPermission()).toBe("unsupported");
    vi.stubGlobal("DeviceOrientationEvent", class {});
    expect(await requestMotionPermission()).toBe("granted");
    vi.stubGlobal("DeviceOrientationEvent", { requestPermission: () => Promise.resolve("granted") });
    expect(await requestMotionPermission()).toBe("granted");
    vi.stubGlobal("DeviceOrientationEvent", { requestPermission: () => Promise.resolve("denied") });
    expect(await requestMotionPermission()).toBe("denied");
    vi.stubGlobal("DeviceOrientationEvent", { requestPermission: () => Promise.reject(new Error("no")) });
    expect(await requestMotionPermission()).toBe("denied");
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

  it("draws the glass board and datapad instead of the wood and the notepad", () => {
    const view = render(
      <BrainVitaSkinContext.Provider value={SKINS.holo}>
        <BrainVitaGrid board={createBoard()} selected={null} targets={[]} hint={null} disabled={false} onTap={vi.fn()} />
      </BrainVitaSkinContext.Provider>,
    );
    expect(view.container.querySelector("#bh-glass")).not.toBeNull();
    expect(view.container.querySelector("#bv-wood")).toBeNull();
    expect(view.container.textContent).toContain("LEAVE ONE.");
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
    fireEvent.click(screen.getByRole("button", { name: "Change board theme" }));
    expect(onOpenLook).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole("button")).toHaveLength(34);
  });

  it("says in words when a new theme is ready", () => {
    grid({ onOpenLook: vi.fn(), hasLookBadge: true });
    expect(screen.getByRole("button", { name: "Change board theme, a new theme is ready" })).toBeInTheDocument();
  });

  it("leans only when tilt is on", () => {
    const off = grid();
    expect((off.container.querySelector('[role="group"]') as HTMLElement).style.transform).toBe("");
    off.unmount();
    const on = grid({ isTiltOn: true });
    expect((on.container.querySelector('[role="group"]') as HTMLElement).style.transform).toContain("perspective");
  });
});

describe("BrainVitaThemeDialog", () => {
  const dialog = (overrides: Partial<Parameters<typeof BrainVitaThemeDialog>[0]> = {}) => {
    const props = {
      open: true,
      onClose: vi.fn(),
      skin: "wood" as const,
      unlocked: ["wood"] as const,
      onSelectSkin: vi.fn(),
      isTiltAvailable: true,
      isTiltOn: false,
      onToggleTilt: vi.fn(),
      tiltNote: null,
      ...overrides,
    };
    render(<BrainVitaThemeDialog {...props} />);
    return props;
  };

  it("names the dialog and offers both themes as a radio group", () => {
    dialog();
    const group = screen.getByRole("radiogroup", { name: "Board theme" });
    expect(within(group).getAllByRole("radio")).toHaveLength(2);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows what the locked theme asks for, and will not pick it", () => {
    const props = dialog();
    const holo = screen.getByRole("radio", { name: /Holo/ });
    expect(holo).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText(new RegExp(`${HOLO_UNLOCK_MAX_MARBLES} or fewer marbles`))).toBeInTheDocument();
    fireEvent.click(holo);
    expect(props.onSelectSkin).not.toHaveBeenCalled();
  });

  it("picks an earned theme, and marks the chosen one", () => {
    const props = dialog({ unlocked: ["wood", "holo"], skin: "wood" });
    expect(screen.getByRole("radio", { name: /Classic wood/ })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: /Holo/ }));
    expect(props.onSelectSkin).toHaveBeenCalledWith("holo");
  });

  it("offers a tilt switch that reflects and changes the setting", () => {
    const props = dialog({ isTiltOn: true });
    const toggle = screen.getByRole("switch", { name: /Tilt the board/ });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    fireEvent.click(toggle);
    expect(props.onToggleTilt).toHaveBeenCalledTimes(1);
  });

  it("hides the tilt switch where there is nothing to follow, and shows why tilt failed", () => {
    const off = render(
      <BrainVitaThemeDialog open onClose={vi.fn()} skin="wood" unlocked={["wood"]} onSelectSkin={vi.fn()} isTiltAvailable={false} isTiltOn={false} onToggleTilt={vi.fn()} tiltNote={null} />,
    );
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    off.unmount();
    dialog({ tiltNote: "Motion access was refused, so the board cannot follow your phone." });
    expect(screen.getByText(/refused/)).toBeInTheDocument();
  });

  it("closes from its own button", () => {
    const props = dialog();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(props.onClose).toHaveBeenCalled();
  });
});

describe("the results dialog and a new theme", () => {
  const result = { marblesLeft: 1, moves: 31, lastInCentre: true, usedHelp: false, rating: { title: "Genius", isPerfect: true } } as unknown as GameResult;
  const modal = (extra: Partial<Parameters<typeof BrainVitaResultModal>[0]> = {}) =>
    render(<BrainVitaResultModal open result={result} seconds={12} newPersonalBest={false} onPlayAgain={vi.fn()} onReview={vi.fn()} onLeave={vi.fn()} {...extra} />);

  it("says nothing about themes unless one was just earned", () => {
    modal();
    expect(screen.queryByText(/New theme unlocked/)).not.toBeInTheDocument();
  });

  it("announces the theme earned and offers to try it", () => {
    const onTryTheme = vi.fn();
    modal({ unlockedSkinName: "Holo", onTryTheme });
    expect(screen.getByText("New theme unlocked: Holo")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try it" }));
    expect(onTryTheme).toHaveBeenCalledTimes(1);
  });
});
