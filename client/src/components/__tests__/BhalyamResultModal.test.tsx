import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import BhalyamResultModal from "../BhalyamResultModal";

vi.mock("../../animations/particles/comicBursts", () => ({ fireFireworksBurst: vi.fn() }));
vi.mock("../../hooks/useMatchSettlement", () => ({
  useMatchSettlement: () => ({ settlement: null }),
  winnerPrizesFor: () => null,
}));
vi.mock("../../store/roomStore", () => ({
  useRoomStore: (select: (state: { roomState: null }) => unknown) => select({ roomState: null }),
}));
vi.mock("../../store/scorecardStore", () => ({
  useScorecardStore: (select: (state: { archive: null; lastNewPB: null }) => unknown) =>
    select({ archive: null, lastNewPB: null }),
}));
vi.mock("../cosmetics/frames/SeatFrame", () => ({ default: () => null }));
vi.mock("../CountUp", () => ({ default: ({ end }: { end: number }) => <span>{end}</span> }));

afterEach(cleanup);

const results = [
  { id: "winner", name: "Winner", score: 40 },
  { id: "self", name: "Player", score: 20 },
];

describe("shared match results", () => {
  it("preserves scores, own-seat indication and distinct Continue/Leave actions", async () => {
    const onClose = vi.fn();
    const onLeave = vi.fn();
    render(<BhalyamResultModal rankedPlayers={results} players={[]} selfId="self" winnerId="winner" winnerName="Winner" onClose={onClose} onLeave={onLeave} />);
    expect(screen.getByRole("dialog", { name: "Match results" })).toBeVisible();
    await waitFor(() => expect(screen.getByText("40")).toBeVisible());
    expect(screen.getByText("20")).toBeVisible();
    expect(screen.getByText("(you)")).toBeVisible();
    expect(screen.getByRole("region", { name: "Player scores" })).toHaveAttribute("tabindex", "0");
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onLeave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Leave Table" }));
    expect(onLeave).toHaveBeenCalledOnce();
  });

  it("retains the close fallback when a caller has no leave handler", () => {
    const onClose = vi.fn();
    render(<BhalyamResultModal rankedPlayers={results} players={[]} selfId={null} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Leave Table" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("keeps all score placement numbers readable on their gold, silver and bronze badges", () => {
    render(<BhalyamResultModal rankedPlayers={[...results, { id: "third", name: "Third", score: 10 }]} players={[]} selfId={null} onClose={() => {}} />);
    for (const rank of ["1", "2", "3"]) {
      expect(screen.getByText(rank).className).toContain("text-zinc-950");
    }
  });
});
