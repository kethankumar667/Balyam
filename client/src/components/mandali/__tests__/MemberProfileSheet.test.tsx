import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { MandaliMember } from "@shared/mandali/types.js";
import { calculateMiniclipXPProgression } from "@shared/progression/MiniclipProgression";

const apiJson = vi.hoisted(() => vi.fn());
vi.mock("../../../lib/playerIdentity", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/playerIdentity")>()),
  apiJson,
}));

import { MemberProfileSheet } from "../album/MemberProfileSheet";

const member = (over: Partial<MandaliMember> = {}): MandaliMember => ({
  memberId: "mem1",
  mandaliId: "man1",
  playerId: "p_senthil",
  displayName: "Senthil",
  avatar: "senthil.png",
  role: "MEMBER",
  state: "ACTIVE",
  joinedAt: Date.UTC(2026, 8, 24),
  presence: "offline",
  contributionScore: 0,
  ...over,
});

const stats = (over: Record<string, unknown> = {}) => ({
  playerId: "p_senthil",
  totalMatches: 20,
  wins: 12,
  losses: 6,
  draws: 2,
  winRate: 60,
  bestWinStreak: 4,
  currentWinStreak: 1,
  favoriteGame: "ludo",
  ...over,
});

/** 380 lifetime XP: level 4, 80 of the way through a 100 XP level (Bronze). */
const progression = () => calculateMiniclipXPProgression(380);

const serve = (answers: { stats?: unknown; progression?: unknown }) =>
  apiJson.mockImplementation(async (path?: string) => {
    if (typeof path !== "string") return null;
    if (path.endsWith("/stats")) return answers.stats === undefined ? null : { stats: answers.stats };
    if (path.endsWith("/progression")) return answers.progression === undefined ? null : { progression: answers.progression };
    return null;
  });

/** The profile routes never answer; anything else (unrelated callers of the same helper) gets the usual "nothing". */
const stall = () =>
  apiJson.mockImplementation((path?: string) =>
    typeof path === "string" && path.startsWith("/api/profile/") ? new Promise(() => undefined) : Promise.resolve(null),
  );

const open = (over: Partial<Parameters<typeof MemberProfileSheet>[0]> = {}) =>
  render(<MemberProfileSheet member={member()} isSelf={false} onClose={vi.fn()} onCoinsWith={vi.fn()} {...over} />);

describe("MemberProfileSheet", () => {
  beforeEach(() => apiJson.mockReset());
  afterEach(cleanup);

  it("asks only for the public leaderboard routes, for this member", async () => {
    serve({ stats: stats(), progression: progression() });
    open();

    await screen.findByText("Games played");

    expect(apiJson.mock.calls.map((c) => c[0]).sort()).toEqual(["/api/profile/p_senthil/progression", "/api/profile/p_senthil/stats"]);
  });

  it("labels placeholder numbers as demo data", async () => {
    serve({ stats: stats({ demo: true }), progression: { ...progression(), demo: true } });
    open();

    expect(await screen.findByText(/Demo data/)).toBeInTheDocument();
  });

  it("shows no demo label on a real record", async () => {
    serve({ stats: stats(), progression: progression() });
    open();

    await screen.findByText("Games played");
    expect(screen.queryByText(/Demo data/)).toBeNull();
  });

  it("shows their level, XP bar and how far they are to the next level", async () => {
    serve({ stats: stats(), progression: progression() });
    open();

    const bar = await screen.findByRole("progressbar", { name: "Progress to Level 5" });
    expect(bar).toHaveAttribute("aria-valuenow", "80");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
    expect(screen.getByText("80 / 100 XP")).toBeInTheDocument();
    expect(screen.getByText("20 XP to go")).toBeInTheDocument();
    expect(screen.getAllByText("Level 4").length).toBeGreaterThan(0);
  });

  it("shows games played, won, lost, drawn and the win rate", async () => {
    serve({ stats: stats(), progression: progression() });
    open();

    const record = await screen.findByRole("region", { name: "Game record" });
    expect(within(record).getByText("Games played").closest("div")).toHaveTextContent("20");
    expect(within(record).getByText("Games won").closest("div")).toHaveTextContent("12");
    expect(within(record).getByText("Lost").closest("div")).toHaveTextContent("6");
    expect(within(record).getByText("Drawn").closest("div")).toHaveTextContent("2");
    expect(within(record).getByRole("img", { name: "Win rate 60%" })).toBeInTheDocument();
    expect(within(record).getByText("4 in a row")).toBeInTheDocument();
    expect(within(record).getByText("Ludo")).toBeInTheDocument();
  });

  it("says plainly that a member has no matches yet, instead of showing a row of zeros", async () => {
    serve({ stats: stats({ totalMatches: 0, wins: 0, losses: 0, draws: 0, winRate: 0, favoriteGame: "none" }), progression: calculateMiniclipXPProgression(0) });
    open();

    expect(await screen.findByText("No matches yet")).toBeInTheDocument();
    expect(screen.getByText(/Senthil has not finished a match yet/)).toBeInTheDocument();
    expect(screen.queryByText("Games won")).not.toBeInTheDocument();
  });

  it("says the record can't be loaded when neither route answers, and still shows who they are", async () => {
    serve({});
    open();

    expect(await screen.findByText("Their game record can't be loaded right now.")).toBeInTheDocument();
    expect(screen.getByText("Senthil")).toBeInTheDocument();
    expect(screen.getByText("Member")).toBeInTheDocument();
  });

  it("holds a placeholder while the record loads, never a number", () => {
    stall();
    open();

    expect(screen.queryByText("Games played")).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByText("Senthil")).toBeInTheDocument();
  });

  it("keeps a stored win rate inside 0 to 100", async () => {
    serve({ stats: stats({ winRate: 240 }), progression: progression() });
    open();

    expect(await screen.findByRole("img", { name: "Win rate 100%" })).toBeInTheDocument();
  });

  it("shows when they are playing and what, and since when they have been in the group", async () => {
    serve({ stats: stats(), progression: progression() });
    open({ member: member({ presence: "in-game", activeGame: "ludo" }) });

    expect(await screen.findByText(/Playing Ludo/)).toBeInTheDocument();
    expect(screen.getByText("September 24, 2026")).toBeInTheDocument();
  });

  it("offers the coin button for someone else, and it closes the card then opens the coin sheet", async () => {
    serve({ stats: stats(), progression: progression() });
    const onClose = vi.fn();
    const onCoinsWith = vi.fn();
    open({ onClose, onCoinsWith });

    fireEvent.click(await screen.findByRole("button", { name: /Send or ask for coins/ }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onCoinsWith).toHaveBeenCalledWith("p_senthil");
  });

  it("offers no coin button on your own card", async () => {
    serve({ stats: stats(), progression: progression() });
    open({ isSelf: true });

    await screen.findByText("Games played");

    expect(screen.queryByRole("button", { name: /Send or ask for coins/ })).not.toBeInTheDocument();
    expect(screen.getByText("(You)")).toBeInTheDocument();
  });

  it("does not ask for anything while closed", () => {
    render(<MemberProfileSheet member={null} isSelf={false} onClose={vi.fn()} />);

    expect(apiJson).not.toHaveBeenCalled();
  });

  it("does not show one member's numbers under another's name while the second loads", async () => {
    serve({ stats: stats(), progression: progression() });
    const view = open();
    await screen.findByText("Games played");

    stall();
    view.rerender(<MemberProfileSheet member={member({ playerId: "p_other", displayName: "Anitha" })} isSelf={false} onClose={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("Anitha")).toBeInTheDocument());
    expect(screen.queryByText("Games played")).not.toBeInTheDocument();
  });
});
