import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { LevelRoadmapModal } from "../LevelRoadmapModal";
import { useAuthStore } from "../../../store/authStore";

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }));
vi.mock("../../../lib/playerIdentity", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/playerIdentity")>()),
  apiFetch: mockApiFetch,
}));
vi.mock("canvas-confetti", () => ({ default: vi.fn() }));
vi.mock("../../../services/AudioManager", () => ({ AudioManager: { play: vi.fn() } }));
vi.mock("../../../services/HapticsManager", () => ({ HapticsManager: { trigger: vi.fn() } }));

/** Enough XP to have reached every Bronze-tier milestone. */
const XP_PAST_LEVEL_5 = 50_000;
const DAY_MS = 24 * 3_600_000;

type Payout = { status: "PENDING"; vestingUntil: number } | { status: "RELEASED" };

/** Answers the roadmap's reward list and its claim call, the only two requests it makes. */
function answerClaimsWith(payout: Payout) {
  mockApiFetch.mockImplementation(async (url: string) =>
    String(url).includes("claim-level-reward")
      ? { ok: true, json: async () => ({ ok: true, payout }) }
      : { ok: true, json: async () => ({ rewards: [], standing: null }) },
  );
}

function renderRoadmap(onClose = vi.fn()) {
  render(<LevelRoadmapModal isOpen onClose={onClose} experiencePoints={XP_PAST_LEVEL_5} playerId="p1" />);
  return { onClose };
}

/** The row's own CLAIM button (level 5 is a major milestone, level 2 is not). */
function claimButtonFor(level: number): HTMLElement {
  const pattern = new RegExp(`Level ${level}(?!\\d)`);
  const button = screen
    .getAllByRole("button", { name: /^CLAIM/ })
    .find((b) => pattern.test(b.closest("div.rounded-2xl.border")?.textContent ?? ""));
  if (!button) throw new Error(`no CLAIM button on the Level ${level} row`);
  return button;
}

const chestDialog = () => screen.queryByRole("dialog", { name: /Milestone Chest/ });
const press = (key: string) => fireEvent.keyDown(window, { key });

describe("LevelRoadmapModal — claiming a major milestone opens the chest", () => {
  beforeEach(() => {
    useAuthStore.setState({ isMember: true } as never);
  });
  afterEach(() => {
    cleanup();
    mockApiFetch.mockReset();
  });

  it("opens the Level 5 chest, above the roadmap, after a claim", async () => {
    answerClaimsWith({ status: "RELEASED" });
    renderRoadmap();

    fireEvent.click(claimButtonFor(5));

    const chest = await screen.findByRole("dialog", { name: "Level 5 Milestone Chest" });
    expect(chest.className).toContain("z-[120]");
    const roadmap = document.querySelector('[aria-labelledby="roadmap-title"]') as HTMLElement;
    expect(roadmap.className).toContain("z-[90]");
  });

  it("tells the player when held coins arrive, on the chest and on the roadmap row", async () => {
    answerClaimsWith({ status: "PENDING", vestingUntil: Date.now() + DAY_MS });
    renderRoadmap();

    fireEvent.click(claimButtonFor(5));
    const chest = await screen.findByRole("dialog", { name: "Level 5 Milestone Chest" });
    fireEvent.click(within(chest).getByRole("button", { name: /skip/i }));

    expect(within(chest).getByText(/Coins arrive in 24 hr/)).toBeDefined();
    expect(within(chest).getByText("Arrives in 24 hr")).toBeDefined();
    expect(within(chest).queryByText(/Added to your/)).toBeNull();

    fireEvent.click(within(chest).getByRole("button", { name: /collect all/i }));
    expect(chestDialog()).toBeNull();
    expect(screen.getByText(/ARRIVES IN 24 HR/)).toBeDefined();
  });

  it("says the coins were added when the payout was released at once", async () => {
    answerClaimsWith({ status: "RELEASED" });
    renderRoadmap();

    fireEvent.click(claimButtonFor(5));
    const chest = await screen.findByRole("dialog", { name: "Level 5 Milestone Chest" });
    fireEvent.click(within(chest).getByRole("button", { name: /skip/i }));

    expect(within(chest).getByText(/Added to your BHALYAM balance/)).toBeDefined();
  });

  it("does not open a chest for an ordinary level", async () => {
    answerClaimsWith({ status: "RELEASED" });
    renderRoadmap();

    fireEvent.click(claimButtonFor(2));

    expect(await screen.findAllByText("CLAIMED")).toBeDefined();
    expect(chestDialog()).toBeNull();
  });

  it("lets Escape act on the chest alone, never closing the roadmap underneath", async () => {
    answerClaimsWith({ status: "RELEASED" });
    const { onClose } = renderRoadmap();

    fireEvent.click(claimButtonFor(5));
    await screen.findByRole("dialog", { name: "Level 5 Milestone Chest" });

    press("Escape"); // skips to the summary
    press("Escape"); // closes the chest
    expect(chestDialog()).toBeNull();
    expect(onClose).not.toHaveBeenCalled();

    press("Escape"); // now the roadmap is the top dialog
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
